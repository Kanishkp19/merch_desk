'use client'

import React from 'react'
import { Download, Printer, FileText } from 'lucide-react'
import type { ChecklistStatus, LaunchPlan } from '@/lib/launch/types'
import { checklistProgress } from '@/lib/launch/checklist'
import { launchBriefMarkdown } from '@/lib/launch/brief-export'
import { Button } from '@/components/ui/Button'

const STATUS_OPTIONS: Array<{ value: ChecklistStatus; label: string }> = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'not_needed', label: 'Not needed' },
]

export function ChecklistPanel({
  plan,
  onChecklistChange,
}: {
  plan: LaunchPlan
  onChecklistChange: (id: string, status: ChecklistStatus) => void
}) {
  const progress = checklistProgress(plan.checklist)

  const download = () => {
    const md = launchBriefMarkdown(plan)
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `launch-brief-${plan.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="space-y-6">
      <section aria-labelledby="cl-h">
        <div className="flex items-center justify-between mb-3">
          <h3 id="cl-h" className="font-display text-xl uppercase">Launch checklist</h3>
          <span className="text-sm text-ink-2">{progress.done} of {progress.total} done</span>
        </div>
        {progress.next && (
          <div className="bg-acid/50 border-2 border-ink rounded-md p-4 mb-4">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1">Next action</p>
            <p className="font-display uppercase">{progress.next.label}</p>
            <p className="text-sm text-ink-2 mt-1">{progress.next.hint}</p>
          </div>
        )}
        <ul className="space-y-2">
          {plan.checklist.filter((c) => c.status !== 'not_needed').map((c) => (
            <li key={c.id} className="border-2 border-ink rounded-sm bg-paper-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={`font-medium ${c.status === 'done' ? 'line-through text-mute' : ''}`}>{c.label}</p>
                  <p className="text-xs text-mute">{c.hint}</p>
                </div>
                <label className="sr-only" htmlFor={`cl-${c.id}`}>{`Status of ${c.label}`}</label>
                <select
                  id={`cl-${c.id}`}
                  value={c.status}
                  onChange={(e) => onChecklistChange(c.id, e.target.value as ChecklistStatus)}
                  className="border-2 border-ink rounded-sm bg-paper px-2 py-1.5 text-sm"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="brief-h" className="border-2 border-ink rounded-md bg-paper-2 shadow-hard p-4">
        <h3 id="brief-h" className="font-display text-xl uppercase mb-1">Exportable launch brief</h3>
        <p className="text-sm text-ink-2 mb-4">
          Your line sheet, evolved: assortment with reasons, full economics with scenario assumptions,
          and every unconfirmed item as an explicit checklist — ready to hand to a printer or keep as
          your own reference.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="dark" onClick={download}>
            <Download className="h-4 w-4" aria-hidden /> Download launch brief (.md)
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden /> Print this page
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(launchBriefMarkdown(plan))
              } catch {
                /* clipboard unavailable */
              }
            }}
          >
            <FileText className="h-4 w-4" aria-hidden /> Copy as markdown
          </Button>
        </div>
      </section>
    </div>
  )
}
