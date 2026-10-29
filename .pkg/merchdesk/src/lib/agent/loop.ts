import type { AgentEvent, StudioInput, TasteProfile } from '@/types'
import { ApiError } from '@/lib/http/errors'
import { chat } from '@/lib/llm/providers'
import { AGENT_SYSTEM, agentUserPrompt, extractJson } from '@/lib/llm/prompts'
import type { ChatMessage } from '@/lib/llm/providers'
import { AgentMemory, TOOLS, type ToolExecContext } from './tools'
import { buildProfile } from './memory'
import { runScriptedAgent } from './scripted'
import { z } from 'zod'

const MAX_TOOL_CALLS = 8
const HARD_CAP_MS = 45_000
const MAX_LLM_TURNS = 14

const actionSchema = z.object({
  action: z.string(),
  args: z.record(z.string(), z.unknown()).optional(),
})

export interface AgentRunResult {
  profile: TasteProfile
  mode: 'llm_agent' | 'scripted_fallback'
}

let toolCallSeq = 0
let stepSeq = 0

/**
 * Run the taste-research agent and stream progress events.
 * LLM agent first (JSON-action loop, provider-agnostic); scripted fallback when
 * no LLM provider is reachable. The profile itself is always assembled by code.
 */
export async function runAgent(input: StudioInput, emit: (e: AgentEvent) => void): Promise<AgentRunResult> {
  const startedAt = Date.now()
  const memory = new AgentMemory()
  const notes: string[] = []
  let qlooCalls = 0
  let finishPath: 'A' | 'B' | null = null

  const ctx: ToolExecContext = {
    memory,
    input,
    emit,
    onQlooCall: () => {
      qlooCalls += 1
    },
  }

  emit({ type: 'step', id: `s${++stepSeq}`, label: 'Reading your fans’ taste…', status: 'running' })

  let mode: 'llm_agent' | 'scripted_fallback' = 'llm_agent'
  let llmWorked = false

  try {
    llmWorked = await runLlmLoop(ctx, (p) => (finishPath = p), () => Date.now() - startedAt > HARD_CAP_MS, notes)
  } catch (err) {
    if (err instanceof ApiError && err.code === 'QLOO_NO_KEY') throw err
    notes.push('LLM agent hit a snag — switched to fixed research steps.')
  }

  if (!llmWorked) {
    mode = 'scripted_fallback'
    notes.push('Fallback mode: fixed steps (no free LLM available right now) — results are still grounded in taste data.')
    emit({ type: 'note', text: 'Free AI resting — using fixed research steps. Results still come from taste data.' })
    await runScriptedAgent(ctx, (p) => (finishPath = p))
  } else {
    emit({ type: 'step', id: `s${++stepSeq}`, label: 'Research complete', status: 'done', detail: `${memory.toolCallCount} tool calls` })
  }

  // path detection (code, not LLM): artist entity found → A
  const path: 'A_artist_found' | 'B_description' =
    finishPath === 'A' || (!finishPath && memory.artistEntity !== null) ? 'A_artist_found' : 'B_description'

  emit({ type: 'step', id: `s${++stepSeq}`, label: 'Assembling taste profile', status: 'running' })
  const profile = await buildProfile(memory, input, { path, notes, agentMode: mode, qlooCalls })
  emit({ type: 'step', id: `s${++stepSeq}`, label: 'Taste profile ready', status: 'done' })

  return { profile, mode }
}

async function runLlmLoop(
  ctx: ToolExecContext,
  onFinish: (path: 'A' | 'B') => void,
  timedOut: () => boolean,
  notes: string[]
): Promise<boolean> {
  const messages: ChatMessage[] = [
    { role: 'system', content: AGENT_SYSTEM },
    { role: 'user', content: agentUserPrompt({
      text: ctx.input.text,
      artist: ctx.input.artist ? { name: ctx.input.artist.name } : undefined,
      soundsLike: ctx.input.soundsLike,
      creatorType: ctx.input.creatorType,
      city: ctx.input.city,
    }) },
  ]

  let consecutiveParseFailures = 0

  for (let turn = 0; turn < MAX_LLM_TURNS; turn++) {
    if (timedOut()) {
      ctx.emit({ type: 'note', text: 'Time budget reached — building the profile from what we have.' })
      return true
    }
    if (ctx.memory.toolCallCount >= MAX_TOOL_CALLS) {
      messages.push({ role: 'user', content: 'Tool call budget used. Call finish now with your summary.' })
    }

    const res = await chat({ messages, temperature: 0.3, maxTokens: 400 })
    messages.push({ role: 'assistant', content: res.text })

    let action: z.infer<typeof actionSchema>
    try {
      action = actionSchema.parse(extractJson(res.text))
    } catch {
      consecutiveParseFailures += 1
      if (consecutiveParseFailures >= 2) return false
      messages.push({ role: 'user', content: 'That was not valid JSON. Reply with exactly one JSON object: {"action": "...", "args": {...}}' })
      continue
    }
    consecutiveParseFailures = 0

    const tool = TOOLS.find((t) => t.name === action.action)
    if (!tool) {
      messages.push({
        role: 'user',
        content: `Unknown action "${action.action}". Valid actions: ${TOOLS.map((t) => t.name).join(', ')}.`,
      })
      continue
    }

    // ---- note tool (free, no budget) ----
    if (tool.name === 'note') {
      const text = String(action.args?.text ?? '').slice(0, 160)
      if (text) ctx.emit({ type: 'note', text })
      messages.push({ role: 'user', content: 'Noted. Continue with your next action (JSON only).' })
      continue
    }

    // ---- finish ----
    if (tool.name === 'finish') {
      const p = action.args?.path === 'A' ? 'A' : 'B'
      const summary = String(action.args?.summary ?? '').slice(0, 160)
      onFinish(p)
      ctx.emit({ type: 'note', text: summary || (p === 'A' ? 'Found the artist — profile built from their audience.' : 'Profile built from your description.') })
      return true
    }

    // ---- budget guard ----
    if (ctx.memory.toolCallCount >= MAX_TOOL_CALLS) {
      messages.push({ role: 'user', content: 'Tool budget exhausted — call finish now.' })
      continue
    }

    // ---- execute tool ----
    const id = `t${++toolCallSeq}`
    ctx.emit({ type: 'tool_call', id, tool: tool.name, args: action.args ?? {} })
    ctx.memory.toolCallCount += 1

    let result: { summary: string; count: number }
    try {
      result = await tool.execute(action.args ?? {}, ctx)
    } catch (err) {
      if (err instanceof ApiError && (err.code === 'QLOO_NO_KEY' || err.code === 'QLOO_RATE_LIMIT')) throw err
      result = { summary: 'Tool failed', count: 0 }
    }
    ctx.emit({
      type: 'tool_result',
      id,
      tool: tool.name,
      summary: result.summary,
      ...(result.count > 0 ? { count: result.count } : {}),
    })

    // feed result back to the model (compact)
    messages.push({
      role: 'user',
      content: `RESULT ${tool.name} → ${result.summary}${result.count > 0 ? ` (${result.count} items)` : ''}. Continue with one JSON action. Known ids so far: entities[${ctx.memory.seedEntityIds.slice(0, 3).join(', ')}] tags[${ctx.memory.seedTagIds.slice(0, 4).join(', ')}].`,
    })
  }

  notes.push('Agent loop ended before finishing — profile built from gathered data.')
  return true
}
