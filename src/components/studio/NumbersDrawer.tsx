'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import type { ProductProposal } from '@/types'
import { Drawer } from '@/components/ui/Drawer'
import { formatInr } from '@/lib/score/pricing'

export interface NumbersDrawerProps {
  product: ProductProposal | null
  onClose: () => void
}

export function NumbersDrawer({ product, onClose }: NumbersDrawerProps) {
  const [copied, setCopied] = useState(false)
  if (!product) return null
  const p = product.pricing

  const rows: Array<{ key: string; label: string; value: React.ReactNode }> = [
    { key: 'price', label: 'Price', value: <span className="font-display text-xl">{formatInr(p.price)}</span> },
    { key: 'unitCost', label: 'Unit cost', value: formatInr(p.unitCost) },
    { key: 'margin', label: 'Margin per unit', value: <span className="text-leaf font-bold">{formatInr(p.marginPerUnit)}</span> },
    { key: 'setup', label: 'Setup cost', value: p.setupCost === 0 ? 'None' : formatInr(p.setupCost) },
    { key: 'minRun', label: 'Minimum run', value: `${p.minRun} units` },
    { key: 'firstRun', label: 'First-run cost', value: <span className="font-bold">{formatInr(p.firstRunCost)}</span> },
    {
      key: 'breakEven',
      label: 'Break-even units',
      value:
        p.breakEvenUnits === null ? (
          <span className="text-mute">Not reached within the minimum run</span>
        ) : (
          <span>
            {p.breakEvenUnits} units <span className="text-mute">(of {p.minRun})</span>
          </span>
        ),
    },
    { key: 'range', label: 'Typical retail range', value: `${formatInr(p.typicalRange[0])}–${formatInr(p.typicalRange[1])}` },
    {
      key: 'gst',
      label: 'Retail incl. GST (est.)',
      value: (
        <span>
          {formatInr(p.priceInclGst)}{' '}
          <span className="text-mute">
            {p.gstRate === 0 ? '(GST-exempt)' : `(at ${Math.round(p.gstRate * 100)}%)`}
          </span>
        </span>
      ),
    },
  ]

  const copyBrief = async () => {
    try {
      await navigator.clipboard.writeText(
        `${product.name} — supplier brief (MerchDesk estimate)\n\n${product.supplierBrief}\n\nEst. price: ${formatInr(p.price)} · min run ${p.minRun} · setup ${formatInr(p.setupCost)}${product.complianceNote ? `\n\nCompliance: ${product.complianceNote}` : ''}`
      )
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Drawer open={product !== null} onClose={onClose} title={`Numbers — ${product.name}`}>
      <p className="mb-4 bg-amber/40 border-2 border-dashed border-ink rounded-sm px-3 py-2 text-sm font-medium">
        Estimates — get supplier quotes before you order.
      </p>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-ink/15">
              <th scope="row" className="text-left py-2.5 pr-4 text-ink-2 font-medium whitespace-nowrap">
                {row.label}
              </th>
              <td className="text-right py-2.5 text-ink">{row.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-5">
        <h3 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-2">
          Supplier brief — {product.supplierType}
        </h3>
        <p className="bg-paper-2 border-2 border-ink rounded-sm p-3 text-sm text-ink-2">{product.supplierBrief}</p>
        <button
          onClick={copyBrief}
          className="mt-2 inline-flex items-center gap-2 font-display uppercase text-xs tracking-wide border-2 border-ink rounded-sm bg-paper px-3 py-2 shadow-hard-sm hover:bg-acid transition"
        >
          {copied ? <Check className="h-4 w-4 text-leaf" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy brief'}
        </button>
      </div>

      {product.complianceNote && (
        <p className="mt-4 text-sm text-ink-2 bg-paper-2 border-l-4 border-amber px-3 py-2">
          ⚠ {product.complianceNote}
        </p>
      )}
    </Drawer>
  )
}
