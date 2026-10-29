import type {
  AgentEvent,
  ApiErrorBody,
  StudioInput,
  StudioStatus,
  TasteProfile,
  ProductProposal,
  CollabSuggestion,
  DropPlan,
} from '@/types'
import { readSseStream } from '@/lib/http/sse'

export class ApiClientError extends Error {
  code: string
  retryAfterSec?: number
  status: number

  constructor(code: string, message: string, status: number, retryAfterSec?: number) {
    super(message)
    this.name = 'ApiClientError'
    this.code = code
    this.status = status
    this.retryAfterSec = retryAfterSec
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: ApiErrorBody['error'] } | null
    throw new ApiClientError(
      body?.error?.code ?? 'INTERNAL',
      body?.error?.message ?? 'Something went wrong.',
      res.status,
      body?.error?.retryAfterSec
    )
  }
  const json = (await res.json()) as { data: T }
  return json.data
}

/** Generic JSON call for launch/operator endpoints. */
export function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  return api<T>(path, init)
}

export const apiGetStatus = () => api<StudioStatus>('/api/status')

export interface SearchResult {
  id: string
  name: string
  type?: string
  imageUrl?: string
  hint?: string
}

export const apiSearch = (q: string, kind: 'entity' | 'tag' = 'entity', type: 'artist' | 'brand' | 'place' = 'artist') =>
  api<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(q)}&kind=${kind}&type=${type}`)

/** POST + SSE reader for the agent run. */
export async function apiAgentProfile(
  input: StudioInput,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  const res = await fetch('/api/agent/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: ApiErrorBody['error'] } | null
    throw new ApiClientError(
      body?.error?.code ?? 'INTERNAL',
      body?.error?.message ?? 'Something went wrong.',
      res.status,
      body?.error?.retryAfterSec
    )
  }
  await readSseStream(res, onEvent)
}

export interface CollectionResponse {
  products: ProductProposal[]
  dropPlan: DropPlan
  meta: { descriptionSource: 'llm' | 'template'; notes: string[] }
}

export const apiCollection = (input: StudioInput, profile: TasteProfile) =>
  api<CollectionResponse>('/api/collection', { method: 'POST', body: JSON.stringify({ input, profile }) })

export const apiDescribe = (body: {
  productId: string
  currentDescription: string
  instruction: string
  paletteId: string
  profileTags: string[]
}) => api<{ description: string; source: string }>('/api/describe', { method: 'POST', body: JSON.stringify(body) })

export const apiReplace = (body: Record<string, unknown>) =>
  api<{ product: ProductProposal | null; profileDelta: { brands: unknown[]; crossDomain: unknown[] }; note: string }>(
    '/api/replace',
    { method: 'POST', body: JSON.stringify(body) }
  )

export const apiImage = (body: {
  productId: string
  approved: true
  approvedDescription: string
  paletteId: string
  attempt: number
  artistName?: string
  brandNames: string[]
}) =>
  api<{ imageDataUrl: string; model: string; attempt: number; moderationNote?: string }>('/api/image', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const apiCollabs = (body: { profile: TasteProfile; city: string; productIds: string[] }) =>
  api<{ collabs: CollabSuggestion[]; cityNote?: string }>('/api/collabs', {
    method: 'POST',
    body: JSON.stringify(body),
  })

export const apiCompare = (body: { input: StudioInput; count?: number }) =>
  api<{ generic: Array<{ name: string; reason: string }>; provider: string }>('/api/compare', {
    method: 'POST',
    body: JSON.stringify(body),
  })
