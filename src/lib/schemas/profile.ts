import { z } from 'zod'
import { entityTypeSchema, priceTierSchema } from './input'

export const weightedTagSchema = z.object({
  name: z.string().min(1).max(80),
  qlooTagId: z.string().max(120).optional(),
  canonical: z.string().max(40).optional(),
  weight: z.number().min(0).max(1),
  source: z.enum(['qloo', 'llm_estimate', 'user']),
})

export const affinityEntitySchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  type: entityTypeSchema,
  weight: z.number().min(0).max(1),
  tags: z.array(z.string().max(80)).max(20),
  canonicalTags: z.array(z.string().max(40)).max(10),
  brandCategories: z.array(z.string().max(40)).max(5).optional(),
  priceTier: priceTierSchema.optional(),
  estimated: z.boolean(),
  imageUrl: z.string().url().optional(),
  location: z.string().max(160).optional(),
})

export const tasteProfileSchema = z.object({
  path: z.enum(['A_artist_found', 'B_description']),
  artist: z.object({ id: z.string(), name: z.string() }).optional(),
  seeds: z.object({ entityIds: z.array(z.string().max(120)).max(20), tagIds: z.array(z.string().max(120)).max(20) }),
  tags: z.array(weightedTagSchema).max(30),
  brands: z.array(affinityEntitySchema).max(20),
  crossDomain: z.array(affinityEntitySchema).max(30),
  inspirationPlaces: z.array(affinityEntitySchema).max(15),
  priceTier: priceTierSchema,
  priceTierEstimated: z.boolean(),
  paletteId: z.string().max(40),
  notes: z.array(z.string().max(200)).max(10),
  agentMode: z.enum(['llm_agent', 'scripted_fallback']),
  qlooCalls: z.number().int().min(0).max(40),
})
export type TasteProfileZ = z.infer<typeof tasteProfileSchema>
