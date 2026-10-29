import type { AgentEvent, EntityType, StudioInput } from '@/types'
import type { QlooEntity, QlooTag } from '@/lib/qloo/types'

/**
 * Server-side memory of everything Qloo returned in a run.
 * The final TasteProfile is assembled from this by code — never by the LLM.
 */
export class AgentMemory {
  entities = new Map<string, QlooEntity>()
  tags = new Map<string, QlooTag>()
  seedEntityIds: string[] = []
  seedTagIds: string[] = []
  artistEntity: QlooEntity | null = null
  toolCallCount = 0

  addEntities(list: QlooEntity[]) {
    for (const e of list) {
      if (!this.entities.has(e.id)) this.entities.set(e.id, e)
    }
  }

  addTags(list: QlooTag[], asSeeds = false) {
    for (const t of list) {
      if (!this.tags.has(t.id)) this.tags.set(t.id, t)
      if (asSeeds && !this.seedTagIds.includes(t.id)) this.seedTagIds.push(t.id)
    }
  }

  markSeedEntity(id: string) {
    if (this.entities.has(id) && !this.seedEntityIds.includes(id)) this.seedEntityIds.push(id)
  }

  entitiesOfType(type: EntityType): QlooEntity[] {
    return Array.from(this.entities.values()).filter((e) => e.type === type)
  }

  knownIds(): Set<string> {
    return new Set([...this.entities.keys(), ...this.tags.keys()])
  }
}

export interface ToolExecContext {
  memory: AgentMemory
  input: StudioInput
  emit: (event: AgentEvent) => void
  onQlooCall: () => void
}

export interface ToolSpec {
  name: string
  argNames: string[]
  describeArgs: (args: Record<string, unknown>) => string
  execute: (args: Record<string, unknown>, ctx: ToolExecContext) => Promise<{ summary: string; count: number }>
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
}

const CROSS_TYPES = ['brand', 'videogame', 'tv_show', 'movie', 'book', 'podcast'] as const

export const TOOLS: ToolSpec[] = [
  {
    name: 'qloo_search_entity',
    argNames: ['query', 'type'],
    describeArgs: (a) => `"${asString(a.query)}" (${asString(a.type) || 'artist'})`,
    async execute(args, ctx) {
      const type = (['artist', 'brand', 'place'] as const).includes(asString(args.type) as 'artist')
        ? (asString(args.type) as 'artist' | 'brand' | 'place')
        : 'artist'
      const query = asString(args.query).trim()
      if (!query) return { summary: 'No query provided', count: 0 }
      ctx.onQlooCall()
      const { searchEntities } = await import('@/lib/qloo/client')
      const found = await searchEntities(query, { type, take: 5 })
      ctx.memory.addEntities(found)
      if (type === 'artist' && found.length > 0) {
        // first artist result becomes the seed entity
        ctx.memory.markSeedEntity(found[0].id)
        ctx.memory.artistEntity = found[0]
      }
      if (found.length === 0) return { summary: `No match for "${query}"`, count: 0 }
      return { summary: `Found ${found[0].name}${found.length > 1 ? ` +${found.length - 1} more` : ''} (${type})`, count: found.length }
    },
  },
  {
    name: 'qloo_search_tags',
    argNames: ['query'],
    describeArgs: (a) => `"${asString(a.query)}"`,
    async execute(args, ctx) {
      const query = asString(args.query).trim()
      if (!query) return { summary: 'No query provided', count: 0 }
      ctx.onQlooCall()
      const { searchTags } = await import('@/lib/qloo/client')
      const tags = await searchTags(query, 5)
      ctx.memory.addTags(tags, true)
      if (tags.length === 0) return { summary: `No tags for "${query}"`, count: 0 }
      return { summary: `Matched tags: ${tags.slice(0, 3).map((t) => t.name).join(', ')}`, count: tags.length }
    },
  },
  {
    name: 'qloo_taste_tags',
    argNames: ['entityIds', 'tagIds'],
    describeArgs: (a) => {
      const e = asStringArray(a.entityIds).length
      const t = asStringArray(a.tagIds).length
      return `${e} entit${e === 1 ? 'y' : 'ies'} / ${t} tags`
    },
    async execute(args, ctx) {
      let entityIds = asStringArray(args.entityIds)
      let tagIds = asStringArray(args.tagIds)
      // IDs must exist in memory — replace unknown with known seeds
      const known = ctx.memory.knownIds()
      entityIds = entityIds.filter((id) => known.has(id))
      tagIds = tagIds.filter((id) => known.has(id))
      if (ctx.memory.seedEntityIds.length > 0) entityIds = [...new Set([...entityIds, ...ctx.memory.seedEntityIds])]
      if (ctx.memory.seedTagIds.length > 0) tagIds = [...new Set([...tagIds, ...ctx.memory.seedTagIds])]
      if (entityIds.length === 0 && tagIds.length === 0) {
        return { summary: 'No seed ids available yet', count: 0 }
      }
      ctx.onQlooCall()
      const { tasteTags } = await import('@/lib/qloo/client')
      const tags = await tasteTags({ entityIds, tagIds, take: 15 })
      ctx.memory.addTags(tags)
      if (tags.length === 0) return { summary: 'No taste tags returned', count: 0 }
      return { summary: `Audience taste tags: ${tags.slice(0, 4).map((t) => t.name).join(', ')}…`, count: tags.length }
    },
  },
  {
    name: 'qloo_related',
    argNames: ['type', 'entityIds', 'tagIds'],
    describeArgs: (a) => `${asString(a.type) || 'brand'}`,
    async execute(args, ctx) {
      const type = asString(args.type) as (typeof CROSS_TYPES)[number]
      if (!CROSS_TYPES.includes(type)) return { summary: `Unknown type "${type}"`, count: 0 }
      let entityIds = asStringArray(args.entityIds)
      let tagIds = asStringArray(args.tagIds)
      const known = ctx.memory.knownIds()
      entityIds = entityIds.filter((id) => known.has(id))
      tagIds = tagIds.filter((id) => known.has(id))
      if (entityIds.length === 0) entityIds = ctx.memory.seedEntityIds
      if (tagIds.length === 0) tagIds = ctx.memory.seedTagIds.slice(0, 6)
      ctx.onQlooCall()
      const { related } = await import('@/lib/qloo/client')
      const entities = await related({ type, entityIds, tagIds, take: 10 })
      ctx.memory.addEntities(entities)
      if (entities.length === 0) return { summary: `No related ${type.replace('_', ' ')}s found`, count: 0 }
      return { summary: `${entities.length} related ${type.replace('_', ' ')}s`, count: entities.length }
    },
  },
  {
    name: 'note',
    argNames: ['text'],
    describeArgs: (a) => asString(a.text).slice(0, 60),
    async execute() {
      return { summary: '', count: 0 }
    },
  },
  {
    name: 'finish',
    argNames: ['path', 'summary'],
    describeArgs: () => '',
    async execute() {
      return { summary: '', count: 0 }
    },
  },
]

export const TOOL_NAMES = TOOLS.map((t) => t.name)
