import type {
  BudgetTier,
  CatalogItem,
  DropPlan,
  ProductProposal,
  StudioInput,
  TasteProfile,
} from '@/types'
import catalogJson from '@/data/catalog.json'
import { scoreCatalog } from './score'
import { selectProducts } from './rules'
import { computePricing } from './pricing'
import { buildDropPlan } from './drops'
import { describeProducts, initialDescription } from './describe'

export const CATALOG = catalogJson as CatalogItem[]

export interface BuildCollectionResult {
  products: ProductProposal[]
  dropPlan: DropPlan
  meta: { descriptionSource: 'llm' | 'template'; notes: string[] }
}

/**
 * Deterministic collection builder shared by /api/collection and /api/replace.
 * Scoring, selection, pricing and drops are pure code; only the descriptions
 * touch the LLM (with template fallback).
 */
export async function buildCollection(
  input: StudioInput,
  profile: TasteProfile,
  budget: BudgetTier,
  opts: { excludeIds?: string[]; replacedFrom?: string; singleReplacementFor?: string } = {}
): Promise<BuildCollectionResult> {
  const scored = scoreCatalog(CATALOG, profile)
  const selection =
    opts.singleReplacementFor !== undefined
      ? pickReplacement(scored, budget, opts.excludeIds ?? [], opts.singleReplacementFor)
      : selectProducts(scored, budget, { excludeIds: opts.excludeIds })

  const items = selection.selected.map((s) => s.item)
  const describeOutcome = await describeProducts(items, profile, profile.paletteId)

  const products: ProductProposal[] = selection.selected.map((s) => {
    const d = describeOutcome.descriptions[s.item.id]
    return {
      id: s.item.id,
      name: d?.name ?? s.item.name,
      oneLiner: d?.oneLiner ?? s.item.name,
      category: s.item.category,
      role: s.role,
      silhouette: s.item.silhouette,
      fitScore: scored.find((x) => x.item.id === s.item.id)?.fitScore ?? 0,
      scoreParts: {
        tag: scored.find((x) => x.item.id === s.item.id)?.tag ?? 0,
        brand: scored.find((x) => x.item.id === s.item.id)?.brand ?? 0,
        cross: scored.find((x) => x.item.id === s.item.id)?.cross ?? 0,
      },
      evidence: scored.find((x) => x.item.id === s.item.id)?.evidence ?? [],
      pricing: computePricing(s.item, profile.priceTier),
      supplierType: s.item.supplierType,
      supplierBrief: s.item.supplierBrief,
      ...(s.item.complianceNote ? { complianceNote: s.item.complianceNote } : {}),
      description: initialDescription(d?.text ?? s.item.noun, d?.source ?? 'template'),
      decision: 'pending',
      image: { status: 'idle', attempts: 0, outdated: false },
      ...(opts.replacedFrom ? { replacedFrom: opts.replacedFrom } : {}),
    }
  })

  return {
    products,
    dropPlan: buildDropPlan(products),
    meta: {
      descriptionSource: describeOutcome.source,
      notes: [...selection.notes, ...profile.notes].slice(0, 6),
    },
  }
}

/** Replacement picker: best-fit eligible item not already shown/rejected. */
function pickReplacement(
  scored: Array<{ item: CatalogItem; fitScore: number }>,
  budget: BudgetTier,
  excludeIds: string[],
  rejectedId: string
): { selected: Array<{ item: CatalogItem; role: 'core' | 'hero' | 'limited'; reason: string }>; notes: string[] } {
  const exclude = new Set([...excludeIds, rejectedId])
  const candidate = scored.find((s) => !exclude.has(s.item.id))
  if (!candidate) {
    return { selected: [], notes: ['No more good matches for this budget'] }
  }
  // keep the rejected product's role
  return {
    selected: [{ item: candidate.item, role: 'core', reason: 'Replacement — related entities excluded' }],
    notes: [],
  }
}
