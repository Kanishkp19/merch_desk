import { z } from 'zod'
import { studioInputSchema, budgetTierSchema, creatorTypeSchema, pilotCitySchema } from './input'
import { tasteProfileSchema } from './profile'

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(80),
  kind: z.enum(['entity', 'tag']).default('entity'),
  type: z.enum(['artist', 'brand', 'place']).default('artist'),
})

export const agentProfileBodySchema = studioInputSchema

export const collectionBodySchema = z.object({
  input: studioInputSchema,
  profile: tasteProfileSchema,
})

export const tweakInstructionSchema = z.enum([
  'more_minimal',
  'bolder_colours',
  'more_vintage',
  'darker_palette',
  'simpler_design',
  'more_playful',
])

export const describeBodySchema = z.object({
  productId: z.string(),
  currentDescription: z.string().trim().min(10).max(600),
  instruction: tweakInstructionSchema,
  paletteId: z.string(),
  profileTags: z.array(z.string().max(40)).max(10),
})

export const replaceBodySchema = z.object({
  input: studioInputSchema,
  profile: tasteProfileSchema,
  currentProductIds: z.array(z.string()).min(1).max(12),
  rejectedProductId: z.string(),
  excludeEntityIds: z.array(z.string()).max(30),
  positiveEntityIds: z.array(z.string()).max(30).default([]),
  budget: budgetTierSchema,
  creatorType: creatorTypeSchema,
})

export const imageBodySchema = z.object({
  productId: z.string(),
  approved: z.literal(true),
  approvedDescription: z.string().trim().min(10).max(600),
  paletteId: z.string(),
  attempt: z.number().int().min(1).max(3),
  artistName: z.string().max(120).optional(),
  brandNames: z.array(z.string().max(160)).max(30).default([]),
})

export const collabsBodySchema = z.object({
  profile: tasteProfileSchema,
  city: pilotCitySchema,
  productIds: z.array(z.string()).max(12),
})

export const compareBodySchema = z.object({
  input: studioInputSchema,
  count: z.number().int().min(5).max(8).default(6),
})
