'use client'

import React from 'react'
import type { EvidenceLink } from '@/types'
import { Chip } from '@/components/ui/Chip'

export function WhyPopover({ evidence, fitScore }: { evidence: EvidenceLink[]; fitScore: number }) {
  return (
    <div className="p-3 max-w-72">
      <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-2">
        Why this product · fit {fitScore}/100
      </p>
      <ul className="space-y-1.5">
        {evidence.map((e, i) => (
          <li key={i} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-1.5 min-w-0">
              {e.kind === 'brand' ? '←' : e.kind === 'cross_domain' ? '← also into:' : '←'}
              <span className="truncate">
                {e.kind === 'brand' && e.entityName ? `audience affinity: ${e.entityName}` : e.label}
              </span>
            </span>
            <span className="font-mono text-xs text-ink-2 shrink-0">+{e.points}</span>
          </li>
        ))}
        {evidence.length === 0 && <li className="text-sm text-mute">No strong taste signal — safe default pick.</li>}
      </ul>
      <p className="mt-2 pt-2 border-t border-ink/20 text-xs text-mute">
        Source: {evidence.some((e) => e.estimated) ? 'Qloo affinity + AI-estimated mapping' : 'Qloo affinity data'}
      </p>
    </div>
  )
}

export function EvidenceChips({ evidence }: { evidence: EvidenceLink[] }) {
  if (evidence.length === 0) return null
  return (
    <>
      {evidence.slice(0, 3).map((e, i) => (
        <Chip
          key={i}
          variant={e.estimated ? 'estimated' : 'evidence'}
          arrow
          title={
            e.estimated
              ? 'Estimated by AI from the name — not returned by Qloo'
              : e.kind === 'brand'
                ? `Audience affinity: ${e.entityName ?? e.label} (+${e.points} pts)`
                : `${e.label} (+${e.points} pts)`
          }
        >
          {e.kind === 'brand' ? e.entityName ?? e.label : e.label}
        </Chip>
      ))}
    </>
  )
}
