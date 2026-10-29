import { z } from 'zod'

/**
 * Launch economics input schema. All money is integer paise; rupee UI values are
 * converted at the boundary (rupeesToPaise). Costs are optional: an unknown cost
 * is `known: false` and is excluded from every total, then surfaced as an
 * unconfirmed item — it is never silently treated as zero.
 */

export const moneyPaise = z.number().int().min(0)
export const optionalMoneyPaise = z.object({
  known: z.boolean(),
  amount: moneyPaise.default(0),
})
export const percent = z.number().min(0).max(100)

export const launchLineItemSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  included: z.boolean().default(true),
  quantityOrdered: z.number().int().min(0).max(100000),
  sellPrice: moneyPaise,
  /** Supplier cost per unit. Known=true still means "estimate until a written quote". */
  unitCost: z.object({ known: z.boolean(), amount: moneyPaise.default(0) }),
  setupCost: z.object({ known: z.boolean(), amount: moneyPaise.default(0) }).default({ known: true, amount: 0 }),
  expectedSold: z.number().int().min(0),
  /** Indicative GST rate percent (0–28). Configurable; pre-filled from category rules. */
  gstRatePct: percent.default(18),
  artworkReady: z.boolean().default(false),
  note: z.string().max(500).optional(),
})
export type LaunchLineItem = z.infer<typeof launchLineItemSchema>

export const launchEconomicsInputSchema = z.object({
  lines: z.array(launchLineItemSchema).max(12),
  /** Are the sell prices quoted inclusive of GST? Consistent across the launch. */
  pricesIncludeGst: z.boolean().default(true),
  sampling: optionalMoneyPaise.default({ known: false, amount: 0 }),
  inboundFreight: optionalMoneyPaise.default({ known: false, amount: 0 }),
  packagingPerUnit: optionalMoneyPaise.default({ known: false, amount: 0 }),
  /** What the customer pays towards shipping (0 = you absorb it). */
  customerShippingPerUnit: moneyPaise.default(0),
  /** Your cost to ship one order. */
  outboundShippingPerUnit: optionalMoneyPaise.default({ known: false, amount: 0 }),
  paymentFeePct: percent.default(2),
  /** MerchDesk pilot planning fee — upfront, distinct from supplier payments. */
  planningFee: optionalMoneyPaise.default({ known: true, amount: 250000 }),
  /** Share of printed stock scrapped before sale (typical misprints/handling). */
  defectRatePct: percent.default(2),
})
export type LaunchEconomicsInput = z.infer<typeof launchEconomicsInputSchema>

export type ScenarioName = 'conservative' | 'base' | 'optimistic'

/** Multipliers applied to the creator's own sales guess. Inspectable, not predictive. */
export const SCENARIO_SOLD_MULTIPLIER: Record<ScenarioName, number> = {
  conservative: 0.6,
  base: 1,
  optimistic: 1.3,
}

export interface LineResult {
  productId: string
  name: string
  included: boolean
  quantityOrdered: number
  /** Ex-GST unit revenue actually received by the creator. */
  netPricePerUnit: number
  gstPerUnit: number
  /** contribution per sold unit after payment fees + net shipping/packaging. */
  contributionPerUnit: number
  contributionPerUnitKnown: boolean
  unitsSold: Record<ScenarioName, number>
  unsold: Record<ScenarioName, number>
  revenueExGst: Record<ScenarioName, number>
  contribution: Record<ScenarioName, number>
  inventoryCash: number
  capitalTiedInUnsold: Record<ScenarioName, number>
  gstRemitted: Record<ScenarioName, number>
  unverified: string[]
}

export interface EconomicsResult {
  lines: LineResult[]
  /** Full-batch inventory purchase + setup + known fixed costs. Excludes unknowns. */
  upfrontCash: number
  upfrontCashComplete: boolean
  fixedCosts: number
  fixedCostsComplete: boolean
  perScenario: Record<
    ScenarioName,
    {
      unitsSold: number
      revenueExGst: number
      variableCosts: number
      contribution: number
      finalProfit: number
      /** Profit if every unsold unit eventually sells at the same price. */
      profitIfAllSell: number
      unsoldUnits: number
      capitalTiedInUnsold: number
      gstRemitted: number
      /** Fixed costs + full-batch inventory + defect allowance (integer paise). */
      requiredCostsToRecover: number
      /** Aggregate break-even units under the launch's sales mix; null when impossible. */
      breakEvenUnits: number | null
      /** True when the weighted mix spans 2+ products — whole-unit sales can differ from the weighted average by a unit. */
      breakEvenApproximate: boolean
      /** Whether the assumed mix can sell that many units within each product's inventory. */
      breakEvenReachableInBatch: boolean
      /** Largest total-unit count the assumed mix can sell within the ordered stock. */
      mixFeasibleUnits: number
      breakEvenImpossibleReason?: string
    }
  >
  /** Sales-mix weights (expected sold share) behind the combined break-even figure. */
  salesMix: Array<{ productId: string; name: string; weight: number }>
  unconfirmed: Array<{ item: string; kind: 'cost' | 'assumption'; detail: string }>
  definitions: Array<{ metric: string; definition: string }>
}
