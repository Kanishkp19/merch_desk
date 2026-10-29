import { describe, expect, it } from 'vitest'
import { hasPartnerEvidence, isSuitablePlace, rankPartners, linkProducts, templatePitch, venueLabel } from '@/lib/partners/rank'
import type { QlooEntity } from '@/lib/qloo/types'

function place(id: string, name: string, location: string, tags: string[] = []): QlooEntity {
  return { id, name, type: 'place', weight: 1, tags, location }
}

// The weak candidates the live Mira Vale run actually returned
const SHERATON = place('p1', 'Sheraton Grand Bangalore Hotel at Brigade Gateway', 'Hotel', ['Air conditioned', 'Wheelchair accessible restroom'])
const MALL = place('p2', 'Mantri Square Mall', 'Shopping Mall', ['Wheelchair accessible restroom'])
const PG = place('p3', 'Tharuni PG for Gents', 'Guest house', ['Guest house'])
const TRAINING = place('p4', 'eLitmus Evaluation Private Limited', 'Training centre', ['Training centre'])
const CLUB = place('p5', 'Ideal Recreational Club', 'Club', ['Club'])
const LANDMARK = place('p11', '16th Avenue Tiled Steps', 'San Francisco', ['Tourist attraction', 'Photography'])

const CAFE = place('p6', 'Hatti Kaapi', 'coffee shop', ['coffee', 'Air conditioned'])
const RECORDS = place('p7', 'Bengaluru Record Bunker', 'record shop', ['vinyl', 'electronic'])
const ROASTERY = place('p8', 'Third Wave Roasters', 'coffee roaster', ['coffee'])

const weights = new Map([
  ['electronic', 1],
  ['photography', 0.9],
  ['coffee', 0.8],
])

describe('partner suitability (the Mira Vale regression)', () => {
  it('reserves local venues ahead of affinity brands when both are available', () => {
    const brands: QlooEntity[] = Array.from({ length: 6 }, (_, i) => ({ id: `b${i}`, name: `Brand ${i}`, type: 'brand', weight: 1, tags: ['electronic'] }))
    const ranked = rankPartners([...brands, RECORDS, CAFE, ROASTERY], weights, { take: 6, minPlaces: 3, maxBrands: 2 })
    expect(ranked.filter((p) => p.entity.type === 'place')).toHaveLength(3)
    expect(ranked.filter((p) => p.entity.type === 'brand')).toHaveLength(2)
  })

  it('does not treat one broad brand tag as a strong collaboration signal', () => {
    const brand: QlooEntity = { id: 'single', name: 'Unrelated Brand', type: 'brand', weight: 1, tags: ['electronic'] }
    const ranked = rankPartners([brand, RECORDS], weights)
    expect(hasPartnerEvidence(ranked.find((p) => p.entity.id === 'single')!)).toBe(false)
    expect(hasPartnerEvidence(ranked.find((p) => p.entity.id === RECORDS.id)!)).toBe(true)
  })
  it('drops hotels, malls, PGs and training firms — nearby is not relevant', () => {
    expect(isSuitablePlace(SHERATON)).toBe(false)
    expect(isSuitablePlace(MALL)).toBe(false)
    expect(isSuitablePlace(PG)).toBe(false)
    expect(isSuitablePlace(TRAINING)).toBe(false)
    expect(isSuitablePlace(LANDMARK)).toBe(false)
  })

  it('keeps culture/retail venues and never blocks brand affinities on venue rules', () => {
    expect(isSuitablePlace(CAFE)).toBe(true)
    expect(isSuitablePlace(RECORDS)).toBe(true)
    const brand: QlooEntity = { id: 'b1', name: 'Brave Software', type: 'brand', weight: 0.7, tags: ['Technical'] }
    expect(isSuitablePlace(brand)).toBe(true)
  })

  it('rankPartners drops unsuitable places from the pool entirely', () => {
    const ranked = rankPartners([SHERATON, MALL, PG, TRAINING, CAFE, RECORDS], weights, { take: 6 })
    const names = ranked.map((r) => r.entity.name)
    expect(names).not.toContain(SHERATON.name)
    expect(names).not.toContain(MALL.name)
    expect(names).not.toContain(PG.name)
    expect(names).not.toContain(TRAINING.name)
  })

  it('ranks by audience relevance, so relevant venues beat an ambiguous club', () => {
    const ranked = rankPartners([CLUB, ROASTERY, RECORDS], weights, { take: 3 })
    expect(ranked[0].entity.name).not.toBe(CLUB.name)
    expect(ranked[0].matchedTags.length).toBeGreaterThan(0)
  })

  it('exposes venue labels without leaking raw amenities', () => {
    expect(venueLabel(CAFE)).toBe('café')
    expect(venueLabel(RECORDS)).toBe('record shop')
    expect(venueLabel(SHERATON)).toBeUndefined() // hotels carry no usable venue label here
  })
})

describe('partner → product links', () => {
  it('links a record shop to the cassette-usb in the collection', () => {
    const ranked = rankPartners([RECORDS], weights)[0]
    expect(linkProducts(ranked, ['cassette-usb', 'poster-print'])).toContain('cassette-usb')
  })

  it('links a café to the coffee collab first, then tag-matching products', () => {
    const ranked = rankPartners([CAFE], weights)[0]
    const linked = linkProducts(ranked, ['coffee-collab', 'enamel-camp-mug'])
    expect(linked[0]).toBe('coffee-collab')
    expect(linked).toContain('enamel-camp-mug')
  })

  it('returns no links when nothing in the collection matches', () => {
    const ranked = rankPartners([CLUB], weights)[0]
    expect(linkProducts(ranked, ['playing-cards'])).toEqual([])
  })
})

describe('template pitch honesty', () => {
  it('never presents amenities (Air conditioned…) as audience taste', () => {
    const ranked = rankPartners([CAFE], weights)[0]
    const pitch = templatePitch(ranked, 'Bengaluru')
    expect(pitch).not.toMatch(/air conditioned/i)
    expect(pitch).toMatch(/overlap/i)
  })

  it('suggests a pop-up for a venue with no audience overlap, and says so honestly', () => {
    const ranked = rankPartners([place('p9', 'Some Diner', 'diner', ['diner food'])], weights)[0]
    const pitch = templatePitch(ranked, 'Bengaluru')
    expect(pitch).toMatch(/pop-up/i)
  })

  it('flags weak-signal partners instead of inventing affinity', () => {
    const weak = rankPartners([place('p10', 'Ideal Recreational Club', 'recreation', [])], weights)[0]
    expect(templatePitch(weak, 'Bengaluru')).toMatch(/no strong audience-overlap signal/i)
  })
})
