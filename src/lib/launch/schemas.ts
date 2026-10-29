import { z } from 'zod'

/** API boundary schemas for quote requests and operator updates. */

export const quoteRequestPayloadSchema = z.object({
  launchName: z.string().trim().min(1).max(120),
  brief: z.object({
    projectName: z.string().trim().min(1).max(120),
    purpose: z.string().trim().min(1).max(600),
    city: z.string().trim().min(1).max(80),
    targetDate: z.string().max(40),
    sellingChannel: z.string().max(40),
    fulfilment: z.string().max(40),
    artworkReadiness: z.string().max(40),
  }),
  lines: z
    .array(
      z.object({
        productId: z.string().min(1).max(80),
        name: z.string().min(1).max(160),
        quantityOrdered: z.number().int().min(1).max(100000),
        sellPrice: z.number().int().min(0),
        unitCostKnown: z.boolean(),
        artworkReady: z.boolean(),
        supplierBrief: z.string().max(1000),
        gstRatePct: z.number().min(0).max(100),
      })
    )
    .min(1, 'Add at least one product before requesting a quote')
    .max(12),
  targetDateKnown: z.boolean(),
  deliveryRegion: z.string().trim().min(1).max(200),
  costAssumptions: z.object({
    estimatedSetupTotal: z.number().int().min(0),
    estimatedUnitCostRange: z.tuple([z.number().int().min(0), z.number().int().min(0)]),
    pricesIncludeGst: z.boolean(),
    unconfirmedCount: z.number().int().min(0),
  }),
  notes: z.string().max(2000).optional(),
  contact: z.object({
    name: z.string().trim().min(1, 'Your name is required').max(120),
    email: z.string().trim().email('A valid email is required'),
    phone: z.string().trim().max(20).optional(),
    shareWithSuppliers: z.literal(true, { error: 'We need your consent to share this request with suppliers' }),
    consentText: z.string().min(10),
  }),
})
export type QuoteRequestPayloadZ = z.infer<typeof quoteRequestPayloadSchema>

export const submitLaunchSchema = z.object({
  clientRequestId: z.string().min(8).max(64),
  planId: z.string().min(4).max(64),
  payload: quoteRequestPayloadSchema,
})
export type SubmitLaunchZ = z.infer<typeof submitLaunchSchema>

export const operatorPatchSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('status'),
    status: z.enum(['submitted', 'needs_info', 'quote_ready', 'closed']),
    note: z.string().max(1000).optional(),
  }),
  z.object({
    type: z.literal('note'),
    text: z.string().trim().min(1).max(2000),
  }),
  z.object({
    type: z.literal('info_request'),
    text: z.string().trim().min(1).max(2000),
  }),
  z.object({
    type: z.literal('quote'),
    supplier: z.string().trim().min(1).max(160),
    unitCost: z.number().int().min(0),
    setupCost: z.number().int().min(0),
    minQuantity: z.number().int().min(1),
    leadTimeDays: z.number().int().min(0).nullable(),
    validUntil: z.string().max(40).optional(),
    includes: z.array(z.string().max(160)).max(20).default([]),
    excludes: z.array(z.string().max(160)).max(20).default([]),
    evidenceNote: z.string().max(1000).optional(),
  }),
  z.object({
    type: z.literal('creator_decision'),
    quoteId: z.string().min(1),
    decision: z.enum(['accepted', 'declined']),
  }),
  z.object({
    type: z.literal('sample_decision'),
    approved: z.boolean(),
    note: z.string().max(1000).optional(),
  }),
  z.object({
    type: z.literal('production_decision'),
    authorized: z.boolean(),
    note: z.string().max(1000).optional(),
  }),
])
export type OperatorPatchZ = z.infer<typeof operatorPatchSchema>

/** Creator-side actions on their own request (creator-key holder).
 * Quote acceptance, sample approval and production authorization are three
 * separate, individually-acknowledged creator decisions — none implies another. */
export const CREATOR_SAMPLE_ACK =
  'I have reviewed the sample myself and this approval is only about the sample'
export const CREATOR_PRODUCTION_ACK =
  'I understand this authorizes production spending and does not guarantee supplier delivery'
export const creatorActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('quote_decision'),
    quoteId: z.string().min(1),
    decision: z.enum(['accepted', 'declined']),
    ackText: z.literal(
      'I understand this does not commit the supplier, start production, or guarantee delivery',
      { error: 'Please tick the acknowledgement' }
    ),
  }),
  z.object({
    type: z.literal('sample_decision'),
    approved: z.boolean(),
    note: z.string().max(1000).optional(),
    ackText: z.literal(CREATOR_SAMPLE_ACK, { error: 'Please tick the sample acknowledgement' }),
  }),
  z.object({
    type: z.literal('production_decision'),
    authorized: z.boolean(),
    note: z.string().max(1000).optional(),
    ackText: z.literal(CREATOR_PRODUCTION_ACK, { error: 'Please tick the production acknowledgement' }),
  }),
  /** Creator's answer to an operator information request. */
  z.object({
    type: z.literal('info_reply'),
    text: z.string().trim().min(1, 'Write an answer before sending').max(2000),
  }),
])
export type CreatorActionZ = z.infer<typeof creatorActionSchema>
