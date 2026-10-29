'use client'

import React from 'react'
import { formatPaise, paiseToRupees, rupeesToPaise } from '@/lib/economics/engine'

/** Rupee text input bound to a paise value. Invalid/negative input shows inline. */
export function MoneyInput({
  value,
  onChange,
  label,
  id,
  disabled,
  allowZero = true,
}: {
  value: number // paise
  onChange: (paise: number) => void
  label: string
  id: string
  disabled?: boolean
  allowZero?: boolean
}) {
  const [draft, setDraft] = React.useState<string>(() => String(paiseToRupees(value)))
  const [error, setError] = React.useState<string | null>(null)
  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || Number.isNaN(n)) {
      setError('Enter a rupee amount')
      return
    }
    if (n < 0) {
      setError("Can't be negative")
      return
    }
    if (!allowZero && n === 0) {
      setError("Can't be zero")
      return
    }
    setError(null)
    onChange(rupeesToPaise(n))
  }

  return (
    <div>
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden>
          ₹
        </span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-err` : undefined}
          className="w-full bg-paper-2 text-ink font-sans text-base border-2 border-ink rounded-sm pl-7 pr-3 py-2 min-h-11 focus:outline-none focus:bg-paper focus:ring-4 focus:ring-cobalt/40 aria-[invalid=true]:border-tomato-deep disabled:opacity-50"
        />
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-sm text-tomato-deep mt-1">
          {error}
        </p>
      ) : (
        <p className="text-xs text-mute mt-1">{formatPaise(value)}</p>
      )}
    </div>
  )
}

/** Optional cost toggle: known checkbox + amount, or an explicit "unknown". */
export function OptionalCost({
  known,
  amount,
  onKnown,
  onAmount,
  label,
  id,
  hint,
}: {
  known: boolean
  amount: number
  onKnown: (k: boolean) => void
  onAmount: (paise: number) => void
  label: string
  id: string
  hint?: string
}) {
  return (
    <div className={`border-2 rounded-sm p-3 ${known ? 'border-ink bg-paper' : 'border-dashed border-ink/50 bg-amber/10'}`}>
      <label className="flex items-center gap-2 text-sm font-medium mb-2">
        <input type="checkbox" checked={known} onChange={(e) => onKnown(e.target.checked)} className="h-4 w-4 accent-[var(--cobalt)]" />
        {label}
        {!known && <span className="text-xs text-tomato-deep font-bold">UNKNOWN — excluded from totals</span>}
      </label>
      {known && <MoneyInput id={id} label="Amount" value={amount} onChange={onAmount} />}
      {hint && <p className="text-xs text-mute mt-1">{hint}</p>}
    </div>
  )
}

export function PercentInput({
  value,
  onChange,
  label,
  id,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  id: string
}) {
  const [draft, setDraft] = React.useState(String(value))
  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() === '' || Number.isNaN(n) || n < 0 || n > 100) {
      setDraft(String(value))
      return
    }
    onChange(n)
  }
  return (
    <div>
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step="0.5"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          className="w-full bg-paper-2 text-ink font-sans text-base border-2 border-ink rounded-sm px-3 pr-7 py-2 min-h-11 focus:outline-none focus:bg-paper focus:ring-4 focus:ring-cobalt/40"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2" aria-hidden>
          %
        </span>
      </div>
    </div>
  )
}

export function UnitInput({
  value,
  onChange,
  label,
  id,
  min = 0,
  max = 100000,
}: {
  value: number
  onChange: (v: number) => void
  label: string
  id: string
  min?: number
  max?: number
}) {
  const [draft, setDraft] = React.useState(String(value))
  const commit = (raw: string) => {
    const n = Math.round(Number(raw))
    if (raw.trim() === '' || Number.isNaN(n) || n < min) {
      setDraft(String(value))
      return
    }
    onChange(Math.min(n, max))
  }
  return (
    <div>
      <label htmlFor={id} className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        className="w-full bg-paper-2 text-ink font-sans text-base border-2 border-ink rounded-sm px-3 py-2 min-h-11 focus:outline-none focus:bg-paper focus:ring-4 focus:ring-cobalt/40"
      />
    </div>
  )
}
