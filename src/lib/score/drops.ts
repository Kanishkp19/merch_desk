import type { ProductProposal, DropPlan, DropStep } from '@/types'

export const FIRST_RUN_TIP = "Order less than you think you'll sell — a sell-out creates demand."

/**
 * India seasonality for drop timing (month is 0-based). Pure in `now` so tests stay
 * deterministic. These are planning hints around Indian retail rhythms, not dates.
 */
export function indiaSeasonNote(now: Date = new Date()): string | undefined {
  const m = now.getMonth()
  if (m >= 8 && m <= 10) return 'Festive season (Navratri → Diwali) — gifting demand peaks; consider pre-orders before mid-October.'
  if (m === 11) return 'December — year-end gig season and the Chennai music season; theatre and live-venue drops land well.'
  if (m >= 5 && m <= 8) return 'Monsoon months — favour indoor launch partners (bookshops, cafés) over open-air pop-ups.'
  return undefined
}

/**
 * Drop plan (02-TRD → drops.ts):
 *   Wave 1 · Core (Week 0) — all core products
 *   Wave 2 · Hero pre-order (Week 2)
 *   Wave 3 · Limited (Week 5) — numbered edition
 * Run size = minRun, never above 2 × minRun.
 */
export function buildDropPlan(products: ProductProposal[]): DropPlan {
  const steps: DropStep[] = []

  const core = products.filter((p) => p.role === 'core')
  const hero = products.filter((p) => p.role === 'hero')
  const limited = products.filter((p) => p.role === 'limited')

  const runSizeFor = (p: ProductProposal) => Math.min(p.pricing.minRun * 2, p.pricing.minRun)

  if (core.length > 0) {
    steps.push({
      wave: 'core',
      weekOffset: 0,
      productIds: core.map((p) => p.id),
      runSizes: Object.fromEntries(core.map((p) => [p.id, runSizeFor(p)])),
      note: 'Launch the reliable sellers first — smallest cash at risk.',
    })
  }
  if (hero.length > 0) {
    steps.push({
      wave: 'hero',
      weekOffset: 2,
      productIds: hero.map((p) => p.id),
      runSizes: Object.fromEntries(hero.map((p) => [p.id, runSizeFor(p)])),
      note: 'Take pre-orders for the statement piece — gauge demand before the print run.',
    })
  }
  if (limited.length > 0) {
    steps.push({
      wave: 'limited',
      weekOffset: 5,
      productIds: limited.map((p) => p.id),
      runSizes: Object.fromEntries(limited.map((p) => [p.id, runSizeFor(p)])),
      note: 'Numbered edition. Scarce by design — one run, then gone.',
    })
  }

  return { steps, firstRunTip: FIRST_RUN_TIP, seasonNote: indiaSeasonNote() }
}
