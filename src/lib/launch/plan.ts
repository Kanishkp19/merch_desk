'use client'

import type { ProductProposal, CreatorType } from '@/types'
import type { CreatorBrief, LaunchLine, LaunchPlan, QuoteRequestPayload } from './types'
import { defaultChecklist } from './checklist'
import { digestPayload, planEconomics } from './checklist'
import { indiaCost, gstRateFor } from '@/lib/score/pricing'
import type { LaunchEconomicsInput } from '@/lib/economics/schema'
import { rupeesToPaise } from '@/lib/economics/engine'
import { catalogItem } from '@/lib/catalog/pilot'

/**
 * Client-side launch plan store. Drafts live in localStorage (device-only,
 * labelled in the UI). Only a *submitted* quote request reaches the server.
 */

const DRAFTS_KEY = 'merchdesk:launches:v1'

export function emptyBrief(): CreatorBrief {
  return {
    creatorName: '',
    projectName: '',
    purpose: '',
    city: 'Bengaluru',
    budgetTier: 'small',
    targetDate: '',
    targetDateUnknown: true,
    sellingChannel: 'unknown',
    artworkReadiness: 'in_progress',
    audienceEvidence: '',
    productPrefs: [],
    fulfilment: 'unknown',
    notes: '',
    updatedAt: new Date().toISOString(),
  }
}

/** Pilot defaults: costs that exist as labelled estimates; unknowns stay unknown. */
export function defaultEconomics(): Omit<LaunchEconomicsInput, 'lines'> {
  return {
    pricesIncludeGst: true,
    sampling: { known: false, amount: 0 },
    inboundFreight: { known: false, amount: 0 },
    packagingPerUnit: { known: false, amount: 0 },
    customerShippingPerUnit: 0,
    outboundShippingPerUnit: { known: false, amount: 0 },
    paymentFeePct: 2,
    planningFee: { known: true, amount: rupeesToPaise(2500) },
    defectRatePct: 2,
  }
}

/** Focus rule: the launch assortment is 1–3 products even when the studio shows more. */
export const MAX_LAUNCH_LINES = 3

export function lineFromProduct(p: ProductProposal): LaunchLine {
  const item = catalogItem(p.id)
  const india = item ? indiaCost(item) : null
  return {
    productId: p.id,
    name: p.name,
    oneLiner: p.oneLiner,
    category: p.category,
    role: p.role,
    silhouette: p.silhouette,
    fitScore: p.fitScore,
    evidence: p.evidence,
    recommendationSource: p.description.source === 'llm' ? 'ai_assisted' : 'rules',
    supplierType: p.supplierType,
    supplierBrief: p.supplierBrief,
    complianceNote: p.complianceNote,
    leadTime: 'unconfirmed',
    minRun: p.pricing.minRun,
    included: true,
    quantityOrdered: p.pricing.minRun,
    expectedSold: p.pricing.minRun,
    sellPrice: rupeesToPaise(p.pricing.price),
    unitCostKnown: false, // estimates only become "known" when a quote is recorded
    unitCost: rupeesToPaise(p.pricing.unitCost),
    setupCost: rupeesToPaise(india?.setupCost ?? p.pricing.setupCost),
    gstRatePct: item ? gstRateFor(item, p.pricing.price) * 100 : 18,
    artworkReady: false,
    replacedFrom: p.replacedFrom,
  }
}

export function createPlan(brief: CreatorBrief, products: ProductProposal[]): LaunchPlan {
  const now = new Date().toISOString()
  const lines = products.slice(0, MAX_LAUNCH_LINES).map(lineFromProduct)
  const plan: LaunchPlan = {
    id: crypto.randomUUID(),
    name: `${brief.projectName || brief.creatorName || 'Untitled'} merch drop`,
    createdAt: now,
    updatedAt: now,
    brief: { ...brief, updatedAt: now },
    lines,
    economics: defaultEconomics(),
    pricesIncludeGst: true,
    checklist: defaultChecklist(brief),
  }
  return plan
}

export function loadDrafts(): LaunchPlan[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(DRAFTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed.plans) ? (parsed.plans as LaunchPlan[]) : []
  } catch {
    return []
  }
}

export function loadBrief(): CreatorBrief {
  if (typeof window === 'undefined') return emptyBrief()
  try {
    const raw = localStorage.getItem('merchdesk:brief:v1')
    if (raw) return { ...emptyBrief(), ...(JSON.parse(raw) as CreatorBrief) }
  } catch {
    /* ignore */
  }
  return emptyBrief()
}

export function saveDraft(plan: LaunchPlan) {
  if (typeof window === 'undefined') return
  try {
    const plans = loadDrafts().filter((p) => p.id !== plan.id)
    plans.unshift({ ...plan, updatedAt: new Date().toISOString() })
    localStorage.setItem(DRAFTS_KEY, JSON.stringify({ v: 1, plans: plans.slice(0, 12) }))
  } catch {
    /* quota — non-fatal */
  }
}

export function deleteDraft(planId: string) {
  if (typeof window === 'undefined') return
  try {
    const plans = loadDrafts().filter((p) => p.id !== planId)
    localStorage.setItem(DRAFTS_KEY, JSON.stringify({ v: 1, plans }))
  } catch {
    /* ignore */
  }
}

/** Build the exact payload the creator reviews before submission. */
export async function buildQuotePayload(plan: LaunchPlan, contact: QuoteRequestPayload['contact'], notes?: string): Promise<QuoteRequestPayload> {
  const { result } = planEconomics(plan)
  const included = plan.lines.filter((l) => l.included)
  const unitCosts = included.map((l) => l.unitCost).sort((a, b) => a - b)
  return {
    launchName: plan.name,
    brief: {
      projectName: plan.brief.projectName,
      purpose: plan.brief.purpose,
      city: plan.brief.city,
      targetDate: plan.brief.targetDate,
      sellingChannel: plan.brief.sellingChannel,
      fulfilment: plan.brief.fulfilment,
      artworkReadiness: plan.brief.artworkReadiness,
    },
    lines: included.map((l) => ({
      productId: l.productId,
      name: l.name,
      quantityOrdered: l.quantityOrdered,
      sellPrice: l.sellPrice,
      unitCostKnown: l.unitCostKnown,
      artworkReady: l.artworkReady,
      supplierBrief: l.supplierBrief,
      gstRatePct: l.gstRatePct,
    })),
    targetDateKnown: !plan.brief.targetDateUnknown && plan.brief.targetDate !== '',
    deliveryRegion: plan.brief.city,
    costAssumptions: {
      estimatedSetupTotal: included.reduce((a, l) => a + l.setupCost, 0),
      estimatedUnitCostRange: [unitCosts[0] ?? 0, unitCosts[unitCosts.length - 1] ?? 0],
      pricesIncludeGst: plan.pricesIncludeGst,
      unconfirmedCount: result.unconfirmed.length,
    },
    notes,
    contact,
  }
}

export async function payloadDigest(plan: LaunchPlan): Promise<string> {
  // digest over plan content only (not timestamps) so trivial edits don't dirty the snapshot marker
  return digestPayload({ lines: plan.lines, economics: plan.economics, brief: plan.brief, name: plan.name })
}

export function briefToStudioInputSeed(brief: CreatorBrief, creatorType: CreatorType = 'musician') {
  const parts = [brief.purpose, brief.audienceEvidence].filter((s) => s.trim().length > 0)
  return {
    text: parts.join('. ').slice(0, 1000) || `${brief.projectName} merch for fans in ${brief.city}`,
    soundsLike: [] as string[],
    city: brief.city,
    creatorType,
    budget: brief.budgetTier,
  }
}
