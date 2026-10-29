import { describe, expect, it } from 'vitest'
import { fixtureSearchEntities, fixtureSearchTags, fixtureRelated, fixtureTasteTags } from '@/lib/qloo/fixtures'
import { normalizeEntityList, normalizeTags, rankWeight } from '@/lib/qloo/normalize'
import type { RawQlooResponse } from '@/lib/qloo/types'

describe('qloo normalization (synthetic payloads)', () => {
  it('maps raw rows to QlooEntity with rank-based weights', () => {
    const raw: RawQlooResponse = {
      results: {
        entities: [
          { entity_id: 'e1', name: 'Brand One', type: 'urn:entity:brand' },
          { entity_id: 'e2', name: 'Brand Two', type: 'urn:entity:brand' },
        ],
      },
    }
    const list = normalizeEntityList(raw)
    expect(list).toHaveLength(2)
    expect(list[0].type).toBe('brand')
    expect(list[0].weight).toBeCloseTo(rankWeight(0, 2))
    expect(list[1].weight).toBeLessThan(list[0].weight)
  })

  it('drops rows without id or name', () => {
    const raw = { entities: [{ entity_id: 'x' }, { name: 'no id' }, { entity_id: 'ok', name: 'Fine' }] } as RawQlooResponse
    expect(normalizeEntityList(raw)).toHaveLength(1)
  })

  it('normalises affinity scores above 1 as percentages', () => {
    const raw = { tags: [{ tag_id: 't1', name: 'emo', affinity: 87 }] } as RawQlooResponse
    const tags = normalizeTags(raw)
    expect(tags[0].weight).toBeCloseTo(0.87)
  })

  it('honours the exclusion list', () => {
    const raw = { entities: [{ entity_id: 'a', name: 'A' }, { entity_id: 'b', name: 'B' }] } as RawQlooResponse
    expect(normalizeEntityList(raw, ['a']).map((e) => e.id)).toEqual(['b'])
  })
})

describe('fixtures (SAMPLE DATA — not Qloo output)', () => {
  it('resolves known artist names across scenes (Path A)', () => {
    const found = fixtureSearchEntities('American Football', 'artist', 5)
    expect(found[0].name).toBe('American Football')
    expect(found[0].type).toBe('artist')
  })

  it('falls back to a scene for unknown names', () => {
    const found = fixtureSearchEntities('totally unknown noise project', 'artist', 5)
    expect(found.length).toBeGreaterThan(0)
  })

  it('matches tags by keyword', () => {
    const tags = fixtureSearchTags('craft beer', 5)
    expect(tags.map((t) => t.name)).toContain('craft beer')
  })

  it('returns coherent taste tags for a seed', () => {
    const tags = fixtureTasteTags('midwest emo', 15)
    expect(tags.length).toBeGreaterThan(5)
    expect(tags[0].weight).toBeGreaterThanOrEqual(tags[tags.length - 1].weight)
  })

  it('excludes entities when asked (the replace flow)', () => {
    const all = fixtureRelated('midwest emo', 'brand', [], 10)
    const excluded = fixtureRelated('midwest emo', 'brand', [all[0].id], 10)
    expect(excluded.some((e) => e.id === all[0].id)).toBe(false)
  })
})
