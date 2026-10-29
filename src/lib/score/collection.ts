import type {
  BudgetTier,
  CatalogItem,
  DropPlan,
  ProductProposal,
  StudioInput,
  TasteProfile,
} from '@/types'
import { scoreCatalog } from './score'
import { selectProducts, BUDGET_RULES, MIN_RECOMMENDATION_FIT, firstRunCost, type SelectedProduct } from './rules'
import { computePricing } from './pricing'
import { buildDropPlan } from './drops'
import { describeProducts, initialDescription } from './describe'
import { briefTags } from './tag-map'
import { PILOT_CATALOG } from '@/lib/catalog/pilot'

// Pilot only: defer alcohol, matches, and sauce until local sourcing/compliance is verified.
export const CATALOG = PILOT_CATALOG

const INDIA_SUPPLIER_BRIEFS: Record<string, string> = {
  'enamel-pin-set': 'Set of 3 hard-enamel pins, about 3 cm each, butterfly clasps; confirm mould charges locally.',
  'heavyweight-tee': 'Heavyweight cotton tee, 1–2 colour front screen print, small back print, sizes S–XXL.',
  'hero-crewneck': 'Heavyweight fleece crewneck, embroidered chest mark and numbered neck label, limited run.',
  'tote-bag': 'Heavy cotton canvas tote, 1–2 colour print and reinforced handles.',
  'enamel-camp-mug': 'Approx. 350 ml enamel-coated steel mug with 1–2 colour print and silver rim.',
  'coffee-collab': '250 g coffee bags roasted by a local roaster; supply custom sleeve or label artwork.',
  'patch-set': 'Set of 2 iron-on embroidered patches, about 7.5 cm each, merrowed border.',
  bandana: 'Approx. 55 cm square cotton bandana with 1–2 colour print.',
}

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
  if (briefTags(input.text).length === 0 && profile.tags.length < 2) {
    return {
      products: [],
      dropPlan: buildDropPlan([]),
      meta: { descriptionSource: 'template', notes: ['Not enough audience evidence for a collection yet. Add specific interests and rebuild.'] },
    }
  }
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
      supplierBrief: INDIA_SUPPLIER_BRIEFS[s.item.id] ?? s.item.supplierBrief,
      ...(s.item.complianceNote ? { complianceNote: s.item.complianceNote } : {}),
      description: initialDescription(d?.text ?? s.item.noun, d?.source ?? 'template'),
      decision: 'pending',
      image: { status: 'idle', attempts: 0, outdated: false },
      ...(opts.replacedFrom ? { replacedFrom: opts.replacedFrom } : {}),
    }
  })

  // honest labelling: anything without evidence is an exploratory pick, not a proven fit
  const exploratory = products.filter((p) => p.evidence.length === 0).map((p) => p.name)
  const metaNotes = [...selection.notes]
  if (exploratory.length > 0) {
    metaNotes.push(`Exploratory picks (no direct audience evidence yet): ${exploratory.join(', ')}.`)
  }

  return {
    products,
    dropPlan: buildDropPlan(products),
    meta: {
      descriptionSource: describeOutcome.source,
      notes: [...metaNotes, ...profile.notes].slice(0, 6),
    },
  }
}

/** Replacement picker: best-fit eligible item within budget, not already shown/rejected. */
export function pickReplacement(
  scored: Array<{ item: CatalogItem; fitScore: number }>,
  budget: BudgetTier,
  excludeIds: string[],
  rejectedId: string
): { selected: SelectedProduct[]; notes: string[] } {
  const rules = BUDGET_RULES[budget]
  const exclude = new Set([...excludeIds, rejectedId])
  const candidate = scored.find((s) => !exclude.has(s.item.id) && s.fitScore >= MIN_RECOMMENDATION_FIT && firstRunCost(s.item) <= rules.perItemCap)
  if (!candidate) {
    return { selected: [], notes: ['No more good matches for this budget'] }
  }
  // keep the rejected product's role
  return {
    selected: [{ item: candidate.item, role: 'core', reason: 'Replacement — related entities excluded' }],
    notes: [],
  }
}
