'use client'

import React from 'react'
import { AlertTriangle } from 'lucide-react'
import type { LaunchPlan } from '@/lib/launch/types'
import { planEconomics } from '@/lib/launch/checklist'
import { formatPaise, SCENARIOS } from '@/lib/economics/engine'
import type { ScenarioName } from '@/lib/economics/schema'
import { MoneyInput, OptionalCost, PercentInput } from './inputs'

const SCENARIO_HINT: Record<ScenarioName, string> = {
  conservative: '60% of your sales guess — the downside you must survive',
  base: 'Your sales guess, unchanged',
  optimistic: '130% of your guess, capped by the stock you ordered',
}

export function EconomicsPanel({
  plan,
  onEconomicsChange,
  onLineChange,
}: {
  plan: LaunchPlan
  onEconomicsChange: (patch: Partial<LaunchPlan['economics']> & { pricesIncludeGst?: boolean }) => void
  onLineChange: (productId: string, patch: Partial<LaunchPlan['lines'][number]>) => void
}) {
  const { input, result } = planEconomics(plan)
  const [showDefs, setShowDefs] = React.useState(false)

  if (result.lines.length === 0) {
    return (
      <div className="border-2 border-dashed border-ink rounded-md bg-paper-2 p-8 text-center">
        <h3 className="font-display uppercase text-lg">No products in the launch yet</h3>
        <p className="text-sm text-ink-2 mt-1">Add 1–3 products in the Assortment tab to see the economics.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* headline numbers */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="border-2 border-ink rounded-md bg-paper-2 shadow-hard p-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1">Cash needed upfront</h3>
          <p className="font-display text-3xl leading-tight">
            {formatPaise(result.upfrontCash)}
            {result.upfrontCashComplete ? '' : '+'}
          </p>
          <p className="text-xs text-mute mt-2">
            Full batch order + setup + sampling + freight + ₹2,500 planning fee{result.upfrontCashComplete ? '' : ' — some costs unknown, marked below'}
          </p>
        </div>
        <div className="border-2 border-ink rounded-md bg-paper-2 shadow-hard p-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1">If sales disappoint</h3>
          <p className="font-display text-3xl leading-tight">{formatPaise(result.perScenario.conservative.finalProfit)}</p>
          <p className="text-xs text-mute mt-2">
            Conservative outcome: {result.perScenario.conservative.unitsSold} units sold, {result.perScenario.conservative.unsoldUnits} unsold
          </p>
        </div>
        <div className="border-2 border-ink rounded-md bg-paper-2 shadow-hard p-4">
          <h3 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1">Break-even</h3>
          <p className="font-display text-3xl leading-tight">
            {result.perScenario.base.breakEvenUnits === null ? '—' : `${result.perScenario.base.breakEvenUnits} units`}
          </p>
          <p className="text-xs text-mute mt-2">
            {result.perScenario.base.breakEvenUnits === null
              ? result.perScenario.base.breakEvenImpossibleReason
              : result.perScenario.base.breakEvenReachableInBatch
                ? `Recoverable within your stock under the assumed mix (mix can sell up to ${result.perScenario.base.mixFeasibleUnits} units)`
                : `Not reachable: the assumed mix can only sell ${result.perScenario.base.mixFeasibleUnits} of the units you ordered — order more stock, reprice, or change the mix`}
          </p>
        </div>
      </div>

      {/* unconfirmed */}
      {result.unconfirmed.length > 0 && (
        <div className="bg-amber/30 border-2 border-dashed border-ink rounded-md p-4" role="note">
          <p className="font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Not yet confirmed ({result.unconfirmed.length})
          </p>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {result.unconfirmed.map((u, i) => (
              <li key={i}>
                <span className="font-medium">{u.item}:</span> {u.detail}
              </li>
            ))}
          </ul>
          <p className="text-xs text-mute mt-2">Unknown costs are excluded from totals — never counted as zero.</p>
        </div>
      )}

      {/* scenarios */}
      <section aria-labelledby="scenarios-h">
        <h3 id="scenarios-h" className="font-display text-xl uppercase mb-3">Three scenarios</h3>
        <div className="overflow-x-auto border-2 border-ink rounded-md bg-paper-2">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-ink text-left font-mono text-xs uppercase tracking-widest text-ink-2">
                <th className="p-3">Metric</th>
                {SCENARIOS.map((s) => (
                  <th key={s} className="p-3">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ['Units sold', (s: ScenarioName) => String(result.perScenario[s].unitsSold)],
                  ['Revenue after GST', (s: ScenarioName) => formatPaise(result.perScenario[s].revenueExGst)],
                  ['Contribution', (s: ScenarioName) => formatPaise(result.perScenario[s].contribution)],
                  ['Final profit (this batch)', (s: ScenarioName) => formatPaise(result.perScenario[s].finalProfit)],
                  ['Profit if unsold stock sells later', (s: ScenarioName) => formatPaise(result.perScenario[s].profitIfAllSell)],
                  ['Unsold units', (s: ScenarioName) => String(result.perScenario[s].unsoldUnits)],
                  ['Capital tied in unsold stock', (s: ScenarioName) => formatPaise(result.perScenario[s].capitalTiedInUnsold)],
                  ['GST to remit (est.)', (s: ScenarioName) => formatPaise(result.perScenario[s].gstRemitted)],
                ] as Array<[string, (s: ScenarioName) => string]>
              ).map(([label, fn], i) => (
                <tr key={label} className={i % 2 === 0 ? '' : 'bg-paper'}>
                  <th scope="row" className="p-3 text-left font-medium text-ink-2 whitespace-nowrap">{label}</th>
                  {SCENARIOS.map((s) => (
                    <td key={s} className="p-3">{fn(s)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-mute mt-2">{SCENARIOS.map((s) => `${s}: ${SCENARIO_HINT[s]}`).join(' · ')}</p>
        {result.perScenario.base.breakEvenUnits !== null && (
          <p className="text-xs text-ink-2 mt-2">
            Sales mix behind the combined break-even: {result.salesMix.map((m) => `${m.name} ${(m.weight * 100).toFixed(0)}%`).join(', ')} (from your expected sales split).
            {result.perScenario.base.breakEvenApproximate
              ? ' Approximate: real sales are whole units per product, so the exact units-to-break-even can differ by a unit from this weighted average — the per-product stock check (above) is computed against actual stock, not this average.'
              : ''}
          </p>
        )}
      </section>

      {/* editable inputs */}
      <section aria-labelledby="assump-h">
        <h3 id="assump-h" className="font-display text-xl uppercase mb-3">Change the assumptions</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-ink-2">Launch-level costs</h4>
            <OptionalCost
              label="Sampling cost (one sample round)"
              id="sampling"
              known={input.sampling.known}
              amount={input.sampling.amount}
              onKnown={(k) => onEconomicsChange({ sampling: { ...input.sampling, known: k } })}
              onAmount={(a) => onEconomicsChange({ sampling: { known: true, amount: a } })}
              hint="Strongly recommended before full production."
            />
            <OptionalCost
              label="Inbound freight (supplier → you)"
              id="freight"
              known={input.inboundFreight.known}
              amount={input.inboundFreight.amount}
              onKnown={(k) => onEconomicsChange({ inboundFreight: { ...input.inboundFreight, known: k } })}
              onAmount={(a) => onEconomicsChange({ inboundFreight: { known: true, amount: a } })}
            />
            <OptionalCost
              label="Packaging per order"
              id="packaging"
              known={input.packagingPerUnit.known}
              amount={input.packagingPerUnit.amount}
              onKnown={(k) => onEconomicsChange({ packagingPerUnit: { ...input.packagingPerUnit, known: k } })}
              onAmount={(a) => onEconomicsChange({ packagingPerUnit: { known: true, amount: a } })}
            />
            <OptionalCost
              label="Outbound shipping per order"
              id="outbound"
              known={input.outboundShippingPerUnit.known}
              amount={input.outboundShippingPerUnit.amount}
              onKnown={(k) => onEconomicsChange({ outboundShippingPerUnit: { ...input.outboundShippingPerUnit, known: k } })}
              onAmount={(a) => onEconomicsChange({ outboundShippingPerUnit: { known: true, amount: a } })}
            />
            <MoneyInput
              id="custship"
              label="What the customer pays towards shipping"
              value={input.customerShippingPerUnit}
              onChange={(a) => onEconomicsChange({ customerShippingPerUnit: a })}
            />
            <OptionalCost
              label="MerchDesk planning fee (pilot experiment — ₹2,500)"
              id="fee"
              known={input.planningFee.known}
              amount={input.planningFee.amount}
              onKnown={(k) => onEconomicsChange({ planningFee: { ...input.planningFee, known: k } })}
              onAmount={(a) => onEconomicsChange({ planningFee: { known: true, amount: a } })}
              hint="Upfront service fee — separate from any money you pay suppliers. Price is an experiment, not a market fact."
            />
            <div className="grid grid-cols-2 gap-3">
              <PercentInput id="payfee" label="Payment fee" value={input.paymentFeePct} onChange={(v) => onEconomicsChange({ paymentFeePct: v })} />
              <PercentInput id="defect" label="Defect / spoilage allowance" value={input.defectRatePct} onChange={(v) => onEconomicsChange({ defectRatePct: v })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={plan.pricesIncludeGst}
                onChange={(e) => onEconomicsChange({ pricesIncludeGst: e.target.checked })}
                className="h-4 w-4 accent-[var(--cobalt)]"
              />
              Sell prices include GST (the GST portion is shown separately and never counted as margin)
            </label>
            <p className="text-xs text-mute">
              GST rates are indicative planning figures (apparel ≤₹2,500: 5%, above: 18%, printed zines exempt, most other goods 18% —
              per the Sep 2025 rate changes). Confirm HSN-specific rates with a CA before invoicing.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="font-mono text-xs uppercase tracking-widest text-ink-2">Per-product</h4>
            {plan.lines.filter((l) => l.included).map((l) => (
              <div key={l.productId} className="border-2 border-ink rounded-sm p-3 bg-paper space-y-3">
                <p className="font-display uppercase text-sm">{l.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <MoneyInput
                    id={`price-${l.productId}`}
                    label="Sell price"
                    value={l.sellPrice}
                    onChange={(a) => onLineChange(l.productId, { sellPrice: a })}
                  />
                  <MoneyInput
                    id={`setup-${l.productId}`}
                    label="Setup cost (est.)"
                    value={l.setupCost}
                    onChange={(a) => onLineChange(l.productId, { setupCost: a })}
                  />
                </div>
                <p className="text-xs text-mute">
                  Supplier unit cost: ₹{(l.unitCost / 100).toFixed(0)} — an unconfirmed estimate until a written quote lands in the operator queue.
                </p>
              </div>
            ))}
            <p className="text-xs text-mute">
              Quantity ordered and expected sales per product are edited in the Assortment tab.
            </p>
          </div>
        </div>
      </section>

      {/* definitions */}
      <section aria-labelledby="defs-h">
        <button type="button" onClick={() => setShowDefs((v) => !v)} aria-expanded={showDefs} className="font-display uppercase text-sm underline underline-offset-4">
          {showDefs ? 'Hide' : 'Show'} what each number means
        </button>
        {showDefs && (
          <dl className="mt-3 space-y-2 border-2 border-ink rounded-md bg-paper-2 p-4 text-sm">
            {result.definitions.map((d) => (
              <div key={d.metric}>
                <dt className="font-bold">{d.metric}</dt>
                <dd className="text-ink-2">{d.definition}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  )
}
