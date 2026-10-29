import type { ChecklistItem, ChecklistId, LaunchPlan, LaunchLine } from './types'
import { computeLaunchEconomics } from '@/lib/economics/engine'
import type { LaunchEconomicsInput } from '@/lib/economics/schema'
/** Launch checklist in journey order; dates are only ever set from explicit inputs. */
export function defaultChecklist(brief: LaunchPlan['brief']): ChecklistItem[] {
  return [
    {
      id: 'artwork',
      label: 'Final print-ready artwork',
      hint: 'Vector or 300 dpi files per product. AI concepts are references, not print files.',
      status: brief.artworkReadiness === 'ready' ? 'done' : 'todo',
    },
    {
      id: 'specs',
      label: 'Written specifications per product',
      hint: 'Sizes, colours, material, print placement — the numbers drawer gives you a starting brief.',
      status: 'todo',
    },
    {
      id: 'quote',
      label: 'Supplier quote received and reviewed',
      hint: 'MerchDesk coordinates this manually during the pilot. You review the exact request before it goes out.',
      status: 'todo',
    },
    {
      id: 'sample',
      label: 'Sample reviewed and approved',
      hint: 'Inspect print quality and any text on AI concept images before approving.',
      status: 'todo',
    },
    {
      id: 'production',
      label: 'Production decision',
      hint: 'A separate, explicit go/no-go. Nothing is manufactured until you authorize it.',
      status: 'todo',
    },
    {
      id: 'selling',
      label: 'Selling setup ready',
      hint: 'Where you take orders: venue table, Instagram DMs, a form, or your own page.',
      status: brief.sellingChannel !== 'unknown' ? 'in_progress' : 'todo',
    },
    {
      id: 'fulfilment',
      label: 'Fulfilment responsibility agreed',
      hint: 'Who packs, who ships, who hands over at the venue. Recorded from your brief, not assumed.',
      status: brief.fulfilment === 'unknown' ? 'todo' : 'in_progress',
    },
    {
      id: 'outcome',
      label: 'Outcome review after the launch',
      hint: 'What actually sold vs. the three scenarios — the input for your next drop.',
      status: 'todo',
    },
  ]
}

export function checklistProgress(items: ChecklistItem[]): { done: number; total: number; next?: ChecklistItem } {
  const actionable = items.filter((i) => i.status !== 'not_needed')
  const done = actionable.filter((i) => i.status === 'done').length
  const next = actionable.find((i) => i.status === 'todo' || i.status === 'blocked')
  return { done, total: actionable.length, next }
}

/** Build the full engine input: per-product lines from the plan, launch-level from assumptions. */
export function buildEconomicsInput(plan: LaunchPlan): LaunchEconomicsInput {
  return {
    lines: plan.lines
      .filter((l) => l.included)
      .map((l) => ({
        productId: l.productId,
        name: l.name,
        included: true,
        quantityOrdered: l.quantityOrdered,
        sellPrice: l.sellPrice,
        unitCost: { known: l.unitCostKnown, amount: l.unitCost },
        setupCost: { known: true, amount: l.setupCost },
        expectedSold: Math.min(l.quantityOrdered, l.expectedSold),
        gstRatePct: l.gstRatePct,
        artworkReady: l.artworkReady,
      })),
    ...plan.economics,
    pricesIncludeGst: plan.pricesIncludeGst,
  }
}

/** Recompute economics; exported for the UI and the quote payload builder. */
export function planEconomics(plan: LaunchPlan) {
  const input = buildEconomicsInput(plan)
  return { input, result: computeLaunchEconomics(input) }
}

/** Cheap content digest so the UI can show "edited since submission" honestly. */
export async function digestPayload(payload: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(payload))
  const buf = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

export function findChecklist(plan: LaunchPlan, id: ChecklistId): ChecklistItem | undefined {
  return plan.checklist.find((c) => c.id === id)
}
