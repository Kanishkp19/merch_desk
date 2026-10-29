import type { CatalogItem, PriceTier, Pricing } from '@/types'

const TIER_MULT: Record<PriceTier, number> = { budget: 2.2, mid: 2.8, premium: 3.5 }

export function meanUnitCost(item: CatalogItem): number {
  return (item.unitCost[0] + item.unitCost[1]) / 2
}

/** Charm price — nearest .00 or .50. */
export function charm(n: number): number {
  const steps = [0, 0.5, 1]
  const lower = Math.floor(n)
  let best = lower
  let bestDiff = Infinity
  for (const s of steps) {
    const candidate = lower + s
    const diff = Math.abs(candidate - n)
    if (diff < bestDiff - 1e-9) {
      bestDiff = diff
      best = candidate
    }
  }
  return Math.round(best * 100) / 100
}

export function computePricing(item: CatalogItem, priceTier: PriceTier): Pricing {
  const unitCost = meanUnitCost(item)
  const mult = TIER_MULT[priceTier]
  const raw = unitCost * mult
  const price = charm(Math.max(item.priceRange[0], Math.min(item.priceRange[1], raw)))
  const marginPerUnit = Math.round((price - unitCost) * 100) / 100
  const firstRunCost = Math.round((item.setupCost + item.minRun * unitCost) * 100) / 100
  const breakEvenUnits = firstRunCost / price
  return {
    unitCost: Math.round(unitCost * 100) / 100,
    price,
    marginPerUnit,
    minRun: item.minRun,
    setupCost: item.setupCost,
    firstRunCost,
    breakEvenUnits: breakEvenUnits > item.minRun ? null : Math.ceil(breakEvenUnits),
    typicalRange: item.priceRange,
    estimate: true,
  }
}

export function formatUsd(n: number): string {
  return `$${n.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}`
}
