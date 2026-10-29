import type { BudgetTier, EvidenceLink, ProductCategory, ProductRole, SilhouetteKind } from '@/types'
import type { LaunchEconomicsInput, LaunchLineItem } from '@/lib/economics/schema'

/**
 * Launch workspace domain types. A LaunchPlan is deliberately denormalized —
 * it does not reference live studio state, so a saved plan survives a new
 * recommendation run. All money in `LaunchLine.costs` is integer paise.
 */

export type FulfilmentPreference = 'self' | 'venue_handover' | 'post' | 'unknown'
export type SellingChannel = 'in_person' | 'instagram' | 'own_site' | 'marketplace' | 'preorder' | 'unknown'

export interface CreatorBrief {
  /** required */
  creatorName: string
  projectName: string
  purpose: string
  city: string
  budgetTier: BudgetTier
  targetDate: string // ISO date, or '' when unknown
  targetDateUnknown: boolean
  sellingChannel: SellingChannel
  artworkReadiness: 'ready' | 'in_progress' | 'has_designer' | 'none'
  /** optional but recommendation-relevant */
  audienceEvidence: string
  productPrefs: string[]
  fulfilment: FulfilmentPreference
  notes: string
  updatedAt: string
}

export type RecommendationSource = 'rules' | 'ai_assisted' | 'manual'

export interface LaunchLine {
  productId: string
  name: string
  oneLiner: string
  category: ProductCategory
  role: ProductRole
  silhouette: SilhouetteKind
  fitScore: number
  evidence: EvidenceLink[]
  recommendationSource: RecommendationSource
  supplierType: string
  supplierBrief: string
  complianceNote?: string
  /** Always 'unconfirmed' until a written quote lands in the operator queue. */
  leadTime: 'unconfirmed'
  minRun: number
  /** planner-editable fields */
  included: boolean
  quantityOrdered: number
  /** Creator's own sales guess per scenario anchor — never inferred from audience size. */
  expectedSold: number
  sellPrice: number // paise, GST treatment per launch setting
  unitCostKnown: boolean
  unitCost: number // paise estimate; known=false until a quote confirms it
  setupCost: number // paise estimate
  gstRatePct: number
  artworkReady: boolean
  note?: string
  replacedFrom?: string
}

export type ChecklistId =
  | 'artwork'
  | 'specs'
  | 'quote'
  | 'sample'
  | 'production'
  | 'selling'
  | 'fulfilment'
  | 'outcome'

export type ChecklistStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'not_needed'

export interface ChecklistItem {
  id: ChecklistId
  label: string
  hint: string
  status: ChecklistStatus
  /** Set only from explicit creator/operator inputs, never invented. */
  date?: string
}

export interface ContactConsent {
  name: string
  email: string
  phone?: string
  /** Explicit consent to share the request contents with suppliers. */
  shareWithSuppliers: boolean
  consentText: string
}

export interface QuoteRequestPayload {
  launchName: string
  brief: Pick<
    CreatorBrief,
    'projectName' | 'purpose' | 'city' | 'targetDate' | 'sellingChannel' | 'fulfilment' | 'artworkReadiness'
  >
  lines: Array<{
    productId: string
    name: string
    quantityOrdered: number
    sellPrice: number
    unitCostKnown: boolean
    artworkReady: boolean
    supplierBrief: string
    gstRatePct: number
  }>
  targetDateKnown: boolean
  deliveryRegion: string
  costAssumptions: {
    estimatedSetupTotal: number
    estimatedUnitCostRange: [number, number]
    pricesIncludeGst: boolean
    unconfirmedCount: number
  }
  notes?: string
  contact: ContactConsent
}

export interface LaunchPlan {
  id: string // stable; doubles as the quote idempotency key
  name: string
  createdAt: string
  updatedAt: string
  brief: CreatorBrief
  lines: LaunchLine[]
  /** Launch-level cost assumptions. Per-product lines are derived from `lines`. */
  economics: Omit<LaunchEconomicsInput, 'lines'>
  pricesIncludeGst: boolean
  checklist: ChecklistItem[]
  /** Set once a quote request is submitted; the request snapshot is server-side. */
  submission?: {
    ref: string
    submittedAt: string
    /** Hash of the payload at submission, so later edits are visibly "not yet re-sent". */
    snapshotDigest: string
  }
}

export type LaunchRequestStatus = 'submitted' | 'needs_info' | 'quote_ready' | 'closed'

export interface QuoteRecord {
  id: string
  supplier: string
  recordedAt: string
  currency: 'INR'
  unitCost: number // paise
  setupCost: number // paise
  minQuantity: number
  leadTimeDays: number | null
  validUntil?: string
  includes: string[]
  excludes: string[]
  evidenceNote?: string
  revision: number
  creatorDecision?: 'accepted' | 'declined'
}

export interface RequestEvent {
  id: string
  at: string
  actor: 'operator' | 'creator' | 'system'
  type: 'note' | 'status_change' | 'info_request' | 'quote' | 'creator_decision' | 'sample_decision' | 'production_decision'
  text: string
  statusAfter?: LaunchRequestStatus
}

/** What a creator sees — excludes operator-only fields. */
export interface CreatorRequestView {
  ref: string
  status: LaunchRequestStatus
  statusLabel: string
  submittedAt: string
  launchName: string
  events: Array<{ at: string; text: string }>
  quotes: Array<{
    id: string
    supplier: string
    unitCost: number
    setupCost: number
    minQuantity: number
    leadTimeDays: number | null
    validUntil?: string
    includes: string[]
    excludes: string[]
    revision: number
    creatorDecision?: 'accepted' | 'declined'
  }>
  nextAction: string
  /** The creator's explicit gates — acceptance never implies supplier acceptance. */
  disclaimers: string[]
}

export const STATUS_LABELS: Record<LaunchRequestStatus, string> = {
  submitted: 'Submitted',
  needs_info: 'Needs information',
  quote_ready: 'Quote ready',
  closed: 'Closed',
}
