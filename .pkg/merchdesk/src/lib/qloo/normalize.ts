import type { EntityType } from '@/types'
import type { QlooEntity, QlooTag, RawQlooEntity, RawQlooResponse } from './types'

const TYPE_URNS: Record<EntityType, string> = {
  artist: 'urn:entity:artist',
  brand: 'urn:entity:brand',
  place: 'urn:entity:place',
  movie: 'urn:entity:movie',
  tv_show: 'urn:entity:tv_show',
  book: 'urn:entity:book',
  podcast: 'urn:entity:podcast',
  videogame: 'urn:entity:videogame',
  destination: 'urn:entity:destination',
}

const URN_TO_TYPE: Record<string, EntityType> = Object.fromEntries(
  Object.entries(TYPE_URNS).map(([k, v]) => [v, k as EntityType])
) as Record<string, EntityType>

export function typeToUrn(type: EntityType): string {
  return TYPE_URNS[type] ?? `urn:entity:${type}`
}

export function urnToType(urn: string | undefined): EntityType | undefined {
  if (!urn) return undefined
  if (URN_TO_TYPE[urn]) return URN_TO_TYPE[urn]
  const bare = urn.replace(/^urn:entity:/, '')
  return URN_TO_TYPE[`urn:entity:${bare}`] ?? (bare as EntityType | undefined)
}

function parseTags(tags: unknown): string[] {
  if (Array.isArray(tags)) {
    return tags
      .map((t) => {
        if (typeof t === 'string') return t
        if (t && typeof t === 'object') {
          const o = t as Record<string, unknown>
          if (typeof o.name === 'string') return o.name
          if (typeof o.tag === 'string') return o.tag
        }
        return ''
      })
      .filter(Boolean)
      .slice(0, 20)
  }
  return []
}

/** Rank-based weight when no numeric affinity is returned: w = 1 − 0.7 × rank/N. */
export function rankWeight(index: number, total: number): number {
  if (total <= 1) return 1
  return Math.max(0.05, Math.min(1, 1 - 0.7 * (index / Math.max(1, total - 1))))
}

export function normalizeEntity(raw: RawQlooEntity, index: number, total: number): QlooEntity | null {
  const id = raw.entity_id ?? raw.id
  const name = raw.name
  if (!id || !name) return null
  const numeric = typeof raw.affinity === 'number' ? raw.affinity : typeof raw.score === 'number' ? raw.score : null
  const weight =
    numeric !== null && numeric > 0
      ? Math.max(0.05, Math.min(1, numeric > 1 ? numeric / 100 : numeric))
      : rankWeight(index, total)
  return {
    id: String(id),
    name: String(name),
    type: urnToType(raw.type) ?? 'brand',
    weight,
    tags: parseTags(raw.tags),
    imageUrl: typeof raw.image_url === 'string' ? raw.image_url : undefined,
    location: typeof raw.location === 'string' ? raw.location : undefined,
  }
}

export function extractEntities(res: RawQlooResponse): RawQlooEntity[] {
  if (res.results?.entities?.length) return res.results.entities
  if (Array.isArray(res.entities) && res.entities.length) return res.entities
  if (Array.isArray(res.insights)) return res.insights as RawQlooEntity[]
  if (res.results && Array.isArray(res.results.entities)) return res.results.entities
  // some endpoints return the array directly under a type key
  const r = res.results as Record<string, unknown> | undefined
  if (r) {
    for (const v of Object.values(r)) {
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v as RawQlooEntity[]
    }
  }
  return []
}

export function normalizeEntityList(res: RawQlooResponse, exclude: string[] = []): QlooEntity[] {
  const raw = extractEntities(res)
  const excluded = new Set(exclude)
  return raw
    .map((row, i) => normalizeEntity(row, i, raw.length))
    .filter((e): e is QlooEntity => e !== null && !excluded.has(e.id))
}

export function normalizeTags(res: RawQlooResponse, take = 15): QlooTag[] {
  const rawTags = res.tags ?? []
  const total = rawTags.length
  const tags: QlooTag[] = []
  rawTags.forEach((t, i) => {
    const id = t.tag_id ?? t.id
    const name = t.name ?? (t as { tag?: { name?: string } }).tag?.name
    if (!id || !name) return
    const numeric = typeof t.affinity === 'number' ? t.affinity : typeof t.score === 'number' ? t.score : null
    const weight =
      numeric !== null && numeric > 0
        ? Math.max(0.05, Math.min(1, numeric > 1 ? numeric / 100 : numeric))
        : rankWeight(i, total)
    tags.push({ id: String(id), name: String(name), weight })
  })
  return tags.slice(0, take)
}
