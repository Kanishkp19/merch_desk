import type { LaunchPlan, LaunchLine, CreatorBrief } from './types'
import { defaultChecklist } from './checklist'
import { defaultEconomics } from './plan'
import { catalogItem } from '@/lib/catalog/pilot'
import { indiaCost, gstRateFor } from '@/lib/score/pricing'
import { rupeesToPaise } from '@/lib/economics/engine'
import type { ProductProposal } from '@/types'

/**
 * Clearly-labelled sample launch, built from the same engine as real plans so
 * the example view is honest about what the product produces. Sample data is
 * marked at every render site; it is never mixed into a creator's draft.
 */

export const SAMPLE_PLAN_ID = 'sample-launch-do-not-edit'

function fakeProduct(id: string): ProductProposal {
  const item = catalogItem(id)!
  const india = indiaCost(item)
  const price = Math.round(((india.priceRange[0] + india.priceRange[1]) / 2) / 10) * 10
  return {
    id: item.id,
    name: item.name,
    oneLiner: item.noun,
    category: item.category,
    role: id === 'heavyweight-tee' ? 'hero' : 'core',
    silhouette: item.silhouette,
    fitScore: 42,
    scoreParts: { tag: 30, brand: 8, cross: 4 },
    evidence: [
      { kind: 'tag', label: 'gig posters', points: 18, estimated: false },
      { kind: 'tag', label: 'indie', points: 12, estimated: false },
    ],
    pricing: {
      unitCost: (india.unitCost[0] + india.unitCost[1]) / 2,
      price,
      marginPerUnit: price - (india.unitCost[0] + india.unitCost[1]) / 2,
      minRun: item.minRun,
      setupCost: india.setupCost,
      firstRunCost: india.setupCost + item.minRun * (india.unitCost[0] + india.unitCost[1]) / 2,
      breakEvenUnits: null,
      typicalRange: india.priceRange,
      gstRate: gstRateFor(item, price),
      priceInclGst: Math.round(price * (1 + gstRateFor(item, price))),
      estimate: true,
    },
    supplierType: item.supplierType,
    supplierBrief: item.supplierBrief,
    description: { text: item.noun, version: 1, history: [], source: 'template' },
    decision: 'approved',
    image: { status: 'idle', attempts: 0, outdated: false },
  }
}

const brief: CreatorBrief = {
  creatorName: 'Sample Creator',
  projectName: 'The Neighbourhood Static',
  purpose: 'First EP release — three-show launch week',
  city: 'Bengaluru',
  budgetTier: 'small',
  targetDate: '',
  targetDateUnknown: true,
  sellingChannel: 'in_person',
  artworkReadiness: 'in_progress',
  audienceEvidence: 'Sample data: 300 gig attendees across two venues, 40 mailing-list pre-orders of the EP',
  productPrefs: ['tee', 'tote'],
  fulfilment: 'venue_handover',
  notes: 'Everything in this example plan is sample data.',
  updatedAt: '2026-10-29T00:00:00.000Z',
}

function sampleLine(id: string, quantityOrdered: number): LaunchLine {
  const p = fakeProduct(id)
  return {
    productId: p.id,
    name: p.name,
    oneLiner: p.oneLiner,
    category: p.category,
    role: p.role,
    silhouette: p.silhouette,
    fitScore: p.fitScore,
    evidence: p.evidence,
    recommendationSource: 'rules',
    supplierType: p.supplierType,
    supplierBrief: p.supplierBrief,
    leadTime: 'unconfirmed',
    minRun: p.pricing.minRun,
    included: true,
    quantityOrdered,
    expectedSold: Math.round(quantityOrdered * 0.8),
    sellPrice: rupeesToPaise(p.pricing.price),
    unitCostKnown: false,
    unitCost: rupeesToPaise(p.pricing.unitCost),
    setupCost: rupeesToPaise(p.pricing.setupCost),
    gstRatePct: Math.round(p.pricing.gstRate * 100),
    artworkReady: false,
  }
}

export function sampleLaunchPlan(): LaunchPlan {
  return {
    id: SAMPLE_PLAN_ID,
    name: 'The Neighbourhood Static — EP launch drop (SAMPLE)',
    createdAt: '2026-10-29T00:00:00.000Z',
    updatedAt: '2026-10-29T00:00:00.000Z',
    brief,
    lines: [sampleLine('heavyweight-tee', 36), sampleLine('sticker-pack', 100), sampleLine('tote-bag', 36)],
    economics: defaultEconomics(),
    pricesIncludeGst: true,
    checklist: defaultChecklist(brief),
  }
}
