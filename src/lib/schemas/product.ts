import { z } from 'zod'
import { productCategorySchema, productRoleSchema, silhouetteSchema } from './input'

export const descriptionSchema = z.object({
  text: z.string().trim().min(10).max(600),
  version: z.number().int().min(1),
  history: z.array(z.string().max(600)).max(5),
  source: z.enum(['llm', 'template', 'user']),
})

export const llmDescribeItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(60),
  oneLiner: z.string().min(5).max(120),
  visualDescription: z.string().refine(
    (s) => {
      const n = s.trim().split(/\s+/).length
      return n >= 40 && n <= 70
    },
    'Must be 40–70 words'
  ),
})
export const llmDescribeSchema = z.object({ items: z.array(llmDescribeItemSchema).min(1).max(8) })

export const pricingSchema = z.object({
  unitCost: z.number().nonnegative(),
  price: z.number().positive(),
  marginPerUnit: z.number(),
  minRun: z.number().int().positive(),
  setupCost: z.number().nonnegative(),
  firstRunCost: z.number().nonnegative(),
  breakEvenUnits: z.number().int().positive().nullable(),
  typicalRange: z.tuple([z.number(), z.number()]),
  estimate: z.literal(true),
})

export const evidenceSchema = z.object({
  kind: z.enum(['tag', 'brand', 'cross_domain']),
  label: z.string().max(80),
  entityName: z.string().max(160).optional(),
  entityId: z.string().max(120).optional(),
  points: z.number(),
  estimated: z.boolean(),
})

export const productImageSchema = z.object({
  status: z.enum(['idle', 'generating', 'ready', 'failed', 'quota', 'cap']),
  dataUrl: z.string().optional(),
  attempts: z.number().int().min(0).max(3),
  outdated: z.boolean(),
  error: z.string().optional(),
})

export const productProposalSchema = z.object({
  id: z.string(),
  name: z.string(),
  oneLiner: z.string(),
  category: productCategorySchema,
  role: productRoleSchema,
  silhouette: silhouetteSchema,
  fitScore: z.number().min(0).max(100),
  scoreParts: z.object({ tag: z.number(), brand: z.number(), cross: z.number() }),
  evidence: z.array(evidenceSchema).max(3),
  pricing: pricingSchema,
  supplierType: z.string(),
  supplierBrief: z.string(),
  complianceNote: z.string().optional(),
  description: descriptionSchema,
  decision: z.enum(['pending', 'approved', 'rejected']),
  image: productImageSchema,
  replacedFrom: z.string().optional(),
})
export type ProductProposalZ = z.infer<typeof productProposalSchema>
