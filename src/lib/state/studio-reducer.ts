'use client'

import type {
  AgentEvent,
  CollabSuggestion,
  DropPlan,
  ProductProposal,
  StudioInput,
  TasteProfile,
} from '@/types'

export type StudioStage = 'idle' | 'profiling' | 'profile_ready' | 'building' | 'collection'

export interface StudioState {
  runId: string | null
  stage: StudioStage
  input: StudioInput | null
  agentEvents: AgentEvent[]
  profile: TasteProfile | null
  products: ProductProposal[]
  dropPlan: DropPlan | null
  collabs: CollabSuggestion[] | null
  cityNote?: string
  generic: Array<{ name: string; reason: string }> | null
  genericLoading: boolean
  imagesGenerated: number
  maxImages: number
  rejectedIds: string[]
  replaceNote?: string
  lastError: { code: string; message: string } | null
  collectionMeta?: { descriptionSource: 'llm' | 'template'; notes: string[] }
}

export const initialStudioState: StudioState = {
  runId: null,
  stage: 'idle',
  input: null,
  agentEvents: [],
  profile: null,
  products: [],
  dropPlan: null,
  collabs: null,
  generic: null,
  genericLoading: false,
  imagesGenerated: 0,
  maxImages: 12,
  rejectedIds: [],
  lastError: null,
}

export type StudioAction =
  | { type: 'RUN_STARTED'; input: StudioInput; runId: string }
  | { type: 'AGENT_EVENT'; event: AgentEvent }
  | { type: 'PROFILE_READY'; profile: TasteProfile }
  | { type: 'CHIP_REMOVED'; index: number }
  | { type: 'CHIP_ADDED'; tag: { name: string; qlooTagId?: string } }
  | { type: 'COLLECTION_REQUESTED' }
  | { type: 'COLLECTION_READY'; products: ProductProposal[]; dropPlan: DropPlan; meta: { descriptionSource: 'llm' | 'template'; notes: string[] } }
  | { type: 'EDIT_TEXT'; productId: string; text: string; source: 'llm' | 'template' | 'user' }
  | { type: 'TWEAK_OK'; productId: string; text: string; source: 'llm' | 'template' }
  | { type: 'UNDO_TEXT'; productId: string }
  | { type: 'APPROVE'; productId: string }
  | { type: 'IMAGE_REQUESTED'; productId: string }
  | { type: 'IMAGE_OK'; productId: string; dataUrl: string; runId: string; version: number }
  | { type: 'IMAGE_RESTORED'; productId: string; dataUrl: string; runId: string; version: number }
  | { type: 'IMAGE_FAIL'; productId: string; error: string }
  | { type: 'IMAGE_QUOTA'; productId: string }
  | { type: 'SESSION_CAP'; productId: string }
  | { type: 'REGENERATE'; productId: string }
  | { type: 'KEEP'; productId: string }
  | { type: 'REJECT'; productId: string }
  | { type: 'REPLACE_OK'; product: ProductProposal }
  | { type: 'REPLACE_NONE' }
  | { type: 'REPLACE_CLEAR' }
  | { type: 'UNDO_REJECT'; productId: string }
  | { type: 'COLLABS_READY'; collabs: CollabSuggestion[]; cityNote?: string }
  | { type: 'COLLABS_LOADING' }
  | { type: 'GENERIC_READY'; generic: Array<{ name: string; reason: string }> }
  | { type: 'GENERIC_LOADING'; loading: boolean }
  | { type: 'SET_MAX_IMAGES'; max: number }
  | { type: 'HYDRATED'; state: StudioState }
  | { type: 'ERROR'; error: { code: string; message: string } }
  | { type: 'RESET' }
  | { type: 'RESET_PROFILE' }

function mapProduct(state: StudioState, id: string, fn: (p: ProductProposal) => ProductProposal): ProductProposal[] {
  return state.products.map((p) => (p.id === id ? fn(p) : p))
}

function pushHistory(p: ProductProposal, text: string): ProductProposal {
  return {
    ...p,
    description: {
      ...p.description,
      history: [...p.description.history, p.description.text].slice(-5),
    },
  }
}

/**
 * Product card state machine (05-BACKEND-SCHEMA):
 * proposed → approved → generating → ready | failed | quota | cap
 * EDIT_TEXT always returns to proposed and marks existing images outdated.
 * IMAGE_REQUESTED is only valid from approved / failed / ready(regenerate).
 */
export function studioReducer(state: StudioState, action: StudioAction): StudioState {
  switch (action.type) {
    case 'RUN_STARTED':
      return {
        ...initialStudioState,
        runId: action.runId,
        maxImages: state.maxImages,
        input: action.input,
        stage: 'profiling',
        agentEvents: [],
      }

    case 'AGENT_EVENT':
      return { ...state, agentEvents: [...state.agentEvents, action.event] }

    case 'PROFILE_READY':
      return { ...state, stage: 'profile_ready', profile: action.profile, lastError: null }

    case 'CHIP_REMOVED': {
      if (!state.profile) return state
      const tags = state.profile.tags.filter((_, i) => i !== action.index)
      return { ...state, profile: { ...state.profile, tags } }
    }

    case 'CHIP_ADDED': {
      if (!state.profile) return state
      if (state.profile.tags.some((t) => t.name.toLowerCase() === action.tag.name.toLowerCase())) return state
      return {
        ...state,
        profile: {
          ...state.profile,
          tags: [...state.profile.tags, { name: action.tag.name, qlooTagId: action.tag.qlooTagId, weight: 0.6, source: 'qloo' }],
        },
      }
    }

    case 'COLLECTION_REQUESTED':
      return { ...state, stage: 'building', lastError: null }

    case 'COLLECTION_READY':
      return {
        ...state,
        stage: 'collection',
        products: action.products,
        dropPlan: action.dropPlan,
        collectionMeta: action.meta,
      }

    case 'EDIT_TEXT':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({
          ...pushHistory(p, action.text),
          name: p.name,
          description: {
            ...p.description,
            text: action.text,
            version: p.description.version + 1,
            source: action.source,
          },
          decision: 'pending',
          image: p.image.status === 'ready' || p.image.dataUrl ? { ...p.image, outdated: true } : p.image,
        })),
      }

    case 'TWEAK_OK':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({
          ...pushHistory(p, action.text),
          description: {
            ...p.description,
            text: action.text,
            version: p.description.version + 1,
            source: action.source,
          },
          decision: 'pending',
          image: p.image.status === 'ready' || p.image.dataUrl ? { ...p.image, outdated: true } : p.image,
        })),
      }

    case 'UNDO_TEXT':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => {
          const history = [...p.description.history]
          const previous = history.pop()
          if (previous === undefined) return p
          return {
            ...p,
            description: { ...p.description, text: previous, version: Math.max(1, p.description.version - 1), history },
            decision: 'pending',
            image: p.image.outdated ? p.image : p.image,
          }
        }),
      }

    case 'APPROVE':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({ ...p, decision: 'approved' })),
      }

    case 'IMAGE_REQUESTED':
      // THE GATE: only valid from approved (or retained-approval states)
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => {
          if (p.decision !== 'approved' && p.image.status !== 'failed') {
            return p
          }
          return { ...p, image: { ...p.image, status: 'generating', error: undefined } }
        }),
      }

    case 'IMAGE_OK':
      if (state.runId !== action.runId || !state.products.some((p) => p.id === action.productId && p.description.version === action.version)) return state
      return {
        ...state,
        imagesGenerated: state.imagesGenerated + 1,
        products: mapProduct(state, action.productId, (p) => ({
          ...p,
          image: {
            status: 'ready',
            dataUrl: action.dataUrl,
            attempts: p.image.attempts + 1,
            outdated: false,
          },
        })),
      }

    case 'IMAGE_RESTORED':
      if (state.runId !== action.runId) return state
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => p.description.version === action.version
          ? { ...p, image: { ...p.image, status: 'ready', dataUrl: action.dataUrl, outdated: false, error: undefined } }
          : p),
      }

    case 'IMAGE_FAIL':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({
          ...p,
          image: { ...p.image, status: 'failed', error: action.error },
        })),
      }

    case 'IMAGE_QUOTA':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({
          ...p,
          image: { ...p.image, status: 'quota' },
        })),
      }

    case 'SESSION_CAP':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({
          ...p,
          image: { ...p.image, status: 'cap' },
        })),
      }

    case 'REGENERATE':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => {
          if (p.image.attempts >= 3) return p
          return { ...p, image: { ...p.image, status: 'generating', error: undefined } }
        }),
      }

    case 'KEEP':
      return {
        ...state,
        products: mapProduct(state, action.productId, (p) => ({ ...p, decision: 'approved' })),
      }

    case 'REJECT':
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.productId),
        rejectedIds: [...state.rejectedIds, action.productId],
      }

    case 'REPLACE_OK': {
      const products = [...state.products, action.product]
      return {
        ...state,
        products,
        dropPlan: state.dropPlan
          ? {
              ...state.dropPlan,
              steps: state.dropPlan.steps.map((s) =>
                s.wave === 'core' && !s.productIds.includes(action.product.id)
                  ? { ...s, productIds: [...s.productIds, action.product.id], runSizes: { ...s.runSizes, [action.product.id]: action.product.pricing.minRun } }
                  : s
              ),
            }
          : state.dropPlan,
      }
    }

    case 'REPLACE_NONE':
      return { ...state, replaceNote: 'No more good matches for this budget' }

    case 'REPLACE_CLEAR':
      return { ...state, replaceNote: undefined }

    case 'UNDO_REJECT':
      return {
        ...state,
        rejectedIds: state.rejectedIds.filter((id) => id !== action.productId),
        lastError: null,
      }

    case 'COLLABS_LOADING':
      return { ...state }

    case 'COLLABS_READY':
      return { ...state, collabs: action.collabs, cityNote: action.cityNote }

    case 'GENERIC_LOADING':
      return { ...state, genericLoading: action.loading }

    case 'GENERIC_READY':
      return { ...state, generic: action.generic, genericLoading: false }

    case 'SET_MAX_IMAGES':
      return { ...state, maxImages: action.max }

    case 'HYDRATED':
      return action.state

    case 'ERROR':
      return { ...state, lastError: action.error }

    case 'RESET_PROFILE':
      return {
        ...state,
        stage: 'profiling',
        agentEvents: [],
        profile: null,
        products: [],
        dropPlan: null,
        collabs: null,
        generic: null,
        lastError: null,
      }

    case 'RESET':
      return { ...initialStudioState, maxImages: state.maxImages }

    default:
      return state
  }
}

/** Persisted (text-only) shape — images never go into sessionStorage. */
export interface PersistedState {
  v: 2
  runId?: string | null
  stage: StudioStage
  input: StudioInput | null
  agentEvents: AgentEvent[]
  profile: TasteProfile | null
  products: Array<ProductProposal & { image: { status: string; attempts: number; outdated: boolean; error?: string } }>
  dropPlan: DropPlan | null
  collabs: CollabSuggestion[] | null
  cityNote?: string
  generic: Array<{ name: string; reason: string }> | null
  imagesGenerated: number
  rejectedIds: string[]
  collectionMeta?: { descriptionSource: 'llm' | 'template'; notes: string[] }
}

const STORAGE_KEY = 'merchdesk:v2'

export function persistState(state: StudioState) {
  if (typeof window === 'undefined') return
  try {
    const persisted: PersistedState = {
      v: 2,
      runId: state.runId,
      stage: state.stage,
      input: state.input,
      agentEvents: state.agentEvents,
      profile: state.profile,
      // strip image data URLs — memory only
      products: state.products.map((p) => ({
        ...p,
        image: {
          status: p.image.dataUrl ? 'ready' : p.image.status,
          attempts: p.image.attempts,
          outdated: p.image.outdated,
          ...(p.image.error ? { error: p.image.error } : {}),
        },
      })),
      dropPlan: state.dropPlan,
      collabs: state.collabs,
      cityNote: state.cityNote,
      generic: state.generic,
      imagesGenerated: state.imagesGenerated,
      rejectedIds: state.rejectedIds,
      collectionMeta: state.collectionMeta,
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persisted))
  } catch {
    // quota exceeded or unavailable — non-fatal
  }
}

export function loadPersistedState(): StudioState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PersistedState
    if (parsed.v !== 2) return null
    return {
      runId: parsed.runId ?? null,
      stage: parsed.stage,
      input: parsed.input,
      agentEvents: parsed.agentEvents ?? [],
      profile: parsed.profile,
      products: (parsed.products ?? []).map((p) => ({
        ...p,
        image: {
          status: p.image?.status === 'ready' ? 'idle' : p.image?.status === 'generating' ? 'failed' : p.image?.status ?? 'idle',
          attempts: p.image?.attempts ?? 0,
          outdated: p.image?.outdated ?? false,
          error: p.image?.status === 'ready' ? 'Saved image unavailable — regenerate to restore it.' : p.image?.status === 'generating' ? 'Generation was interrupted — try again.' : p.image?.error,
        },
      })),
      dropPlan: parsed.dropPlan,
      collabs: parsed.collabs,
      cityNote: parsed.cityNote,
      generic: parsed.generic,
      genericLoading: false,
      imagesGenerated: parsed.imagesGenerated ?? 0,
      maxImages: initialStudioState.maxImages,
      rejectedIds: parsed.rejectedIds ?? [],
      lastError: null,
      collectionMeta: parsed.collectionMeta,
    }
  } catch {
    return null
  }
}
