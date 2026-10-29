import type { CatalogItem, EvidenceLink, TasteProfile } from '@/types'
import { profileTagWeights, crossDomainWeights } from './tag-map'

export interface ScoreResult {
  tag: number // 0..1
  brand: number // 0..1
  cross: number // 0..1
  fitScore: number // 0..100
  evidence: EvidenceLink[]
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))

/**
 * Deterministic fit score (02-TRD):
 *   tag   = clamp( Σ_{c ∈ item.tags ∩ P} P[c] / 2 , 0, 1 )
 *   brand = clamp( Σ top2 matching brands (weight × (estimated?0.6:1)) / 2 , 0, 1 )
 *   cross = clamp( Σ_{c ∈ item.crossDomainTags ∩ X} X[c] / 1.5 , 0, 1 )
 *   fit   = round(100 × (0.5·tag + 0.3·brand + 0.2·cross))
 */
export function scoreItem(item: CatalogItem, profile: TasteProfile): ScoreResult {
  const P = profileTagWeights(profile)
  const X = crossDomainWeights(profile)

  // --- tag part ---
  const tagLinks: Array<{ c: string; weight: number }> = []
  let tagSum = 0
  for (const c of item.tags) {
    const w = P.get(c)
    if (w !== undefined) {
      tagSum += w
      tagLinks.push({ c, weight: w })
    }
  }
  const tag = clamp01(tagSum / 2)

  // --- brand part ---
  const brandLinks: Array<{ name: string; weight: number; estimated: boolean; shared: string[] }> = []
  for (const brand of profile.brands) {
    const cats = brand.brandCategories ?? []
    const shared = item.brandCategories.filter((c) => cats.includes(c))
    if (shared.length > 0) {
      brandLinks.push({
        name: brand.name,
        weight: brand.weight * (brand.estimated ? 0.6 : 1),
        estimated: brand.estimated,
        shared,
      })
    }
  }
  brandLinks.sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name))
  const top2 = brandLinks.slice(0, 2)
  const brand = clamp01(top2.reduce((s, b) => s + b.weight, 0) / 2)

  // --- cross-domain part ---
  const crossLinks: Array<{ c: string; weight: number }> = []
  let crossSum = 0
  for (const c of item.crossDomainTags) {
    const w = X.get(c)
    if (w !== undefined) {
      crossSum += w
      crossLinks.push({ c, weight: w })
    }
  }
  const cross = clamp01(crossSum / 1.5)

  const fitScore = Math.round(100 * (0.5 * tag + 0.3 * brand + 0.2 * cross))

  // --- evidence (points = coefficient × share × 100, top 3, ties broken by label) ---
  const tagTotal = tagSum || 1
  const crossTotal = crossSum || 1
  const evidence: EvidenceLink[] = []
  for (const l of tagLinks) {
    evidence.push({
      kind: 'tag',
      label: l.c.replace(/-/g, ' '),
      points: Math.round(0.5 * (l.weight / tagTotal) * (tag > 0 ? 100 * tag : 0)),
      estimated: false,
    })
  }
  for (const b of top2) {
    evidence.push({
      kind: 'brand',
      label: b.shared[0].replace(/-/g, ' '),
      entityName: b.name,
      points: Math.round(0.3 * b.weight * 100) / 2,
      estimated: b.estimated,
    })
  }
  for (const l of crossLinks) {
    evidence.push({
      kind: 'cross_domain',
      label: l.c.replace(/-/g, ' '),
      points: Math.round(0.2 * (l.weight / crossTotal) * (cross > 0 ? 100 * cross : 0)),
      estimated: false,
    })
  }
  evidence.sort((a, b) => b.points - a.points || a.label.localeCompare(b.label))

  return { tag, brand, cross, fitScore, evidence: evidence.slice(0, 3) }
}

export function scoreCatalog(catalog: CatalogItem[], profile: TasteProfile): Array<{ item: CatalogItem } & ScoreResult> {
  return catalog
    .map((item) => ({ item, ...scoreItem(item, profile) }))
    .sort((a, b) => b.fitScore - a.fitScore || a.item.id.localeCompare(b.item.id))
}
