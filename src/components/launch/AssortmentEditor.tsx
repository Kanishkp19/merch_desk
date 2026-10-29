'use client'

import React from 'react'
import { Trash2, Plus, EyeOff, Eye, AlertTriangle } from 'lucide-react'
import type { LaunchPlan, LaunchLine } from '@/lib/launch/types'
import { MAX_LAUNCH_LINES } from '@/lib/launch/plan'
import { PILOT_CATALOG, catalogItem } from '@/lib/catalog/pilot'
import { indiaCost, gstRateFor, formatInr } from '@/lib/score/pricing'
import { formatPaise } from '@/lib/economics/engine'
import { Button } from '@/components/ui/Button'
import { UnitInput, MoneyInput } from './inputs'

/**
 * Assortment editor: 1–3 products, each with why-it-fits, tradeoffs, artwork
 * requirements and honest "lead time requires confirmation" labels.
 */
export function AssortmentEditor({
  plan,
  onLineChange,
  onRemoveLine,
  onAddLine,
  availableProducts,
}: {
  plan: LaunchPlan
  onLineChange: (productId: string, patch: Partial<LaunchLine>) => void
  onRemoveLine: (productId: string) => void
  onAddLine: (productId: string, source: 'manual') => void
  availableProducts: Array<{ id: string; name: string; fitScore: number; evidenceCount: number; role: string }>
}) {
  const includedCount = plan.lines.filter((l) => l.included).length
  const addable = availableProducts.filter((p) => !plan.lines.some((l) => l.productId === p.id))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {includedCount} of {MAX_LAUNCH_LINES} launch slots used. A focused 1–3 product drop keeps cash risk small.
        </p>
      </div>

      {plan.lines.length === 0 && (
        <div className="border-2 border-dashed border-ink rounded-md bg-paper-2 p-8 text-center">
          <h3 className="font-display uppercase text-lg">Empty launch</h3>
          <p className="text-sm text-ink-2 mt-1 mb-4">Add your first product below — start with the low-risk item.</p>
        </div>
      )}

      <ul className="space-y-4">
        {plan.lines.map((line) => {
          const conflict: string[] = []
          if (line.quantityOrdered < line.minRun) conflict.push(`Below the ${line.minRun}-unit minimum run for this product`)
          const item = catalogItem(line.productId)
          const firstRun = (item ? indiaCost(item).setupCost : line.setupCost) + line.quantityOrdered * line.unitCost
          return (
            <li key={line.productId} className={`border-2 rounded-md bg-paper-2 shadow-hard-sm ${line.included ? 'border-ink' : 'border-ink/40 opacity-70'}`}>
              <div className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg uppercase leading-tight">{line.name}</h3>
                    <p className="text-sm text-ink-2">{line.oneLiner}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      className="text-xs"
                      iconOnly
                      aria-label={line.included ? `Exclude ${line.name}` : `Include ${line.name}`}
                      onClick={() => onLineChange(line.productId, { included: !line.included })}
                    >
                      {line.included ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-xs"
                      iconOnly
                      aria-label={`Remove ${line.name} from the launch`}
                      onClick={() => onRemoveLine(line.productId)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                </div>

                {/* why it fits */}
                <div className="mt-3 grid md:grid-cols-2 gap-3 text-sm">
                  <div className="bg-paper border border-ink/20 rounded-sm p-3">
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1">Why this fits</p>
                    {line.evidence.length > 0 ? (
                      <>
                        <p className="text-ink-2">
                          Rules-based match: fit score <strong>{line.fitScore}</strong> from your audience tags —{' '}
                          {line.evidence.slice(0, 3).map((e) => e.label).join(', ')}.
                        </p>
                        <p className="text-xs text-mute mt-1">
                          {line.recommendationSource === 'ai_assisted'
                            ? 'Description is AI-assisted; selection is rules-based. No percentage confidence — this is evidence-linked, not a prediction.'
                            : 'Rules-based selection from evidence tags. No percentage confidence — this is evidence-linked, not a prediction.'}
                        </p>
                      </>
                    ) : (
                      <p className="text-ink-2">
                        Manually added — <strong>no audience evidence yet</strong>. Treat as an experiment.
                      </p>
                    )}
                  </div>
                  <div className="bg-paper border border-ink/20 rounded-sm p-3">
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1">Tradeoffs &amp; requirements</p>
                    <p className="text-ink-2">{line.supplierBrief}</p>
                    <ul className="text-xs text-mute mt-1 space-y-0.5">
                      <li>Lead time: requires supplier confirmation — none verified yet.</li>
                      <li>Artwork: {line.artworkReady ? 'marked ready (you can still be asked for print files)' : 'final print-ready files still needed'}.</li>
                      <li>Unit cost {formatPaise(line.unitCost)}/unit is a MerchDesk estimate — a written quote is required.</li>
                      {line.complianceNote && <li className="text-tomato-deep">⚠ {line.complianceNote}</li>}
                    </ul>
                  </div>
                </div>

                {/* editable row */}
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <UnitInput
                    id={`qty-${line.productId}`}
                    label={`Order quantity (min ${line.minRun})`}
                    value={line.quantityOrdered}
                    min={0}
                    onChange={(v) => onLineChange(line.productId, { quantityOrdered: v })}
                  />
                  <UnitInput
                    id={`sold-${line.productId}`}
                    label="Your sales guess (units)"
                    value={line.expectedSold}
                    min={0}
                    onChange={(v) => onLineChange(line.productId, { expectedSold: v })}
                  />
                  <MoneyInput
                    id={`lprice-${line.productId}`}
                    label="Sell price"
                    value={line.sellPrice}
                    onChange={(a) => onLineChange(line.productId, { sellPrice: a })}
                  />
                  <div>
                    <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5">First-run cash</p>
                    <p className="text-sm font-bold">{formatPaise(line.setupCost + line.quantityOrdered * line.unitCost)}</p>
                    <label className="flex items-center gap-1.5 text-xs mt-1">
                      <input
                        type="checkbox"
                        checked={line.artworkReady}
                        onChange={(e) => onLineChange(line.productId, { artworkReady: e.target.checked })}
                        className="h-3.5 w-3.5 accent-[var(--cobalt)]"
                      />
                      Artwork ready
                    </label>
                  </div>
                </div>

                {conflict.length > 0 && (
                  <p className="mt-3 text-sm text-tomato-deep font-medium flex items-start gap-2" role="alert">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                    {conflict.join(' · ')} — raise the quantity or pick a different product.
                  </p>
                )}
                {firstRun > 0 && line.expectedSold > 0 && line.expectedSold < line.quantityOrdered && (
                  <p className="mt-2 text-xs text-mute">
                    At your guess, {line.quantityOrdered - line.expectedSold} unit(s) would stay unsold — ₹
                    {formatInr(((line.quantityOrdered - line.expectedSold) * line.unitCost) / 100)} of stock you paid for.
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* alternatives / add */}
      <section aria-labelledby="add-h">
        <h3 id="add-h" className="font-display text-lg uppercase mb-2">
          {plan.lines.length >= MAX_LAUNCH_LINES ? 'Replace a product to add another' : 'Add a product'}
        </h3>
        <p className="text-sm text-ink-2 mb-3">
          {availableProducts.length > 0
            ? 'From your recommendation run (rules-based, evidence-linked):'
            : 'No recommendation run found — pick from the pilot catalog (manually added, no audience evidence attached):'}
        </p>
        {plan.lines.length >= MAX_LAUNCH_LINES ? (
          <p className="text-sm text-mute">Remove or exclude a product first — the pilot keeps launches to {MAX_LAUNCH_LINES} products.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(addable.length > 0
              ? addable.map((p) => ({ id: p.id, name: p.name, note: `fit ${p.fitScore} · ${p.evidenceCount} evidence link${p.evidenceCount === 1 ? '' : 's'}` }))
              : PILOT_CATALOG.filter((c) => !plan.lines.some((l) => l.productId === c.id))
                  .slice(0, 9)
                  .map((c) => ({ id: c.id, name: c.name, note: `min ${c.minRun} units · ${formatInr(c.unitCost[0])}–${formatInr(c.unitCost[1])}/unit est.` }))
            ).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onAddLine(p.id, 'manual')}
                  className="w-full text-left border-2 border-ink rounded-sm bg-paper hover:bg-acid transition p-3"
                >
                  <span className="flex items-center gap-2 font-display uppercase text-sm">
                    <Plus className="h-4 w-4 shrink-0" aria-hidden /> {p.name}
                  </span>
                  <span className="text-xs text-mute mt-0.5 block">{p.note}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
