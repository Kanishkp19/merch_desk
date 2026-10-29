import { describe, expect, it } from 'vitest'
import { buildDropPlan, indiaSeasonNote } from '@/lib/score/drops'
import { computePricing, charm, gstRateFor } from '@/lib/score/pricing'
import { BUDGET_RULES, firstRunCost, selectProducts } from '@/lib/score/rules'
import type { CatalogItem, ProductProposal } from '@/types'
import catalog from '@/data/catalog.json'
import { CATALOG as PILOT_CATALOG } from '@/lib/score/collection'

const CATALOG = catalog as CatalogItem[]

describe('pricing', () => {
  it('applies tier multipliers and clamps to the price range', () => {
    const sticker = CATALOG.find((c) => c.id === 'sticker-pack')!
    const budget = computePricing(sticker, 'budget')
    const premium = computePricing(sticker, 'premium')
    expect(budget.price).toBe(130)
    expect(premium.price).toBe(200)
  })

  it('charms to nearest .00 or .50', () => {
    expect(charm(12.2)).toBe(12)
    expect(charm(12.3)).toBe(12.5)
    expect(charm(12.8)).toBe(13)
  })

  it('computes break-even or null beyond the min run', () => {
    const hoodie = CATALOG.find((c) => c.id === 'heavyweight-hoodie')!
    const p = computePricing(hoodie, 'mid')
    expect(p.firstRunCost).toBe(1500 + 24 * 1050)
    expect(p.breakEvenUnits === null || p.breakEvenUnits <= hoodie.minRun).toBe(true)
  })

  it('marks everything as an estimate', () => {
    const p = computePricing(CATALOG[0], 'mid')
    expect(p.estimate).toBe(true)
  })

  it('adds indicative GST by category and computes the inclusive price (GST 2.0, verified 29 Oct 2026)', () => {
    const tee = CATALOG.find((c) => c.id === 'heavyweight-tee')!
    const zine = CATALOG.find((c) => c.id === 'zine')!
    // apparel: 5% up to ₹2,500/piece, 18% above (Notifications 9/2025 & 13/2025, effective 22 Sep 2025)
    expect(gstRateFor(tee, 2500)).toBe(0.05)
    expect(gstRateFor(tee, 2600)).toBe(0.18)
    const at5 = computePricing(tee, 'mid')
    expect(at5.priceInclGst).toBe(Math.round(at5.price * (1 + at5.gstRate)))
    const exempt = computePricing(zine, 'mid')
    expect(exempt.gstRate).toBe(0)
    expect(exempt.priceInclGst).toBe(exempt.price)
  })

  it('computes break-even on contribution, not on price', () => {
    const tee = CATALOG.find((c) => c.id === 'heavyweight-tee')!
    const p = computePricing(tee, 'mid')
    if (p.breakEvenUnits !== null) {
      expect(p.breakEvenUnits).toBe(Math.ceil(p.firstRunCost / p.marginPerUnit))
      expect(p.breakEvenUnits).toBeLessThanOrEqual(tee.minRun)
    } else {
      expect(p.marginPerUnit <= 0 || p.firstRunCost / p.marginPerUnit > tee.minRun).toBe(true)
    }
  })
})

describe('selection rules', () => {
  const scored = (budget: 'small' | 'medium' | 'large') => {
    // even scores → deterministic ordering by id
    const list = PILOT_CATALOG.map((item) => ({ item, fitScore: 50 }))
    return selectProducts(list, budget)
  }

  it('respects budget caps', () => {
    for (const tier of ['small', 'medium', 'large'] as const) {
      const { selected, totalFirstRun } = scored(tier)
      expect(totalFirstRun).toBeLessThanOrEqual(BUDGET_RULES[tier].totalCap + 1)
      expect(selected.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('keeps ≤3 per category and ≤2 consumables', () => {
    const { selected } = scored('large')
    const counts = new Map<string, number>()
    for (const s of selected) counts.set(s.item.category, (counts.get(s.item.category) ?? 0) + 1)
    for (const [cat, n] of counts) {
      expect(n).toBeLessThanOrEqual(cat === 'consumables' ? 2 : 3)
    }
  })

  it('marks exactly one hero', () => {
    const { selected } = scored('medium')
    expect(selected.filter((s) => s.role === 'hero').length).toBe(1)
  })

  it('firstRunCost = setup + minRun × mean(unitCost)', () => {
    const tee = CATALOG.find((c) => c.id === 'heavyweight-tee')!
    expect(firstRunCost(tee)).toBe(1200 + 36 * 450)
  })
})

describe('drop plan', () => {
  it('builds three waves and never exceeds 2× minRun', () => {
    const products = CATALOG.slice(0, 6).map((item, i): ProductProposal => ({
      id: item.id,
      name: item.name,
      oneLiner: 'x',
      category: item.category,
      role: i === 0 ? 'hero' : i === 1 ? 'limited' : 'core',
      silhouette: item.silhouette,
      fitScore: 50,
      scoreParts: { tag: 0, brand: 0, cross: 0 },
      evidence: [],
      pricing: computePricing(item, 'mid'),
      supplierType: item.supplierType,
      supplierBrief: item.supplierBrief,
      description: { text: 'A test description long enough to pass.', version: 1, history: [], source: 'template' },
      decision: 'pending',
      image: { status: 'idle', attempts: 0, outdated: false },
    }))
    const plan = buildDropPlan(products)
    expect(plan.steps.map((s) => s.wave)).toEqual(['core', 'hero', 'limited'])
    expect(plan.steps.map((s) => s.weekOffset)).toEqual([0, 2, 5])
    for (const step of plan.steps) {
      for (const id of step.productIds) {
        const product = products.find((p) => p.id === id)!
        expect(step.runSizes[id]).toBeLessThanOrEqual(2 * product.pricing.minRun)
      }
    }
    expect(plan.firstRunTip).toContain("Order less than you think you'll sell")
  })

  it('adds an India season note by month', () => {
    expect(indiaSeasonNote(new Date('2026-10-05T00:00:00'))).toMatch(/festive season/i)
    expect(indiaSeasonNote(new Date('2026-07-15T00:00:00'))).toMatch(/monsoon/i)
    expect(indiaSeasonNote(new Date('2026-01-15T00:00:00'))).toBeUndefined()
    const plan = buildDropPlan(CATALOG.slice(0, 3).map((item): ProductProposal => ({
      id: item.id, name: item.name, oneLiner: 'x', category: item.category, role: 'core', silhouette: item.silhouette,
      fitScore: 50, scoreParts: { tag: 0, brand: 0, cross: 0 }, evidence: [], pricing: computePricing(item, 'mid'),
      supplierType: item.supplierType, supplierBrief: item.supplierBrief,
      description: { text: 'A test description long enough to pass.', version: 1, history: [], source: 'template' },
      decision: 'pending', image: { status: 'idle', attempts: 0, outdated: false },
    })))
    expect(typeof plan.seasonNote === 'string' || plan.seasonNote === undefined).toBe(true)
  })
})
