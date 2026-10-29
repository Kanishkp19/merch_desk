import type { AgentEvent, AffinityEntity, EntityType, StudioInput, TasteProfile, WeightedTag } from '@/types'
import { AgentMemory } from './tools'
import { classifyEntities, priceTierFromBrands } from '@/lib/score/classify'
import { pickPalette } from '@/lib/score/describe'
import { toCanonical } from '@/lib/score/tag-map'
import { isFixturesMode } from '@/lib/qloo/client'

const CROSS_TYPES: EntityType[] = ['videogame', 'tv_show', 'movie', 'book', 'podcast']

/**
 * Assemble the TasteProfile from AgentMemory with deterministic code.
 * The LLM never produces data — this is pure transformation.
 */
export async function buildProfile(
  memory: AgentMemory,
  input: StudioInput,
  params: {
    path: 'A_artist_found' | 'B_description'
    notes: string[]
    agentMode: 'llm_agent' | 'scripted_fallback'
    qlooCalls: number
  }
): Promise<TasteProfile> {
  // ---- tags (top 12 by weight, canonical-mapped) ----
  const allTags = Array.from(memory.tags.values()).sort((a, b) => b.weight - a.weight)
  const seenCanonical = new Map<string, number>()
  const tags: WeightedTag[] = []
  for (const t of allTags) {
    const canonical = toCanonical(t.name)
    if (canonical) {
      if (seenCanonical.has(canonical)) continue
      seenCanonical.set(canonical, 1)
    }
    tags.push({
      name: t.name,
      qlooTagId: t.id,
      canonical,
      weight: Math.round(t.weight * 100) / 100,
      source: 'qloo',
    })
    if (tags.length >= 12) break
  }

  // ---- brands ----
  const brandEntities = memory.entitiesOfType('brand').sort((a, b) => b.weight - a.weight).slice(0, 10)
  const brandAffinity: AffinityEntity[] = brandEntities.map((e) => ({
    id: e.id,
    name: e.name,
    type: 'brand' as const,
    weight: Math.round(e.weight * 100) / 100,
    tags: e.tags.slice(0, 10),
    canonicalTags: [],
    estimated: false,
    ...(e.location ? { location: e.location } : {}),
  }))
  const classifiedBrands = await classifyEntities(brandAffinity)

  // ---- cross-domain ----
  const crossEntities: AffinityEntity[] = []
  for (const type of CROSS_TYPES) {
    for (const e of memory.entitiesOfType(type).sort((a, b) => b.weight - a.weight).slice(0, 5)) {
      crossEntities.push({
        id: e.id,
        name: e.name,
        type,
        weight: Math.round(e.weight * 100) / 100,
        tags: e.tags.slice(0, 10),
        canonicalTags: [],
        estimated: false,
      })
    }
  }
  const classifiedCross = await classifyEntities(crossEntities)

  // ---- places ----
  const placeEntities = memory.entitiesOfType('place').sort((a, b) => b.weight - a.weight).slice(0, 6)
  const places: AffinityEntity[] = placeEntities.map((e) => ({
    id: e.id,
    name: e.name,
    type: 'place' as const,
    weight: Math.round(e.weight * 100) / 100,
    tags: e.tags.slice(0, 10),
    canonicalTags: [],
    estimated: false,
    ...(e.location ? { location: e.location } : {}),
  }))

  // ---- price tier + palette ----
  const { tier, estimated } = priceTierFromBrands(classifiedBrands)
  const notes = [...params.notes]
  if (isFixturesMode()) {
    notes.unshift('Sample data mode — no Qloo key configured. Results use labeled synthetic data, not live affinity.')
  }

  const profile: TasteProfile = {
    path: params.path,
    ...(memory.artistEntity && params.path === 'A_artist_found'
      ? { artist: { id: memory.artistEntity.id, name: memory.artistEntity.name } }
      : {}),
    seeds: {
      entityIds: memory.seedEntityIds.slice(0, 20),
      tagIds: memory.seedTagIds.slice(0, 20),
    },
    tags,
    brands: classifiedBrands,
    crossDomain: classifiedCross,
    inspirationPlaces: places,
    priceTier: tier,
    priceTierEstimated: estimated,
    paletteId: pickPalette({ tags } as TasteProfile),
    notes,
    agentMode: params.agentMode,
    qlooCalls: params.qlooCalls,
  }
  return profile
}

export function emitStep(emit: (e: AgentEvent) => void, id: string, label: string, status: AgentEvent extends never ? never : 'running' | 'done' | 'skipped' | 'failed', detail?: string) {
  emit({ type: 'step', id, label, status, ...(detail ? { detail } : {}) })
}
