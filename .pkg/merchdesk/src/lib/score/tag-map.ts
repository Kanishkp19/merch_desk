import tagAliases from '@/data/tag-aliases.json'
import canonicalTags from '@/data/canonical-tags.json'
import type { TasteProfile, WeightedTag, AffinityEntity } from '@/types'

export const CANONICAL_TAGS: string[] = canonicalTags

const ALIASES: Record<string, string> = tagAliases

/** Map a display tag name to its canonical form (exact → substring → undefined). */
export function toCanonical(name: string): string | undefined {
  const key = name.toLowerCase().trim()
  if (!key) return undefined
  if (CANONICAL_TAGS.includes(key)) return key
  if (ALIASES[key]) return ALIASES[key]
  // substring match on alias keys (longest first for determinism)
  const keys = Object.keys(ALIASES).filter((k) => key.includes(k))
  if (keys.length > 0) {
    keys.sort((a, b) => b.length - a.length)
    return ALIASES[keys[0]]
  }
  // substring match on canonical names
  const canon = CANONICAL_TAGS.filter((c) => key.includes(c.replace('-', ' ')) || key.includes(c))
  if (canon.length > 0) {
    canon.sort((a, b) => b.length - a.length)
    return canon[0]
  }
  return undefined
}

/** Profile weight per canonical tag: max weight among tags mapping to it. */
export function profileTagWeights(profile: TasteProfile): Map<string, number> {
  const map = new Map<string, number>()
  for (const tag of profile.tags) {
    const c = tag.canonical ?? toCanonical(tag.name)
    if (!c) continue
    map.set(c, Math.max(map.get(c) ?? 0, tag.weight))
  }
  return map
}

/** Cross-domain weights X[c] from crossDomain + inspirationPlaces entities' canonicalTags × weight. */
export function crossDomainWeights(profile: TasteProfile): Map<string, number> {
  const map = new Map<string, number>()
  const entities: AffinityEntity[] = [...profile.crossDomain, ...profile.inspirationPlaces]
  for (const e of entities) {
    for (const c of e.canonicalTags) {
      if (!CANONICAL_TAGS.includes(c)) continue
      map.set(c, Math.max(map.get(c) ?? 0, e.weight))
    }
  }
  return map
}

/** Tag list with canonical mapping attached (used by the profile card + scoring). */
export function mappedTags(tags: WeightedTag[]): WeightedTag[] {
  return tags.map((t) => ({ ...t, canonical: t.canonical ?? toCanonical(t.name) }))
}
