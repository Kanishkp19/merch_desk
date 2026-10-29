/**
 * MerchDesk — central TypeScript types (mirrors 02-TRD.md).
 * Zod schemas in lib/schemas/* are the runtime source of truth.
 */

export type CreatorType = 'musician' | 'podcaster' | 'youtuber' | 'streamer' | 'comic_artist' | 'other'
export type BudgetTier = 'small' | 'medium' | 'large'
export type PriceTier = 'budget' | 'mid' | 'premium'
export type EntityType = 'artist' | 'brand' | 'place' | 'movie' | 'tv_show' | 'book' | 'podcast' | 'videogame' | 'destination'
export type ProductCategory = 'apparel' | 'print' | 'objects' | 'consumables'
export type ProductRole = 'core' | 'hero' | 'limited'
export type SilhouetteKind = 'cap' | 'top' | 'socks' | 'tote' | 'flat' | 'round' | 'cassette' | 'mug' | 'bottle' | 'bag' | 'can' | 'bandana' | 'cards'

export interface CatalogItem {
  id: string
  name: string
  noun: string
  category: ProductCategory
  silhouette: SilhouetteKind
  tags: string[]
  crossDomainTags: string[]
  brandCategories: string[]
  minRun: number
  unitCost: [number, number]
  setupCost: number
  priceRange: [number, number]
  supplierType: string
  supplierBrief: string
  complianceNote?: string
  difficulty: 'low' | 'medium' | 'high'
  lowRisk: boolean
  hero: boolean
  collab?: boolean
}

export interface StudioInput {
  text: string
  artist?: { id: string; name: string }
  soundsLike: string[]
  city: string
  creatorType: CreatorType
  budget: BudgetTier
}

export interface WeightedTag {
  name: string
  qlooTagId?: string
  canonical?: string
  weight: number
  source: 'qloo' | 'llm_estimate' | 'user'
}

export interface AffinityEntity {
  id: string
  name: string
  type: EntityType
  weight: number
  tags: string[]
  canonicalTags: string[]
  brandCategories?: string[]
  priceTier?: PriceTier
  estimated: boolean
  imageUrl?: string
  location?: string
}

export interface TasteProfile {
  path: 'A_artist_found' | 'B_description'
  artist?: { id: string; name: string }
  seeds: { entityIds: string[]; tagIds: string[] }
  tags: WeightedTag[]
  brands: AffinityEntity[]
  crossDomain: AffinityEntity[]
  inspirationPlaces: AffinityEntity[]
  priceTier: PriceTier
  priceTierEstimated: boolean
  paletteId: string
  notes: string[]
  agentMode: 'llm_agent' | 'scripted_fallback'
  qlooCalls: number
}

export interface EvidenceLink {
  kind: 'tag' | 'brand' | 'cross_domain'
  label: string
  entityName?: string
  entityId?: string
  points: number
  estimated: boolean
}

export interface Pricing {
  unitCost: number
  price: number
  marginPerUnit: number
  minRun: number
  setupCost: number
  firstRunCost: number
  breakEvenUnits: number | null
  typicalRange: [number, number]
  gstRate: number
  priceInclGst: number
  estimate: true
}

export interface ProductDescription {
  text: string
  version: number
  history: string[]
  source: 'llm' | 'template' | 'user'
}

export type ImageStatus = 'idle' | 'generating' | 'ready' | 'failed' | 'quota' | 'cap'

export interface ProductImage {
  status: ImageStatus
  dataUrl?: string
  attempts: number
  outdated: boolean
  error?: string
}

export type Decision = 'pending' | 'approved' | 'rejected'

export interface ProductProposal {
  id: string
  name: string
  oneLiner: string
  category: ProductCategory
  role: ProductRole
  silhouette: SilhouetteKind
  fitScore: number
  scoreParts: { tag: number; brand: number; cross: number }
  evidence: EvidenceLink[]
  pricing: Pricing
  supplierType: string
  supplierBrief: string
  complianceNote?: string
  description: ProductDescription
  decision: Decision
  image: ProductImage
  replacedFrom?: string
}

export interface CollabSuggestion {
  id: string
  name: string
  type: 'place' | 'brand'
  area?: string
  tags: string[]
  partnerIdea: string
  linkedProductIds: string[]
  sourceUrl?: string
}

export interface DropStep {
  wave: 'core' | 'hero' | 'limited'
  weekOffset: number
  productIds: string[]
  runSizes: Record<string, number>
  note: string
}

export interface DropPlan {
  steps: DropStep[]
  firstRunTip: string
  seasonNote?: string
}

export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'QLOO_NO_KEY'
  | 'QLOO_RATE_LIMIT'
  | 'QLOO_UNAVAILABLE'
  | 'LLM_UNAVAILABLE'
  | 'IMAGE_QUOTA'
  | 'SESSION_CAP'
  | 'IMAGE_FAILED'
  | 'MODERATION_BLOCKED'
  | 'RATE_LIMITED'
  | 'INTERNAL'

export interface ApiErrorBody {
  error: { code: ErrorCode; message: string; field?: string; retryAfterSec?: number }
}

export type AgentEvent =
  | { type: 'step'; id: string; label: string; status: 'running' | 'done' | 'skipped' | 'failed'; detail?: string }
  | { type: 'tool_call'; id: string; tool: string; args: Record<string, unknown> }
  | { type: 'tool_result'; id: string; tool: string; summary: string; count?: number }
  | { type: 'note'; text: string }
  | { type: 'profile'; profile: TasteProfile }
  | { type: 'error'; code: string; message: string }
  | { type: 'done'; mode: 'llm_agent' | 'scripted_fallback' }

export interface StudioStatus {
  qloo: boolean
  dataMode: 'live' | 'fixtures'
  llmProviders: string[]
  image: boolean
  maxImagesPerSession: number
}
