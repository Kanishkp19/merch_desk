import type { CatalogItem } from '@/types'
import type { QlooEntity } from '@/lib/qloo/types'
import { toCanonical } from '@/lib/score/tag-map'
import catalogJson from '@/data/catalog.json'

const CATALOG = catalogJson as CatalogItem[]

/** Display label for known venue categories (also used as the relevance boost list). */
export const VENUE_LABELS: Record<string, string> = {
  'craft brewery': 'brewery',
  brewery: 'brewery',
  'coffee shop': 'café',
  café: 'café',
  cafe: 'café',
  'coffee roaster': 'roaster',
  roaster: 'roaster',
  'record shop': 'record shop',
  'record store': 'record shop',
  'music venue': 'music venue',
  venue: 'venue',
  'live music venue': 'music venue',
  'vinyl shop': 'record shop',
  'vintage store': 'vintage shop',
  'thrift store': 'thrift shop',
  'arcade bar': 'arcade bar',
  'gaming café': 'gaming café',
  'bookshop café': 'bookshop café',
  bookshop: 'bookshop',
  bookstore: 'bookshop',
  gallery: 'gallery',
  'art gallery': 'gallery',
  'design studio': 'design studio',
  studio: 'studio',
  'bar + venue': 'venue',
  'dive bar': 'dive bar',
  'metal bar': 'metal bar',
  club: 'club',
  nightclub: 'nightclub',
  'cocktail bar': 'cocktail bar',
  bar: 'bar',
  pub: 'pub',
  arcade: 'arcade',
  'gift shop': 'gift shop',
  boutique: 'boutique',
  diner: 'diner',
  restaurant: 'restaurant',
  'wine bar': 'wine bar',
  'outdoor shop': 'outdoor shop',
  'lodge bar': 'lodge bar',
  theatre: 'theatre',
  theater: 'theater',
  'print shop': 'print shop',
}

/**
 * Venue categories that make no sense as merch collaboration partners however
 * near they are — accommodation, corporate/office, medical, education/training,
 * infrastructure. Matched on name + location + tags of a PLACE candidate.
 */
const UNSUITABLE_PLACE = [
  'hotel', 'resort', 'motel', 'guest house', 'guesthouse', 'hostel', 'paying guest',
  '\\bpg\\b', 'service apartment', 'apartment',
  'mall', 'shopping cent', 'multiplex',
  'hospital', 'clinic', 'diagnostic', 'pharmacy', 'medical',
  '\\bschool\\b', 'college', 'coaching', 'training cent', '\\btutor',
  'evaluation', 'assessment', 'corporate', '\\boffice\\b', 'it park', 'software park',
  'technology park', 'business cent', 'consultanc', 'consulting',
  '\\bbank\\b', 'insurance', 'real estate', 'builder', 'construction',
  'government', 'municipal', 'police', '\\bcourt\\b',
  'petrol', 'gas station', 'car dealer', 'dealership', 'service cent',
  'airline', 'airport', 'cargo', 'courier', 'telecom', 'internet service provider',
]
  .map((p) => new RegExp(`\\b${p}`, 'i'))

function haystack(e: QlooEntity): string {
  return `${e.name} ${e.location ?? ''} ${e.tags.join(' ')}`.toLowerCase()
}

/** True when a place is a plausible collaboration venue (not just geographically near). */
export function isSuitablePlace(e: QlooEntity): boolean {
  if (e.type !== 'place') return true
  const h = haystack(e)
  if (UNSUITABLE_PLACE.some((re) => re.test(h))) return false
  // Qloo's place feed also contains landmarks, houses, and attractions. Only
  // actual retail/culture/hospitality venues are actionable local partners.
  return Boolean(venueLabel(e)) || Object.keys(VENUE_LABELS).some((label) => new RegExp(`\\b${label}\\b`, 'i').test(e.name))
}

/** Human venue label from the location/category field, when it carries one. */
export function venueLabel(e: QlooEntity): string | undefined {
  if (!e.location) return undefined
  const key = e.location.trim().toLowerCase()
  if (VENUE_LABELS[key]) return VENUE_LABELS[key]
  // location sometimes carries "Venue · neighbourhood" style content
  const first = key.split('·')[0]?.trim()
  if (first && VENUE_LABELS[first]) return VENUE_LABELS[first]
  return undefined
}

/** Venue-ish categories get a small relevance boost. */
function venueBoost(e: QlooEntity): number {
  const label = e.location?.trim().toLowerCase() ?? ''
  if (VENUE_LABELS[label] || Object.keys(VENUE_LABELS).some((k) => label.includes(k))) return 1
  return 0
}

export interface RankedPartner {
  entity: QlooEntity
  score: number
  venueType?: string
  /** Canonical taste tags this partner shares with the audience profile. */
  matchedTags: string[]
}

/** Brand suggestions need two independent shared tastes; venues need one. */
export function hasPartnerEvidence(partner: RankedPartner): boolean {
  return partner.matchedTags.length >= (partner.entity.type === 'brand' ? 2 : 1)
}

/**
 * Rank the full candidate pool (places + brands) by audience relevance so weak
 * nearby places cannot crowd out relevant brands. Unsuitable places are dropped.
 */
export function rankPartners(
  pool: QlooEntity[],
  profileWeights: Map<string, number>,
  opts: { take?: number; minPlaces?: number; maxBrands?: number } = {}
): RankedPartner[] {
  const ranked: RankedPartner[] = []
  for (const e of pool) {
    if (!isSuitablePlace(e)) continue
    const matched = new Map<string, number>()
    for (const tag of e.tags) {
      const c = toCanonical(tag)
      const w = c ? profileWeights.get(c) : undefined
      if (c && w !== undefined && w > 0) matched.set(c, w)
    }
    const relevance = [...matched.values()].reduce((s, w) => s + w, 0)
    const score = 2 * relevance + venueBoost(e) + (e.type === 'brand' ? 0.25 : 0)
    ranked.push({
      entity: e,
      score: Math.round(score * 100) / 100,
      venueType: venueLabel(e),
      matchedTags: [...matched.keys()],
    })
  }
  ranked.sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))
  const take = opts.take ?? 8
  if (opts.minPlaces === undefined && opts.maxBrands === undefined) return ranked.slice(0, take)
  const selected = ranked.filter((p) => p.entity.type === 'place').slice(0, opts.minPlaces ?? 0)
  for (const candidate of ranked) {
    if (selected.length >= take) break
    if (selected.some((p) => p.entity.id === candidate.entity.id)) continue
    if (candidate.entity.type === 'brand' && selected.filter((p) => p.entity.type === 'brand').length >= (opts.maxBrands ?? take)) continue
    selected.push(candidate)
  }
  return selected.sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))
}

/**
 * Link a partner to products in the current collection: specific consumable
 * collabs first, then any collection product sharing a canonical taste tag.
 */
export function linkProducts(partner: RankedPartner, productIds: string[]): string[] {
  const linked: string[] = []
  const hay = `${partner.entity.location ?? ''} ${partner.entity.tags.join(' ')}`.toLowerCase()
  const specific: Array<[RegExp, string]> = [
    [/brewery|beer|taproom/, 'beer-label-collab'],
    [/coffee|cafe|café|roaster|espresso/, 'coffee-collab'],
    [/hot sauce|spicy|food/, 'hot-sauce-collab'],
    [/vinyl|record|music|cassette/, 'cassette-usb'],
    [/book|zine|publishing/, 'zine'],
  ]
  for (const [re, id] of specific) {
    if (re.test(hay) && productIds.includes(id)) linked.push(id)
  }
  const tagProducts = new Set(partner.matchedTags)
  for (const id of productIds) {
    if (linked.includes(id)) continue
    const item = CATALOG.find((c) => c.id === id)
    if (item && item.tags.some((t) => tagProducts.has(t))) linked.push(id)
  }
  return linked.slice(0, 2)
}

/** Honest template pitch when the LLM is unavailable — never presents amenities as audience taste. */
export function templatePitch(partner: RankedPartner, city: string): string {
  const name = partner.entity.name
  if (partner.matchedTags.length > 0) {
    return `Co-release with ${name} — your audiences overlap on ${partner.matchedTags.slice(0, 2).join(' and ')}.`
  }
  if (partner.venueType) {
    return `Host a small pop-up or co-branded drop at ${name} (${partner.venueType}) near ${city}.`
  }
  if (partner.entity.type === 'brand') {
    return `${name} is an affinity brand for this audience — explore a co-branded capsule.`
  }
  return `Possible partner near ${city} — no strong audience-overlap signal yet, vet before pitching.`
}
