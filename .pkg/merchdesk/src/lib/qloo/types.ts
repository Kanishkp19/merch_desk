import type { EntityType } from '@/types'

/**
 * Normalized Qloo shapes — everything downstream consumes these.
 */
export interface QlooEntity {
  id: string
  name: string
  type: EntityType
  weight: number // 0..1
  tags: string[]
  imageUrl?: string
  location?: string
}

export interface QlooTag {
  id: string
  name: string
  weight: number // 0..1
}

export interface SearchOptions {
  type?: 'artist' | 'brand' | 'place'
  take?: number
}

export interface TasteTagsOptions {
  entityIds?: string[]
  tagIds?: string[]
  take?: number
}

export interface RelatedOptions {
  type: EntityType
  entityIds?: string[]
  tagIds?: string[]
  location?: string
  excludeEntityIds?: string[]
  take?: number
}

/** Raw (believed) Qloo response rows — only lib/qloo/client.ts sees these. */
export interface RawQlooEntity {
  entity_id?: string
  id?: string
  name?: string
  type?: string
  affinity?: number
  score?: number
  tags?: unknown
  image_url?: string
  location?: string
  properties?: Record<string, unknown>
}

export interface RawQlooResponse {
  results?: { entities?: RawQlooEntity[] } & Record<string, unknown>
  entities?: RawQlooEntity[]
  tags?: Array<{ tag_id?: string; id?: string; name?: string; affinity?: number; score?: number }>
  insights?: Array<RawQlooEntity & { tag?: { name?: string } }>
}
