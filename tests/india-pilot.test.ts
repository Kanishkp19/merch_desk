import { describe, expect, it } from 'vitest'
import { studioInputSchema } from '@/lib/schemas/input'
import { collabsBodySchema } from '@/lib/schemas/api'
import { indiaVenueIdeas } from '@/lib/partners/india'
import { briefTags } from '@/lib/score/tag-map'
import { CATALOG } from '@/lib/score/collection'
import { computePricing, formatInr, gstRateFor } from '@/lib/score/pricing'
import type { TasteProfile } from '@/types'

const profile = (canonical: string[]): TasteProfile => ({
  path: 'B_description', seeds: { entityIds: [], tagIds: [] },
  tags: canonical.map((tag) => ({ name: tag, canonical: tag, weight: 0.9, source: 'user' })),
  brands: [], crossDomain: [], inspirationPlaces: [], priceTier: 'mid',
  priceTierEstimated: true, paletteId: 'warm', notes: [], agentMode: 'scripted_fallback', qlooCalls: 0,
})

describe('India pilot', () => {
  it('accepts city aliases across the 7 pilot cities and rejects other cities', () => {
    expect(studioInputSchema.parse({ text: 'indie comics', city: 'Bangalore' }).city).toBe('Bengaluru')
    expect(studioInputSchema.parse({ text: 'indie comics', city: 'Bombay' }).city).toBe('Mumbai')
    expect(studioInputSchema.parse({ text: 'indie comics', city: 'New Delhi' }).city).toBe('Delhi NCR')
    expect(studioInputSchema.parse({ text: 'indie comics', city: 'Madras' }).city).toBe('Chennai')
    expect(studioInputSchema.parse({ text: 'indie comics', city: 'Calcutta' }).city).toBe('Kolkata')
    expect(studioInputSchema.parse({ text: 'indie comics', city: 'Pune' }).city).toBe('Pune')
    expect(studioInputSchema.safeParse({ text: 'indie comics', city: 'Dubai' }).success).toBe(false)
    expect(collabsBodySchema.safeParse({ profile: profile(['coffee']), city: 'Dubai', productIds: [] }).success).toBe(false)
  })

  it('recognizes local niche wording and uses INR estimates', () => {
    expect(briefTags('desi hip-hop, risograph gig posters and filter coffee')).toEqual(expect.arrayContaining(['hiphop', 'art-print', 'coffee']))
    expect(briefTags('bollywood posters, street food trails and carnatic music')).toEqual(expect.arrayContaining(['cinema', 'foodie', 'folk']))
    expect(briefTags('gully rap and Indian indie')).toEqual(expect.arrayContaining(['hiphop', 'indie']))
    expect(CATALOG.some((item) => item.id === 'beer-label-collab')).toBe(false)
    expect(formatInr(computePricing(CATALOG.find((item) => item.id === 'heavyweight-tee')!, 'mid').price)).toMatch(/^₹/)
  })

  it('applies indicative GST by category (GST 2.0 rates, effective 22 Sep 2025)', () => {
    const tee = CATALOG.find((item) => item.id === 'heavyweight-tee')!
    const sticker = CATALOG.find((item) => item.id === 'sticker-pack')!
    const zine = CATALOG.find((item) => item.id === 'zine')!
    expect(gstRateFor(tee, 2600)).toBe(0.18)
    expect(gstRateFor(tee, 2500)).toBe(0.05)
    expect(gstRateFor(sticker, 150)).toBe(0.18)
    expect(gstRateFor(zine, 250)).toBe(0)
    const pricing = computePricing(tee, 'mid')
    expect(pricing.priceInclGst).toBe(Math.round(pricing.price * (1 + pricing.gstRate)))
  })

  it('returns sourced venues only in the requested city and with an interest match', () => {
    const blr = indiaVenueIdeas('Bengaluru', profile(['coffee', 'photography']), ['poster-print'])
    expect(blr.some((venue) => venue.name === 'Subko Craftery')).toBe(true)
    expect(blr.every((venue) => venue.id.startsWith('blr-') && venue.sourceUrl?.startsWith('https://'))).toBe(true)
    const bom = indiaVenueIdeas('Mumbai', profile(['comics', 'zines']), ['zine'])
    expect(bom.some((venue) => venue.name === 'Kitab Khana')).toBe(true)
    expect(bom.every((venue) => venue.id.startsWith('bom-'))).toBe(true)
  })

  it('serves the new cities with verified local venues', () => {
    const del = indiaVenueIdeas('Delhi NCR', profile(['books', 'zines']), ['zine'])
    expect(del.some((venue) => venue.name === 'Kunzum Books')).toBe(true)
    const che = indiaVenueIdeas('Chennai', profile(['folk']), ['poster-print'])
    expect(che.some((venue) => venue.name === 'The Music Academy Madras')).toBe(true)
    expect(che.every((venue) => venue.id.startsWith('che-'))).toBe(true)
    for (const city of ['Pune', 'Hyderabad', 'Kolkata'] as const) {
      const tags = city === 'Hyderabad' ? ['coffee', 'photography'] : city === 'Kolkata' ? ['books', 'comics'] : ['books', 'zines']
      expect(indiaVenueIdeas(city, profile(tags), []).every((venue) => venue.sourceUrl?.startsWith('https://'))).toBe(true)
    }
  })
})
