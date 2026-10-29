import type { CatalogItem, PriceTier, Pricing } from '@/types'

const TIER_MULT: Record<PriceTier, number> = { budget: 2.2, mid: 2.8, premium: 3.5 }

// Indicative India pilot costs in INR; validate with a local supplier before ordering.
// [unit low, unit high, setup, retail low, retail high]
const INDIA_COSTS: Record<string, [number, number, number, number, number]> = {
  'sticker-pack': [40, 75, 0, 99, 199],
  'enamel-pin-set': [90, 180, 2500, 399, 699],
  'embroidered-cap': [250, 400, 1200, 799, 1299],
  'heavyweight-tee': [380, 520, 1200, 699, 1199],
  'hero-crewneck': [650, 1000, 1500, 1799, 2999],
  'heavyweight-hoodie': [800, 1300, 1500, 2199, 3499],
  'tote-bag': [200, 320, 800, 349, 599],
  'poster-print': [40, 90, 0, 199, 499],
  zine: [110, 200, 0, 199, 399],
  'cassette-usb': [250, 450, 1200, 899, 1499],
  'enamel-camp-mug': [240, 380, 1200, 599, 999],
  'custom-socks': [180, 300, 1500, 499, 899],
  'acrylic-keychain': [60, 120, 800, 249, 499],
  'playing-cards': [160, 300, 1500, 499, 999],
  'coffee-collab': [200, 350, 1500, 599, 999],
  'patch-set': [70, 140, 1200, 299, 599],
  bandana: [130, 230, 900, 399, 799],
}

export function indiaCost(item: CatalogItem) {
  const values = INDIA_COSTS[item.id]
  if (!values) throw new Error(`No India pilot price for ${item.id}`)
  return { unitCost: [values[0], values[1]] as [number, number], setupCost: values[2], priceRange: [values[3], values[4]] as [number, number] }
}

export function meanUnitCost(item: CatalogItem): number {
  const { unitCost } = indiaCost(item)
  return (unitCost[0] + unitCost[1]) / 2
}

/**
 * Indicative GST for Indian retail merch, by category. Updated 29 Oct 2026 for
 * the GST 2.0 two-slab structure (Notifications 9/2025 & 13/2025-Central Tax
 * (Rate), effective 22 Sep 2025): apparel/footwear sells at 5% up to ₹2,500 a
 * piece and 18% above; printed books/zines stay exempt; most other goods sit at
 * 18%. These are planning rates only — the HSN-specific rate and the creator's
 * registration position must be confirmed with a CA or the supplier before
 * invoicing.
 */
export function gstRateFor(item: CatalogItem, price: number): number {
  if (item.category === 'apparel') return price <= 2500 ? 0.05 : 0.18
  if (item.category === 'print' && item.id === 'zine') return 0
  return 0.18
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
  const { setupCost, priceRange } = indiaCost(item)
  const unitCost = meanUnitCost(item)
  const mult = TIER_MULT[priceTier]
  const raw = unitCost * mult
  const price = Math.round(Math.max(priceRange[0], Math.min(priceRange[1], raw)) / 10) * 10
  const marginPerUnit = Math.round((price - unitCost) * 100) / 100
  const firstRunCost = Math.round(setupCost + item.minRun * unitCost)
  // simple per-product break-even: fixed first-run cost ÷ contribution per unit
  // (ex-GST price − unit cost). Null when a sale brings in nothing or the batch
  // can't cover it — the launch workspace models the full picture.
  const breakEvenRaw = marginPerUnit > 0 ? firstRunCost / marginPerUnit : null
  const breakEvenUnits = breakEvenRaw === null || breakEvenRaw > item.minRun ? null : Math.ceil(breakEvenRaw)
  const gstRate = gstRateFor(item, price)
  return {
    unitCost: Math.round(unitCost * 100) / 100,
    price,
    marginPerUnit,
    minRun: item.minRun,
    setupCost,
    firstRunCost,
    breakEvenUnits,
    typicalRange: priceRange,
    gstRate,
    priceInclGst: Math.round(price * (1 + gstRate)),
    estimate: true,
  }
}

export function formatInr(n: number): string {
  const hasFraction = Math.abs(n - Math.round(n)) > 1e-9
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n)}`
}
