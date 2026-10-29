/**
 * LLM provider chain — free providers only, plain fetch, OpenAI-compatible.
 *
 * Order (configurable via LLM_PROVIDERS): zai → groq → gemini → cloudflare.
 *  - `zai`      : z-ai-web-dev-sdk (available in this environment; auto-skips elsewhere)
 *  - `groq`     : Groq free tier, llama-3.3-70b-versatile
 *  - `gemini`   : Google AI Studio OpenAI-compat endpoint, gemini-2.5-flash-lite
 *  - `cloudflare`: Workers AI (text/JSON only)
 *
 * Every provider funnels through one shape; failures fall to the next provider.
 */
import { ApiError } from '@/lib/http/errors'
import { env } from '@/lib/env'

export type ProviderName = 'zai' | 'groq' | 'gemini' | 'cloudflare'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  json?: boolean
  temperature?: number
  maxTokens?: number
  timeoutMs?: number
}

export interface ChatResult {
  text: string
  provider: ProviderName
  model: string
}

export interface Provider {
  name: ProviderName
  model: string
  available(): boolean | Promise<boolean>
  chat(req: ChatRequest): Promise<ChatResult>
}

const DEFAULT_TIMEOUT = 25_000

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function extractText(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>
    error?: { message?: string }
  } | null
  if (!body) throw new Error('empty response body')
  if (body.error?.message) throw new Error(body.error.message)
  const content = body.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map((c) => c.text ?? '').join('')
  return ''
}

// ---------------------------------------------------------------- z-ai (sdk)
interface ZaiChatInstance { chat: { completions: { create: (args: unknown) => Promise<unknown> } } }
let zaiSingleton: ZaiChatInstance | null = null
let zaiTried = false

async function getZai() {
  if (zaiSingleton) return zaiSingleton
  if (zaiTried) return null
  zaiTried = true
  try {
    const mod = (await import('z-ai-web-dev-sdk')) as unknown as { default?: { create: () => Promise<unknown> } }
    if (mod?.default?.create) {
      const instance = (await mod.default.create()) as { chat?: { completions?: { create: (args: unknown) => Promise<unknown> } } }
      if (instance?.chat?.completions?.create) {
        zaiSingleton = instance as ZaiChatInstance
        return zaiSingleton
      }
    }
    return null
  } catch {
    return null
  }
}

const zaiProvider: Provider = {
  name: 'zai',
  model: 'zai-chat',
  async available() {
    return (await getZai()) !== null
  },
  async chat(req) {
    const zai = await getZai()
    if (!zai) throw new Error('z-ai sdk unavailable')
    // sdk uses 'assistant' role for system-style prompts
    const messages = req.messages.map((m) => ({
      role: m.role === 'system' ? 'assistant' : m.role,
      content: m.content,
    }))
    const completion = (await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    })) as { choices?: Array<{ message?: { content?: string } }> }
    const text = completion?.choices?.[0]?.message?.content ?? ''
    if (!text.trim()) throw new Error('empty completion')
    return { text, provider: 'zai', model: 'zai-chat' }
  },
}

// ------------------------------------------------------- OpenAI-compatible
function openAiCompatProvider(name: 'groq' | 'gemini' | 'cloudflare'): Provider {
  const e = env()
  const config = {
    groq: {
      url: 'https://api.groq.com/openai/v1/chat/completions',
      key: () => e.GROQ_API_KEY,
      model: e.GROQ_MODEL,
    },
    gemini: {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      key: () => e.GEMINI_API_KEY,
      model: e.GEMINI_MODEL,
    },
    cloudflare: {
      url: `https://api.cloudflare.com/client/v4/accounts/${e.CF_ACCOUNT_ID}/ai/v1/chat/completions`,
      key: () => e.CF_API_TOKEN,
      model: e.CF_LLM_MODEL,
    },
  }[name]

  return {
    name,
    model: config.model,
    available() {
      if (name === 'cloudflare') return Boolean(env().CF_ACCOUNT_ID && env().CF_API_TOKEN)
      const key = config.key()
      return Boolean(key)
    },
    async chat(req) {
      const key = config.key()
      if (!key) throw new Error(`${name} key missing`)
      const body: Record<string, unknown> = {
        model: config.model,
        messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens ?? 1400,
      }
      if (req.json) body.response_format = { type: 'json_object' }
      const res = await fetchWithTimeout(
        config.url,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        req.timeoutMs ?? DEFAULT_TIMEOUT
      )
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`${name} transient failure ${res.status}`)
      }
      if (!res.ok) {
        throw new Error(`${name} failed ${res.status}`)
      }
      const text = await extractText(res)
      if (!text.trim()) throw new Error(`${name} empty completion`)
      return { text, provider: name, model: config.model }
    },
  }
}

const PROVIDERS: Record<ProviderName, Provider> = {
  zai: zaiProvider,
  groq: openAiCompatProvider('groq'),
  gemini: openAiCompatProvider('gemini'),
  cloudflare: openAiCompatProvider('cloudflare'),
}

export function providerOrder(): ProviderName[] {
  const order = env()
    .LLM_PROVIDERS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => ['zai', 'groq', 'gemini', 'cloudflare'].includes(s))
  return order.length > 0 ? order : ['zai', 'groq', 'gemini', 'cloudflare']
}

/** Try providers in order; throw LLM_UNAVAILABLE when the whole chain is down. */
export async function chat(req: ChatRequest): Promise<ChatResult> {
  const errors: string[] = []
  for (const name of providerOrder()) {
    const provider = PROVIDERS[name]
    if (!provider) continue
    try {
      if (!(await provider.available())) continue
      return await provider.chat(req)
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : 'failed'}`)
    }
  }
  throw new ApiError('LLM_UNAVAILABLE', `Our free AI is resting. (${errors.join('; ') || 'no provider configured'})`)
}

export async function anyLlmAvailable(): Promise<boolean> {
  for (const name of providerOrder()) {
    const provider = PROVIDERS[name]
    if (provider && (await Promise.resolve(provider.available()).catch(() => false))) return true
  }
  return false
}

export function configuredProviders(): Promise<string[]> {
  return (async () => {
    const out: string[] = []
    for (const name of providerOrder()) {
      const provider = PROVIDERS[name]
      if (provider && (await Promise.resolve(provider.available()).catch(() => false))) out.push(name)
    }
    return out
  })()
}
