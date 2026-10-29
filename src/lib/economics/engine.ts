import { z } from 'zod'
import type {
  EconomicsResult,
  LaunchEconomicsInput,
  LaunchLineItem,
  LineResult,
  ScenarioName,
} from './schema'
import { SCENARIO_SOLD_MULTIPLIER, launchEconomicsInputSchema } from './schema'

export const SCENARIOS: ScenarioName[] = ['conservative', 'base', 'optimistic']

export const rupeesToPaise = (r: number): number => Math.round(r * 100)
export const paiseToRupees = (p: number): number => Math.round(p) / 100

/** INR display for paise: whole rupees unless a paise remainder exists. */
export function formatPaise(p: number): string {
  const rupees = p / 100
  const hasPaise = Math.round(p) % 100 !== 0
  return `₹${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(rupees)}`
}

/** Sold units for a scenario: multiplier on the creator's guess, capped by sellable stock. */
function soldFor(line: LaunchLineItem, scenario: ScenarioName): number {
  const raw = Math.round(line.expectedSold * SCENARIO_SOLD_MULTIPLIER[scenario])
  return Math.max(0, Math.min(line.quantityOrdered, raw))
}

/**
 * Launch economics engine (pure).
 *
 * Metric definitions (also returned for UI display):
 *  - Upfront cash: full-batch inventory purchase (every ordered unit, sold or not)
 *    + setup + sampling + inbound freight + planning fee, known items only.
 *  - Contribution (scenario): ex-GST revenue − payment fees − net shipping/packaging
 *    − defect allowance. Variable costs only; no fixed costs, no inventory purchase.
 *  - Final profit (scenario): contribution − fixed costs − full-batch inventory cost.
 *    The batch is expensed exactly once; unsold stock is treated as worthless here.
 *  - Profit if all sell: same but assumes unsold stock sells later at the same price.
 *  - Break-even units: fixed costs ÷ weighted contribution per unit (sales mix =
 *    the creator's expected sold split). Null when any sold unit loses money or a
 *    needed cost is unknown.
 */
export function computeLaunchEconomics(rawInput: LaunchEconomicsInput | z.input<typeof launchEconomicsInputSchema>): EconomicsResult {
  const input = launchEconomicsInputSchema.parse(rawInput)
  const lines = input.lines.filter((l) => l.included)
  const unconfirmed: EconomicsResult['unconfirmed'] = []

  const lineResults: LineResult[] = lines.map((line) => {
    const gstPerUnit = input.pricesIncludeGst
      ? Math.round((line.sellPrice * line.gstRatePct) / (100 + line.gstRatePct))
      : Math.round((line.sellPrice * line.gstRatePct) / 100)
    const netPricePerUnit = line.sellPrice - (input.pricesIncludeGst ? gstPerUnit : 0)

    const netShippingPerUnit =
      (input.outboundShippingPerUnit.known ? input.outboundShippingPerUnit.amount : 0) +
      (input.packagingPerUnit.known ? input.packagingPerUnit.amount : 0) -
      input.customerShippingPerUnit

    const lineUnverified: string[] = []
    if (!line.unitCost.known) {
      lineUnverified.push('Supplier unit cost not confirmed — inventory cash and profit exclude it')
      unconfirmed.push({ item: line.name, kind: 'cost', detail: 'Supplier unit cost (estimate unconfirmed)' })
    }
    if (!line.setupCost.known) {
      lineUnverified.push('Setup cost unknown')
      unconfirmed.push({ item: line.name, kind: 'cost', detail: 'Print/embroidery setup cost' })
    }
    if (!line.artworkReady) {
      lineUnverified.push('Final artwork not ready')
      unconfirmed.push({ item: line.name, kind: 'assumption', detail: 'Final print-ready artwork' })
    }
    unconfirmed.push({
      item: line.name,
      kind: 'assumption',
      detail: `Expected sales (${line.expectedSold} units) are your own untested guess; GST rate ${line.gstRatePct}% is indicative, confirm with a CA`,
    })

    const contributionPerUnit = netPricePerUnit - netShippingPerUnit - Math.round((netPricePerUnit * input.paymentFeePct) / 100)
    const contributionPerUnitKnown =
      input.outboundShippingPerUnit.known && input.packagingPerUnit.known

    const unitsSold = {} as Record<ScenarioName, number>
    const unsold = {} as Record<ScenarioName, number>
    const revenueExGst = {} as Record<ScenarioName, number>
    const contribution = {} as Record<ScenarioName, number>
    const capitalTiedInUnsold = {} as Record<ScenarioName, number>
    const gstRemitted = {} as Record<ScenarioName, number>

    const inventoryCash = line.unitCost.known ? line.quantityOrdered * line.unitCost.amount : 0

    for (const s of SCENARIOS) {
      const sold = soldFor(line, s)
      unitsSold[s] = sold
      unsold[s] = line.quantityOrdered - sold
      revenueExGst[s] = sold * netPricePerUnit
      gstRemitted[s] = sold * gstPerUnit
      const defectCost = Math.round((inventoryCash * input.defectRatePct) / 100)
      contribution[s] = sold * contributionPerUnit - defectCost
      capitalTiedInUnsold[s] = line.unitCost.known ? unsold[s] * line.unitCost.amount : 0
    }

    return {
      productId: line.productId,
      name: line.name,
      included: line.included,
      quantityOrdered: line.quantityOrdered,
      netPricePerUnit,
      gstPerUnit,
      contributionPerUnit,
      contributionPerUnitKnown,
      unitsSold,
      unsold,
      revenueExGst,
      contribution,
      inventoryCash,
      capitalTiedInUnsold,
      gstRemitted,
      unverified: lineUnverified,
    }
  })

  const inventoryCashTotal = sum(lineResults.map((l) => l.inventoryCash))
  const setupTotal = sum(lines.map((l) => (l.setupCost.known ? l.setupCost.amount : 0)))
  const anySetupUnknown = lines.some((l) => !l.setupCost.known)
  if (anySetupUnknown) unconfirmed.push({ item: 'Launch', kind: 'cost', detail: 'Setup cost for at least one product' })
  if (!input.sampling.known) unconfirmed.push({ item: 'Launch', kind: 'cost', detail: 'Sample cost (recommended before production)' })
  if (!input.inboundFreight.known) unconfirmed.push({ item: 'Launch', kind: 'cost', detail: 'Inbound freight from supplier' })
  if (!input.packagingPerUnit.known) unconfirmed.push({ item: 'Launch', kind: 'cost', detail: 'Packaging cost per order' })
  if (!input.outboundShippingPerUnit.known) unconfirmed.push({ item: 'Launch', kind: 'cost', detail: 'Outbound shipping cost per order' })

  const fixedKnown =
    setupTotal +
    (input.sampling.known ? input.sampling.amount : 0) +
    (input.inboundFreight.known ? input.inboundFreight.amount : 0) +
    (input.planningFee.known ? input.planningFee.amount : 0)
  const fixedComplete = !anySetupUnknown && input.sampling.known && input.inboundFreight.known && input.planningFee.known

  const upfrontCash = inventoryCashTotal + fixedKnown
  const upfrontComplete =
    fixedComplete && lines.every((l) => l.unitCost.known) && lines.length > 0

  const salesMixWeights = mixWeights(lines)
  const weightedContribution = sum(lineResults.map((l, i) => l.contributionPerUnit * (salesMixWeights[i]?.weight ?? 0)))
  const contributionKnown = lineResults.every((l) => l.contributionPerUnitKnown) && lines.every((l) => l.unitCost.known)

  const perScenario = {} as EconomicsResult['perScenario']
  for (const s of SCENARIOS) {
    const unitsSold = sum(lineResults.map((l) => l.unitsSold[s]))
    const revenueExGst = sum(lineResults.map((l) => l.revenueExGst[s]))
    const contribution = sum(lineResults.map((l) => l.contribution[s]))
    // revenue − contribution = payment fees + net shipping/packaging + defect allowance
    const variableCosts = revenueExGst - contribution
    const finalProfit = contribution - fixedKnown - inventoryCashTotal
    const unsoldUnits = sum(lineResults.map((l) => l.unsold[s]))
    const capitalTiedInUnsold = sum(lineResults.map((l) => l.capitalTiedInUnsold[s]))

    let breakEvenUnits: number | null
    let breakEvenImpossibleReason: string | undefined
    if (!contributionKnown) {
      breakEvenUnits = null
      breakEvenImpossibleReason = 'Some per-order costs or supplier costs are unknown — break-even needs them.'
    } else if (weightedContribution <= 0) {
      breakEvenUnits = null
      breakEvenImpossibleReason =
        weightedContribution === 0
          ? 'Each sale brings in exactly what it costs — no finite break-even exists.'
          : 'Each sale loses money after fees and shipping — selling more increases losses. Raise the price or cut per-order costs.'
    } else {
      breakEvenUnits = Math.ceil(fixedKnown / weightedContribution) + Math.ceil(inventoryCashTotal / weightedContribution)
    }

    perScenario[s] = {
      unitsSold,
      revenueExGst,
      variableCosts,
      contribution,
      finalProfit,
      profitIfAllSell:
        sum(lineResults.map((l) => l.quantityOrdered * l.contributionPerUnit)) -
        Math.round((inventoryCashTotal * input.defectRatePct) / 100) -
        fixedKnown -
        inventoryCashTotal,
      unsoldUnits,
      capitalTiedInUnsold,
      gstRemitted: sum(lineResults.map((l) => l.gstRemitted[s])),
      breakEvenUnits,
      breakEvenReachableInBatch:
        breakEvenUnits !== null && breakEvenUnits <= sum(lines.map((l) => l.quantityOrdered)),
      breakEvenImpossibleReason,
    }
  }

  return {
    lines: lineResults,
    upfrontCash,
    upfrontCashComplete: upfrontComplete,
    fixedCosts: fixedKnown,
    fixedCostsComplete: fixedComplete,
    perScenario,
    salesMix: salesMixWeights.map((w, i) => ({ productId: lines[i].productId, name: lines[i].name, weight: w.weight })),
    unconfirmed,
    definitions: METRIC_DEFINITIONS,
  }
}

function sum(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0)
}

/** Sales mix = each product's share of the creator's expected unit sales (base scenario). */
function mixWeights(lines: LaunchLineItem[]): Array<{ weight: number }> {
  const total = sum(lines.map((l) => l.expectedSold))
  if (total <= 0) {
    return lines.map(() => ({ weight: lines.length > 0 ? 1 / lines.length : 0 }))
  }
  return lines.map((l) => ({ weight: l.expectedSold / total }))
}

export const METRIC_DEFINITIONS: Array<{ metric: string; definition: string }> = [
  {
    metric: 'Upfront cash',
    definition:
      'Money you pay before selling anything: the full batch order (every unit, sold or not) plus setup, sampling, inbound freight and the MerchDesk planning fee. Unknown costs are excluded, not guessed.',
  },
  {
    metric: 'Revenue (ex-GST)',
    definition:
      'What customers pay you, minus the GST you remit. If prices are GST-inclusive, the GST portion inside the price is shown separately — it was never your margin.',
  },
  {
    metric: 'Contribution',
    definition:
      'Revenue minus costs that change with each sale: payment fees, net shipping and packaging, plus a defect allowance. Fixed costs are not subtracted yet.',
  },
  {
    metric: 'Final profit (this batch)',
    definition:
      'Contribution minus fixed costs minus the full-batch inventory cost. Unsold stock is counted as bought and unsold — the honest cash outcome if nothing sells later.',
  },
  {
    metric: 'Profit if all sell',
    definition:
      'Same accounting, but assumes unsold stock eventually sells at the same price. The batch inventory cost is still counted exactly once.',
  },
  {
    metric: 'Break-even units',
    definition:
      'Fixed costs plus batch inventory cost, divided by the average contribution per unit under your expected sales mix across products. A combined figure — the mix is shown above.',
  },
  {
    metric: 'Capital tied in unsold stock',
    definition: 'What you paid suppliers for units still sitting in your hands at the end of the scenario.',
  },
]
