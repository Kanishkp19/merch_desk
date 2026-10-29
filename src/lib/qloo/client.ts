/**
 * Qloo hackathon API adapter — the ONLY module that knows Qloo URL parameters.
 * Falls back to clearly-labelled synthetic sample data when no key is configured.
 *
 * Believed parameter shapes (from public hackathon notes; verify with probe):
 *   GET /search?query=…&types=urn:entity:artist&take=5
 *   GET /v2/tags?filter.query=…&take=5
 *   GET /v2/insights?filter.type=urn:tag&signal.interests.entities=…&take=15
 *   GET /v2/insights?filter.type=<urn>&signal.interests.entities=…&filter.location.query=<city>&filter.exclude.entities=…&take=10
 */
import type { EntityType } from '@/types'
import { ApiError } from '@/lib/http/errors'
import { dataMode, env } from '@/lib/env'
import { extractEntities, normalizeEntityList, normalizeTags, typeToUrn } from './normalize'
import type { QlooEntity, QlooTag, RawQlooResponse, SearchOptions, TasteTagsOptions, RelatedOptions } from './types'
import {
  fixtureRelated,
  fixtureSearchEntities,
  fixtureSearchTags,
  fixtureTasteTags,
} from './fixtures'

/** In-memory LRU cache, TTL 30 min, max 200 entries. */
const cache = new Map<string, { at: number; value: unknown }>()
const CACHE_TTL = 30 * 60 * 1000
const CACHE_MAX = 200

function cacheGet<T>(key: string): T | undefined {
  const hit = cache.get(key)
  if (!hit) return undefined
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key)
    return undefined
  }
  // refresh recency
  cache.delete(key)
  cache.set(key, hit)
  return hit.value as T
}

function cacheSet(key: string, value: unknown) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest) cache.delete(oldest)
  }
  cache.set(key, { at: Date.now(), value })
}

async function qlooGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const e = env()
  if (!e.QLOO_API_KEY) {
    throw new ApiError('QLOO_NO_KEY', "MerchDesk can't reach its taste data right now.")
  }
  const url = new URL(path, e.QLOO_BASE_URL)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)

  let lastError: ApiError | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try {
      const res = await fetch(url.toString(), {
        headers: { 'X-Api-Key': e.QLOO_API_KEY, Accept: 'application/json' },
        signal: controller.signal,
        cache: 'no-store',
      })
      clearTimeout(timeout)
      if (res.status === 401 || res.status === 403) {
        throw new ApiError('QLOO_NO_KEY', "MerchDesk can't reach its taste data right now.")
      }
      if (res.status === 429) {
        const retry = Number(res.headers.get('retry-after') ?? '30')
        throw new ApiError('QLOO_RATE_LIMIT', 'Taste data is busy — try again soon.', { retryAfterSec: Number.isFinite(retry) ? retry : 30 })
      }
      if (res.status >= 500) {
        throw new ApiError('QLOO_UNAVAILABLE', 'Taste data is unavailable. Try again.')
      }
      if (!res.ok) {
        // 4xx — do not retry
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[qloo] ${path} → ${res.status}`)
        }
        throw new ApiError('QLOO_UNAVAILABLE', 'Taste data is unavailable. Try again.')
      }
      return (await res.json()) as T
    } catch (err) {
      clearTimeout(timeout)
      if (err instanceof ApiError) {
        if (err.code === 'QLOO_NO_KEY') throw err
        lastError = err
        // retry once on 5xx / rate-limit / network
        if (err.code === 'QLOO_UNAVAILABLE' || err.code === 'QLOO_RATE_LIMIT') continue
        throw err
      }
      lastError = new ApiError('QLOO_UNAVAILABLE', 'Taste data is unavailable. Try again.')
      continue
    }
  }
  throw lastError ?? new ApiError('QLOO_UNAVAILABLE', 'Taste data is unavailable. Try again.')
}

export function isFixturesMode(): boolean {
  return dataMode() === 'fixtures'
}

export async function searchEntities(query: string, opts: SearchOptions = {}): Promise<QlooEntity[]> {
  const { type = 'artist', take = 5 } = opts
  const key = `search:${type}:${query.toLowerCase()}:${take}`
  const cached = cacheGet<QlooEntity[]>(key)
  if (cached) return cached

  let result: QlooEntity[]
  if (isFixturesMode()) {
    result = fixtureSearchEntities(query, type, take)
  } else {
    const raw = await qlooGet<RawQlooResponse>('/search', {
      query,
      types: typeToUrn(type),
      take: String(take),
    })
    result = normalizeEntityList(raw).filter((e) => e.type === type).slice(0, take)
  }
  cacheSet(key, result)
  return result
}

export async function searchTags(query: string, take = 5): Promise<QlooTag[]> {
  const key = `tags:${query.toLowerCase()}:${take}`
  const cached = cacheGet<QlooTag[]>(key)
  if (cached) return cached

  let result: QlooTag[]
  if (isFixturesMode()) {
    result = fixtureSearchTags(query, take)
  } else {
    const raw = await qlooGet<RawQlooResponse>('/v2/tags', {
      'filter.query': query,
      take: String(take),
    })
    result = normalizeTags(raw, take)
  }
  cacheSet(key, result)
  return result
}

export async function tasteTags(opts: TasteTagsOptions = {}): Promise<QlooTag[]> {
  const { entityIds = [], tagIds = [], take = 15 } = opts
  const key = `insights:tag:${[...entityIds].sort().join(',')}:${[...tagIds].sort().join(',')}:${take}`
  const cached = cacheGet<QlooTag[]>(key)
  if (cached) return cached

  let result: QlooTag[]
  if (isFixturesMode()) {
    const seed = [...entityIds, ...tagIds].join(' ')
    result = fixtureTasteTags(seed || 'indie', take)
  } else {
    const params: Record<string, string> = {
      'filter.type': 'urn:tag',
      take: String(take),
    }
    if (entityIds.length) params['signal.interests.entities'] = entityIds.join(',')
    if (tagIds.length) params['signal.interests.tags'] = tagIds.join(',')
    const raw = await qlooGet<RawQlooResponse>('/v2/insights', params)
    result = normalizeTags(raw, take)
  }
  cacheSet(key, result)
  return result
}

export async function related(opts: RelatedOptions): Promise<QlooEntity[]> {
  const { type, entityIds = [], tagIds = [], location, excludeEntityIds = [], take = 10 } = opts
  const key = `related:${type}:${[...entityIds].sort().join(',')}:${[...tagIds].sort().join(',')}:${location ?? ''}:${[...excludeEntityIds].sort().join(',')}:${take}`
  const cached = cacheGet<QlooEntity[]>(key)
  if (cached) return cached

  let result: QlooEntity[]
  if (isFixturesMode()) {
    const seed = [...entityIds, ...tagIds].join(' ')
    result = fixtureRelated(seed || 'indie', type, excludeEntityIds, take)
    if (location) {
      result = result.map((e) => ({ ...e, location: e.location ? `${e.location} · near ${location}` : location }))
    }
  } else {
    const params: Record<string, string> = {
      'filter.type': typeToUrn(type),
      take: String(take),
      'feature.explainability': 'true',
    }
    if (entityIds.length) params['signal.interests.entities'] = entityIds.join(',')
    if (tagIds.length) params['signal.interests.tags'] = tagIds.join(',')
    if (location) params['filter.location.query'] = location
    if (excludeEntityIds.length) params['filter.exclude.entities'] = excludeEntityIds.join(',')
    const raw = await qlooGet<RawQlooResponse>('/v2/insights', params)
    result = normalizeEntityList(raw, excludeEntityIds)
    // keep only entities of the requested type when the API is loose
    const typed = result.filter((e) => e.type === type)
    result = typed.length > 0 ? typed : result
    result = result.slice(0, take)
  }
  cacheSet(key, result)
  return result
}

export { extractEntities }
