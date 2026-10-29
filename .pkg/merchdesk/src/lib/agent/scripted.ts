import type { AgentEvent, StudioInput } from '@/types'
import { AgentMemory, type ToolExecContext } from './tools'

/**
 * Scripted fallback agent — fixed research sequence, no LLM.
 * Used when every free LLM provider is unreachable. Still 100% Qloo-grounded.
 */

const CROSS_DETECT: Array<{ re: RegExp; type: 'videogame' | 'tv_show' | 'movie' | 'book' | 'podcast' }> = [
  { re: /\b(game|gaming|arcade|console|retro)\w*/i, type: 'videogame' },
  { re: /\b(show|series|tv|sitcom|anime)\w*/i, type: 'tv_show' },
  { re: /\b(movie|film|cinema)\w*/i, type: 'movie' },
  { re: /\b(book|read|novel|literature)\w*/i, type: 'book' },
  { re: /\b(podcast|episode|audio)\w*/i, type: 'podcast' },
]

function keywordPhrases(text: string, max = 4): string[] {
  const stop = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'who', 'love', 'loves', 'fans', 'fan', 'my', 'our', 'their', 'they',
    'into', 'with', 'for', 'that', 'this', 'really', 'very', 'are', 'is', 'was', 'be', 'like', 'likes', 'audience',
    'people', 'listeners', 'viewers', 'we', 'i', 'you', 'it', 'its', 'in', 'on', 'at', 'to', 'from', 'about',
  ])
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stop.has(w))
  const phrases: string[] = []
  // pair consecutive content words for context, then singles as fallback
  for (let i = 0; i < words.length - 1 && phrases.length < max; i++) {
    const pair = `${words[i]} ${words[i + 1]}`
    if (pair.split(' ').every((w) => !stop.has(w))) phrases.push(pair)
  }
  for (const w of words) {
    if (phrases.length >= max) break
    if (!phrases.some((p) => p.includes(w))) phrases.push(w)
  }
  return phrases
}

export async function runScriptedAgent(
  ctx: ToolExecContext,
  onFinish: (path: 'A' | 'B') => void
): Promise<void> {
  const { memory, input, emit } = ctx
  const call = async (tool: string, args: Record<string, unknown>, id: string) => {
    emit({ type: 'tool_call', id, tool, args })
    memory.toolCallCount += 1
    ctx.onQlooCall()
  }
  const result = async (id: string, tool: string, summary: string, count = 0) => {
    emit({ type: 'tool_result', id, tool, summary, ...(count > 0 ? { count } : {}) })
  }

  const qloo = await import('@/lib/qloo/client')
  let seq = 0
  const nextId = () => `sc${++seq}`

  // 1. Artist search when an artist is named or text looks like a name
  const artistQuery = input.artist?.name ?? (input.text.trim().split(/\s+/).length <= 4 && !input.text.includes(',') ? input.text.trim() : '')
  if (artistQuery) {
    const id = nextId()
    await call('qloo_search_entity', { query: artistQuery, type: 'artist' }, id)
    const found = await qloo.searchEntities(artistQuery, { type: 'artist', take: 3 })
    memory.addEntities(found)
    if (found.length > 0) {
      memory.markSeedEntity(found[0].id)
      memory.artistEntity = found[0]
      await result(id, 'qloo_search_entity', `Found ${found[0].name} (artist)`, found.length)
      onFinish('A')
    } else {
      await result(id, 'qloo_search_entity', `No match for "${artistQuery}"`, 0)
      emit({ type: 'note', text: 'Not found in Qloo — trying genre and interest tags' })
    }
  }

  // 2. Tag searches from description keywords (and sounds-like names)
  const phrases = [...keywordPhrases(input.text, 3)]
  for (const name of input.soundsLike.slice(0, 2)) phrases.push(name.toLowerCase())
  for (const phrase of phrases.slice(0, 4)) {
    const id = nextId()
    await call('qloo_search_tags', { query: phrase }, id)
    const tags = await qloo.searchTags(phrase, 5)
    memory.addTags(tags, true)
    await result(id, 'qloo_search_tags', tags.length > 0 ? `Matched tags: ${tags.slice(0, 3).map((t) => t.name).join(', ')}` : `No tags for "${phrase}"`, tags.length)
  }

  // 3. Taste tags with the seeds we have
  if (memory.seedEntityIds.length > 0 || memory.seedTagIds.length > 0) {
    const id = nextId()
    await call('qloo_taste_tags', { entityIds: memory.seedEntityIds, tagIds: memory.seedTagIds.slice(0, 6) }, id)
    const tags = await qloo.tasteTags({ entityIds: memory.seedEntityIds, tagIds: memory.seedTagIds.slice(0, 6), take: 15 })
    memory.addTags(tags)
    await result(id, 'qloo_taste_tags', tags.length > 0 ? `Audience taste tags: ${tags.slice(0, 4).map((t) => t.name).join(', ')}…` : 'No taste tags returned', tags.length)
  }

  // 4. Related brands
  {
    const id = nextId()
    await call('qloo_related', { type: 'brand', entityIds: memory.seedEntityIds, tagIds: memory.seedTagIds.slice(0, 6) }, id)
    const brands = await qloo.related({ type: 'brand', entityIds: memory.seedEntityIds, tagIds: memory.seedTagIds.slice(0, 6), take: 10 })
    memory.addEntities(brands)
    await result(id, 'qloo_related', brands.length > 0 ? `${brands.length} related brands` : 'No related brands found', brands.length)
  }

  // 5. Up to 2 cross-domain types detected from keywords
  const haystack = `${input.text} ${memory.tags.size > 0 ? Array.from(memory.tags.values()).slice(0, 10).map((t) => t.name).join(' ') : ''}`
  const detected = CROSS_DETECT.filter((d) => d.re.test(haystack)).slice(0, 2)
  for (const d of detected) {
    const id = nextId()
    await call('qloo_related', { type: d.type, entityIds: memory.seedEntityIds, tagIds: memory.seedTagIds.slice(0, 6) }, id)
    const entities = await qloo.related({ type: d.type, entityIds: memory.seedEntityIds, tagIds: memory.seedTagIds.slice(0, 6), take: 8 })
    memory.addEntities(entities)
    await result(id, 'qloo_related', entities.length > 0 ? `${entities.length} related ${d.type.replace('_', ' ')}s` : `No related ${d.type.replace('_', ' ')}s`, entities.length)
  }
}
