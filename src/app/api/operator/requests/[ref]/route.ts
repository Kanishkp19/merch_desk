import { z } from 'zod'
import { handle, jsonOk, ApiError } from '@/lib/http/errors'
import { operatorPatchSchema } from '@/lib/launch/schemas'
import { db } from '@/lib/db'
import { requireOperator } from '@/lib/http/operator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Working {
  events: Array<{ id: string; at: string; actor: string; type: string; text: string; statusAfter?: string }>
  quotes: Array<Record<string, unknown>>
}

export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return handle(async () => {
    requireOperator(req)
    const { ref } = await ctx.params
    const record = await db.launchRequest.findUnique({ where: { id: ref.toUpperCase() } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    return jsonOk({
      ref: record.id,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      payload: JSON.parse(record.payload),
      working: JSON.parse(record.working),
    })
  })
}

/** Record one operator action: status change, note, info request, or a quote
 * (revisions stay distinguishable — each gets an incrementing revision number). */
export async function PATCH(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return handle(async () => {
    requireOperator(req)
    const { ref } = await ctx.params
    const patch = operatorPatchSchema.parse(await req.json())

    const record = await db.launchRequest.findUnique({ where: { id: ref.toUpperCase() } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    const working = JSON.parse(record.working) as Working
    working.events ??= []
    working.quotes ??= []

    let nextStatus = record.status
    let text = ''
    let type: string = patch.type

    switch (patch.type) {
      case 'status':
        nextStatus = patch.status
        text = patch.note?.trim() || `Status set to ${patch.status}.`
        type = 'status_change'
        break
      case 'note':
        text = patch.text
        break
      case 'info_request':
        nextStatus = 'needs_info'
        text = patch.text
        break
      case 'quote': {
        const revision = working.quotes.filter((q) => q.supplier === patch.supplier).length + 1
        working.quotes.push({
          id: crypto.randomUUID(),
          supplier: patch.supplier,
          recordedAt: new Date().toISOString(),
          currency: 'INR',
          unitCost: patch.unitCost,
          setupCost: patch.setupCost,
          minQuantity: patch.minQuantity,
          leadTimeDays: patch.leadTimeDays,
          ...(patch.validUntil ? { validUntil: patch.validUntil } : {}),
          includes: patch.includes,
          excludes: patch.excludes,
          ...(patch.evidenceNote ? { evidenceNote: patch.evidenceNote } : {}),
          revision,
        })
        nextStatus = 'quote_ready'
        text = `Quote recorded from ${patch.supplier} (revision ${revision}).`
        break
      }
      case 'creator_decision':
        text = `Creator ${patch.decision} the quote — creator's decision only; supplier acceptance, payment and production are separate.`
        break
      case 'sample_decision':
        text = patch.note?.trim() || (patch.approved ? 'Sample approved by creator.' : 'Sample rejected by creator.')
        break
      case 'production_decision':
        text = patch.note?.trim() || (patch.authorized ? 'Production authorized by creator.' : 'Production NOT authorized.')
        break
    }

    working.events.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: 'operator',
      type,
      text,
      ...(nextStatus !== record.status ? { statusAfter: nextStatus } : {}),
    })

    const updated = await db.launchRequest.update({
      where: { id: record.id },
      data: { status: nextStatus, working: JSON.stringify(working) },
    })
    return jsonOk({ ref: updated.id, status: updated.status })
  })
}
