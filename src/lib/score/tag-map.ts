import tagAliases from '@/data/tag-aliases.json'
import canonicalTags from '@/data/canonical-tags.json'
import type { TasteProfile, WeightedTag, AffinityEntity } from '@/types'

export const CANONICAL_TAGS: string[] = canonicalTags

const ALIASES: Record<string, string> = tagAliases

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const matcherCache = new Map<string, RegExp>()

/**
 * Word-boundary phrase matcher, tolerant of a trailing plural "s".
 * Matches "craft beer" inside "loves craft beers", but never "rap" inside
 * "photography" or "tea" inside "teal" — substring false positives.
 */
function phraseMatcher(phrase: string): RegExp {
  let re = matcherCache.get(phrase)
  if (!re) {
    re = new RegExp(`\\b${escapeRe(phrase)}s?\\b`)
    matcherCache.set(phrase, re)
  }
  return re
}

/** Map a display tag name to its canonical form (exact → word-boundary phrase → undefined). */
export function toCanonical(name: string): string | undefined {
  const key = name.toLowerCase().trim()
  if (!key) return undefined
  if (CANONICAL_TAGS.includes(key)) return key
  if (ALIASES[key]) return ALIASES[key]
  // word-boundary match on alias keys (longest first for determinism)
  const keys = Object.keys(ALIASES).filter((k) => phraseMatcher(k).test(key))
  if (keys.length > 0) {
    keys.sort((a, b) => b.length - a.length)
    return ALIASES[keys[0]]
  }
  // word-boundary match on canonical names (hyphenated and spaced forms)
  const canon = CANONICAL_TAGS.filter((c) => phraseMatcher(c).test(key) || phraseMatcher(c.replace(/-/g, ' ')).test(key))
  if (canon.length > 0) {
    canon.sort((a, b) => b.length - a.length)
    return canon[0]
  }
  return undefined
}

/** Canonical interests explicitly named in the creator's brief. */
export function briefTags(text: string): string[] {
  const normalized = text.toLowerCase()
  const found = new Set<string>()
  for (const [phrase, canonical] of Object.entries(ALIASES)) {
    if (phraseMatcher(phrase).test(normalized)) found.add(canonical)
  }
  for (const canonical of CANONICAL_TAGS) {
    if (phraseMatcher(canonical).test(normalized) || phraseMatcher(canonical.replace(/-/g, ' ')).test(normalized)) found.add(canonical)
  }
  return [...found]
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
