import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { AgentEvent, StudioInput, TasteProfile } from '../src/types'

type Brief = { id: string; split: string; input: StudioInput; expected: unknown }
const args = process.argv.slice(2)
const value = (flag: string, fallback: string) => args[args.indexOf(flag) + 1] && args.includes(flag) ? args[args.indexOf(flag) + 1] : fallback
const base = value('--base', 'http://localhost:3000').replace(/\/$/, '')
const out = resolve(value('--out', `artifacts/benchmark/run-${new Date().toISOString().slice(0, 10)}`))
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : undefined
const briefs = JSON.parse(await readFile(resolve(value('--briefs', 'artifacts/benchmark/briefs.json')), 'utf8')) as Brief[]
await mkdir(out, { recursive: true })

async function post(path: string, body: unknown) {
  const response = await fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response
}

for (const brief of briefs.filter((b) => !only || b.id === only)) {
  const started = Date.now()
  const record: Record<string, unknown> = { id: brief.id, input: brief.input, startedAt: new Date(started).toISOString(), providerCalls: { qloo: 0, image: 0 }, estimatedCostUsd: 0, costBasis: 'No paid calls or image requests; free-tier API use only.' }
  try {
    record.status = (await (await fetch(`${base}/api/status`)).json()).data
    const response = await post('/api/agent/profile', brief.input)
    const stream = await response.text()
    const events = stream.split('\n\n').flatMap((part) => {
      const line = part.split('\n').find((entry) => entry.startsWith('data: '))
      if (!line) return []
      try { return [JSON.parse(line.slice(6)) as AgentEvent] } catch { return [] }
    })
    record.events = events
    const error = events.find((event) => event.type === 'error')
    if (error) throw new Error(error.message)
    const profile = events.find((event): event is Extract<AgentEvent, { type: 'profile' }> => event.type === 'profile')?.profile as TasteProfile | undefined
    if (!profile) throw new Error('Profile missing from agent stream')
    record.profile = profile
    record.providerCalls = { qloo: profile.qlooCalls, image: 0 }
    record.fallbackMode = profile.agentMode
    const collection = (await (await post('/api/collection', { input: brief.input, profile })).json()) as { data: { products: Array<{ id: string }>; meta: { descriptionSource: string } } }
    record.collection = collection.data
    record.descriptionSource = collection.data.meta.descriptionSource
    try {
      const collabs = await post('/api/collabs', { profile, city: brief.input.city, productIds: collection.data.products.map((p) => p.id) })
      record.collabs = (await collabs.json()).data
    } catch (error) {
      record.collabsError = String(error)
    }
  } catch (error) {
    record.error = String(error)
  }
  record.elapsedMs = Date.now() - started
  await writeFile(resolve(out, `${brief.id}.json`), JSON.stringify(record, null, 2))
  process.stdout.write(`${brief.id}: ${record.error ? 'failed' : 'saved'} ${record.elapsedMs}ms\n`)
}
