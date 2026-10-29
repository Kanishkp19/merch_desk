import { describe, expect, it } from 'vitest'
import { buildDropPlan } from '@/lib/score/drops'
import { computePricing, charm } from '@/lib/score/pricing'
import { BUDGET_RULES, firstRunCost, selectProducts } from '@/lib/score/rules'
import type { CatalogItem, ProductProposal } from '@/types'
import catalog from '@/data/catalog.json'

const CATALOG = catalog as CatalogItem[]

describe('pricing', () => {
  it('applies tier multipliers and clamps to the price range', () => {
    const sticker = CATALOG.find((c) => c.id === 'sticker-pack')!
    const budget = computePricing(sticker, 'budget')
    const premium = computePricing(sticker, 'premium')
    // unitCost = (0.25 + 0.6)/2 = 0.425 → budget 0.935 → clamped to range [4, 8] → 4
    expect(budget.price).toBe(4)
    // premium 1.49 → still clamped to 4
    expect(premium.price).toBe(4)
  })

  it('charms to nearest .00 or .50', () => {
    expect(charm(12.2)).toBe(12)
    expect(charm(12.3)).toBe(12.5)
    expect(charm(12.8)).toBe(13)
  })

  it('computes break-even or null beyond the min run', () => {
    const hoodie = CATALOG.find((c) => c.id === 'heavyweight-hoodie')!
    const p = computePricing(hoodie, 'mid')
    // unitCost 25 → price clamped to 65–90 range; firstRun = 40 + 24×25 = 640
    expect(p.firstRunCost).toBeCloseTo(640)
    expect(p.breakEvenUnits === null || p.breakEvenUnits <= hoodie.minRun).toBe(true)
  })

  it('marks everything as an estimate', () => {
    const p = computePricing(CATALOG[0], 'mid')
    expect(p.estimate).toBe(true)
  })
})

describe('selection rules', () => {
  const scored = (budget: 'small' | 'medium' | 'large') => {
    // even scores → deterministic ordering by id
    const list = CATALOG.map((item) => ({ item, fitScore: 50 }))
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
    expect(firstRunCost(tee)).toBeCloseTo(30 + 36 * 8)
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
})
