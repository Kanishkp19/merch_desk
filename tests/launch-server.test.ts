import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { ApiError } from '@/lib/http/errors'
import { submitLaunchSchema } from '@/lib/launch/schemas'
import type { SubmitLaunchZ } from '@/lib/launch/schemas'

// Each run gets a unique temporary database OUTSIDE the development db/
// directory, and the Prisma client is resolved fresh for that URL — dev and
// test configurations never share a client.
const testTmpDir = mkdtempSync(path.join(tmpdir(), 'merchdesk-server-test-'))
process.env.DATABASE_URL = `file:${path.join(testTmpDir, 'merchdesk-server-test.db')}`
process.env.OPERATOR_KEY = 'test-operator-key'

const { db, resolvedDatabaseFile } = await import('@/lib/db')

// Fail closed before any destructive setup: the resolved database file must
// belong to THIS run's temp directory, or the tests stop instead of dropping
// tables in the development database.
const testDbFile = path.resolve(resolvedDatabaseFile() ?? '')
if (!testDbFile.startsWith(testTmpDir + path.sep)) {
  throw new Error(
    `Refusing destructive setup: resolved test database "${testDbFile}" is not inside this run's temp directory "${testTmpDir}".`
  )
}
afterAll(() => {
  rmSync(testTmpDir, { recursive: true, force: true, maxRetries: 3 })
})

const { submitLaunchRequest, applyOperatorPatch, applyCreatorAction, issueCreatorKey, creatorView } = await import(
  '@/lib/launch/server'
)
const { requireCreator, sha256Hex } = await import('@/lib/http/creator')

const before = new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10) // yesterday

function submitInput(n: string, artworkReady = true): SubmitLaunchZ {
  return submitLaunchSchema.parse({
    clientRequestId: `test-${n}`,
    planId: `plan-${n}`,
    payload: {
      launchName: `Test launch ${n}`,
      brief: {
        projectName: 'Project',
        purpose: 'Pilot test run',
        city: 'Bengaluru',
        targetDate: '',
        sellingChannel: 'in_person',
        fulfilment: 'self',
        artworkReadiness: 'ready',
      },
      lines: [
        {
          productId: 'tee',
          name: 'Tee',
          quantityOrdered: 30,
          sellPrice: 50000,
          unitCostKnown: false,
          artworkReady,
          supplierBrief: 'Screen print',
          gstRatePct: 18,
        },
      ],
      targetDateKnown: false,
      deliveryRegion: 'Bengaluru',
      costAssumptions: { estimatedSetupTotal: 80000, estimatedUnitCostRange: [20000, 30000], pricesIncludeGst: true, unconfirmedCount: 2 },
      contact: {
        name: 'Test Creator',
        email: 'creator@example.com',
        shareWithSuppliers: true,
        consentText: 'I consent to sharing this request with suppliers for quotes.',
      },
    },
  })
}

const authedReq = (key: string): Request =>
  new Request('http://localhost/api/launches', { headers: { 'x-creator-key': key } })
const bareReq = (): Request => new Request('http://localhost/api/launches')

async function statusOf(ref: string): Promise<string> {
  const r = await db.launchRequest.findUniqueOrThrow({ where: { id: ref } })
  return r.status
}

beforeAll(async () => {
  await db.$executeRawUnsafe(`DROP TABLE IF EXISTS "LaunchRequest"`)
  await db.$executeRawUnsafe(`CREATE TABLE "LaunchRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "creatorName" TEXT NOT NULL,
    "creatorEmail" TEXT NOT NULL,
    "creatorKeyHash" TEXT,
    "clientRequestId" TEXT NOT NULL,
    "payloadHash" TEXT,
    "payload" TEXT NOT NULL,
    "working" TEXT NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
  )`)
  await db.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "LaunchRequest_clientRequestId_key" ON "LaunchRequest"("clientRequestId")`
  )
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "LaunchRequest_createdAt_idx" ON "LaunchRequest"("createdAt")`)
})

describe('submission idempotency', () => {
  it('returns a creator key once and stores only its hash', async () => {
    const r = await submitLaunchRequest(submitInput('idem-1'))
    expect(r.duplicate).toBe(false)
    expect(r.ref).toMatch(/^MD-[A-Z0-9]{6}$/)
    expect(r.creatorKey).toMatch(/^mdk_/)
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    expect(row.creatorKeyHash).toBe(await sha256Hex(r.creatorKey!))
    expect(row.creatorKeyHash).not.toBe(r.creatorKey)
    expect(row.payloadHash).not.toBeNull()
  })

  it('serves a retry the original record without re-issuing the key', async () => {
    const first = await submitLaunchRequest(submitInput('idem-2'))
    const retry = await submitLaunchRequest(submitInput('idem-2'))
    expect(retry.ref).toBe(first.ref)
    expect(retry.duplicate).toBe(true)
    expect(retry.creatorKey).toBeUndefined()
  })

  it('rejects reuse of an idempotency key with a different payload (409)', async () => {
    await submitLaunchRequest(submitInput('idem-3'))
    const other = submitInput('idem-3')
    other.payload.launchName = 'A genuinely different launch'
    await expect(submitLaunchRequest(other)).rejects.toMatchObject({ code: 'CONFLICT', status: 409 })
  })

  it('handles concurrent duplicate submissions atomically: one row, one ref', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => submitLaunchRequest(submitInput('concurrent-1'))))
    const refs = new Set(results.map((r) => r.ref))
    expect(refs.size).toBe(1)
    const creatorKeys = results.filter((r) => !r.duplicate)
    expect(creatorKeys).toHaveLength(1)
    const rows = await db.launchRequest.findMany({ where: { clientRequestId: 'test-concurrent-1' } })
    expect(rows).toHaveLength(1)
  })
})

describe('creator credential', () => {
  it('accepts the right key, rejects a wrong key, and refuses legacy records', async () => {
    const r = await submitLaunchRequest(submitInput('auth-1'))
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    await expect(requireCreator(authedReq(r.creatorKey!), row)).resolves.toBeUndefined()
    await expect(requireCreator(authedReq('mdk_wrong'), row)).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })
    await expect(requireCreator(bareReq(), row)).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 })

    // legacy record: no credential has ever been issued
    await db.launchRequest.create({
      data: { id: 'MD-LEGACY', creatorName: 'Old', creatorEmail: 'old@example.com', clientRequestId: 'legacy-1', payload: '{}' },
    })
    const legacy = await db.launchRequest.findUniqueOrThrow({ where: { id: 'MD-LEGACY' } })
    await expect(requireCreator(bareReq(), legacy)).rejects.toMatchObject({ code: 'FORBIDDEN', status: 403 })
  })

  it('operator key issuance recovers a legacy record', async () => {
    const { creatorKey } = await issueCreatorKey('MD-LEGACY')
    expect(creatorKey).toMatch(/^mdk_/)
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: 'MD-LEGACY' } })
    await expect(requireCreator(authedReq(creatorKey), row)).resolves.toBeUndefined()
  })
})

describe('concurrent operator and creator updates', () => {
  it('preserves both concurrent operator writes (no lost quote)', async () => {
    const r = await submitLaunchRequest(submitInput('conc-op'))
    const [a, b] = await Promise.all([
      applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] }),
      applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier B', unitCost: 24000, setupCost: 8000, minQuantity: 30, leadTimeDays: null, includes: [], excludes: [] }),
    ])
    expect(a.status).toBe('quote_ready')
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const working = JSON.parse(row.working) as { quotes: Array<{ supplier: string }>; events: unknown[] }
    expect(working.quotes.map((q) => q.supplier).sort()).toEqual(['Supplier A', 'Supplier B'])
    expect(row.version).toBe(2) // create (version 0) + 2 version-checked writes
  })

  it('preserves a creator decision made while the operator writes a note', async () => {
    const r = await submitLaunchRequest(submitInput('conc-mix'))
    await applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const quoteId = (JSON.parse(row.working) as { quotes: Array<{ id: string }> }).quotes[0].id

    await Promise.all([
      applyOperatorPatch(r.ref, { type: 'note', text: 'Supplier A confirmed stock.' }),
      applyCreatorAction(r.ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: 'I understand this does not commit the supplier, start production, or guarantee delivery' }),
    ])
    const after = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const working = JSON.parse(after.working) as { quotes: Array<{ creatorDecision?: string }>; events: Array<{ type: string }> }
    expect(working.quotes[0].creatorDecision).toBe('accepted')
    expect(working.events.some((e) => e.type === 'status_change' || e.type === 'note')).toBe(true)
    expect(working.events.some((e) => e.type === 'creator_decision')).toBe(true)
  })
})

describe('quote decision rules', () => {
  async function quoted(ref: string, validUntil?: string) {
    await applyOperatorPatch(ref, {
      type: 'quote',
      supplier: 'Supplier A',
      unitCost: 25000,
      setupCost: 8000,
      minQuantity: 30,
      leadTimeDays: 10,
      ...(validUntil ? { validUntil } : {}),
      includes: [],
      excludes: [],
    })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: ref } })
    const quotes = (JSON.parse(row.working) as { quotes: Array<{ id: string }> }).quotes
    return quotes[quotes.length - 1].id
  }
  const ACK = 'I understand this does not commit the supplier, start production, or guarantee delivery'

  it('rejects a decision before any quote exists (status not quote_ready)', async () => {
    const r = await submitLaunchRequest(submitInput('rule-early'))
    await expect(
      applyCreatorAction(r.ref, { type: 'quote_decision', quoteId: 'nope', decision: 'accepted', ackText: ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 })
  })

  it('records the decision, then keeps it final on repeat attempts', async () => {
    const r = await submitLaunchRequest(submitInput('rule-final'))
    const quoteId = await quoted(r.ref)
    await applyCreatorAction(r.ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: ACK })
    await expect(
      applyCreatorAction(r.ref, { type: 'quote_decision', quoteId, decision: 'declined', ackText: ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /already accepted/ })
  })

  it('rejects a decision on an expired quote', async () => {
    const r = await submitLaunchRequest(submitInput('rule-expired'))
    const quoteId = await quoted(r.ref, before)
    await expect(
      applyCreatorAction(r.ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /valid until/i })
  })

  it('rejects a decision on a closed request', async () => {
    const r = await submitLaunchRequest(submitInput('rule-closed'))
    const quoteId = await quoted(r.ref)
    await applyOperatorPatch(r.ref, { type: 'status', status: 'closed' })
    await expect(
      applyCreatorAction(r.ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
  })

  it('a revised quote (new revision) is decidable after the first was decided', async () => {
    const r = await submitLaunchRequest(submitInput('rule-rev'))
    const q1 = await quoted(r.ref)
    await applyCreatorAction(r.ref, { type: 'quote_decision', quoteId: q1, decision: 'declined', ackText: ACK })
    const q2 = await quoted(r.ref) // same supplier → revision 2
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const quotes = (JSON.parse(row.working) as { quotes: Array<{ revision: number }> }).quotes
    expect(quotes).toHaveLength(2)
    expect(quotes[1].revision).toBe(2)
    await expect(
      applyCreatorAction(r.ref, { type: 'quote_decision', quoteId: q2, decision: 'accepted', ackText: ACK })
    ).resolves.toBeTruthy()
  })
})

describe('sample / production gates and info replies', () => {
  const SAMPLE_ACK = 'I have reviewed the sample myself and this approval is only about the sample'
  const PROD_ACK = 'I understand this authorizes production spending and does not guarantee supplier delivery'

  async function accepted(ref: string, artworkReady = true) {
    await applyOperatorPatch(ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: ref } })
    const quoteId = (JSON.parse(row.working) as { quotes: Array<{ id: string }> }).quotes[0].id
    await applyCreatorAction(ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: 'I understand this does not commit the supplier, start production, or guarantee delivery' })
    return { quoteId, artworkReady }
  }

  it('rejects sample approval before a quote is accepted', async () => {
    const r = await submitLaunchRequest(submitInput('gate-sample'))
    await expect(
      applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /accepted quote/i })
  })

  it('keeps sample approval and production authorization separate and ordered', async () => {
    const r = await submitLaunchRequest(submitInput('gate-prod', false))
    await accepted(r.ref)
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /approved sample/i })
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    await expect(
      applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /already recorded/i })
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /artwork/i })
  })

  it('authorizes production once, only with artwork ready', async () => {
    const r = await submitLaunchRequest(submitInput('gate-ok', true))
    await accepted(r.ref, true)
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    await applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /already authorized/i })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const view = creatorView(row)
    expect(view.productionAuthorized).not.toBeNull()
    expect(view.allArtworkReady).toBe(true)
  })

  it('lets the creator answer an information request, only while one is open', async () => {
    const r = await submitLaunchRequest(submitInput('gate-info'))
    await expect(
      applyCreatorAction(r.ref, { type: 'info_reply', text: 'Sizes S–XL' })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 })
    await applyOperatorPatch(r.ref, { type: 'info_request', text: 'Which sizes do you want?' })
    await expect(statusOf(r.ref)).resolves.toBe('needs_info')
    await applyCreatorAction(r.ref, { type: 'info_reply', text: 'Sizes S–XL, 30/30/30/30 split' })
    await expect(statusOf(r.ref)).resolves.toBe('submitted')
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const events = (JSON.parse(row.working) as { events: Array<{ type: string; actor: string }> }).events
    expect(events.some((e) => e.type === 'info_reply' && e.actor === 'creator')).toBe(true)
  })
})

describe('route-level authorization wiring', () => {
  it('creator GET without a key fails; with the right key it returns the view', async () => {
    const { GET } = await import('@/app/api/launches/route')
    const created = await submitLaunchRequest(submitInput('route-get'))
    const noKey = await GET(new Request(`http://localhost/api/launches?ref=${created.ref}`))
    expect(noKey.status).toBe(401)
    const wrongKey = await GET(
      new Request(`http://localhost/api/launches?ref=${created.ref}`, { headers: { 'x-creator-key': 'mdk_wrong' } })
    )
    expect(wrongKey.status).toBe(401)
    const ok = await GET(
      new Request(`http://localhost/api/launches?ref=${created.ref}`, { headers: { 'x-creator-key': created.creatorKey! } })
    )
    expect(ok.status).toBe(200)
    const body = (await ok.json()) as { data: { ref: string; quotes: unknown[] } }
    expect(body.data.ref).toBe(created.ref)
  })

  it('creator decision POST without a key fails; operator key issuance needs the operator key', async () => {
    const { POST } = await import('@/app/api/launches/[ref]/route')
    const created = await submitLaunchRequest(submitInput('route-post'))
    const denied = await POST(
      new Request('http://localhost/api/launches/x', { method: 'POST', body: JSON.stringify({ type: 'info_reply', text: 'hi' }) }),
      { params: Promise.resolve({ ref: created.ref }) }
    )
    expect(denied.status).toBe(401)

    const { POST: opPost } = await import('@/app/api/operator/requests/[ref]/route')
    const noOp = await opPost(new Request('http://localhost/x', { method: 'POST' }), { params: Promise.resolve({ ref: created.ref }) })
    expect(noOp.status).toBe(401)
    const okOp = await opPost(
      new Request('http://localhost/x', { method: 'POST', headers: { 'x-operator-key': 'test-operator-key' } }),
      { params: Promise.resolve({ ref: created.ref }) }
    )
    expect(okOp.status).toBe(200)
    const body = (await okOp.json()) as { data: { creatorKey: string } }
    expect(body.data.creatorKey).toMatch(/^mdk_/)
  })
})

describe('production authorization requires approved === true', () => {
  const SAMPLE_ACK = 'I have reviewed the sample myself and this approval is only about the sample'
  const PROD_ACK = 'I understand this authorizes production spending and does not guarantee supplier delivery'

  async function acceptedQuote(ref: string) {
    await applyOperatorPatch(ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: ref } })
    const quoteId = (JSON.parse(row.working) as { quotes: Array<{ id: string }> }).quotes[0].id
    await applyCreatorAction(ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: 'I understand this does not commit the supplier, start production, or guarantee delivery' })
  }

  it('rejects production authorization when no sample decision exists', async () => {
    const r = await submitLaunchRequest(submitInput('prod-missing'))
    await acceptedQuote(r.ref)
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /approved sample/i })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    expect((JSON.parse(row.working) as { productionAuthorized?: unknown }).productionAuthorized).toBeUndefined()
  })

  it('never permits production on a rejected sample', async () => {
    const r = await submitLaunchRequest(submitInput('prod-rejected'))
    await acceptedQuote(r.ref)
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: false, note: 'Print misaligned', ackText: SAMPLE_ACK })
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /rejected or missing sample/i })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const working = JSON.parse(row.working) as { sampleApproved: { approved: boolean }; productionAuthorized?: unknown }
    expect(working.sampleApproved.approved).toBe(false)
    expect(working.productionAuthorized).toBeUndefined()
  })

  it('permits production exactly once after an explicit approval, bound to the quote revision', async () => {
    const r = await submitLaunchRequest(submitInput('prod-approved'))
    await acceptedQuote(r.ref)
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    await applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const view = creatorView(row)
    expect(view.productionAuthorized?.quoteRevision).toBe(1)
    expect(view.sampleApproved?.quoteId).toBeTruthy()
  })
})

describe('closed-request lifecycle', () => {
  const SAMPLE_ACK = 'I have reviewed the sample myself and this approval is only about the sample'
  const PROD_ACK = 'I understand this authorizes production spending and does not guarantee supplier delivery'

  async function closedWithQuote(ref: string) {
    await applyOperatorPatch(ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: ref } })
    const quoteId = (JSON.parse(row.working) as { quotes: Array<{ id: string }> }).quotes[0].id
    await applyCreatorAction(ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: 'I understand this does not commit the supplier, start production, or guarantee delivery' })
    await applyOperatorPatch(ref, { type: 'status', status: 'closed' })
    return { quoteId }
  }

  it('rejects creator sample and production decisions on a closed request', async () => {
    const r = await submitLaunchRequest(submitInput('closed-sample'))
    await closedWithQuote(r.ref)
    await expect(
      applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
    await expect(
      applyCreatorAction(r.ref, { type: 'info_reply', text: 'late reply' })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
  })

  it('rejects operator quote and info-request bypasses on a closed request, but allows notes and reopening', async () => {
    const r = await submitLaunchRequest(submitInput('closed-op'))
    await closedWithQuote(r.ref)
    await expect(
      applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier B', unitCost: 10000, setupCost: 0, minQuantity: 10, leadTimeDays: 5, includes: [], excludes: [] })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
    await expect(
      applyOperatorPatch(r.ref, { type: 'info_request', text: 'Sizes?' })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
    await expect(
      applyOperatorPatch(r.ref, { type: 'sample_decision', approved: true })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /closed/i })
    // notes and reopening stay possible
    await applyOperatorPatch(r.ref, { type: 'note', text: 'Creator paused the launch.' })
    await applyOperatorPatch(r.ref, { type: 'status', status: 'quote_ready', note: 'Reopened.' })
    await expect(statusOf(r.ref)).resolves.toBe('quote_ready')
    // and creator actions work again after reopening
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
  })
})

describe('rejected-sample revision path', () => {
  it('lets the creator re-decide after a rejection, retaining full history', async () => {
    const SAMPLE_ACK = 'I have reviewed the sample myself and this approval is only about the sample'
    const PROD_ACK = 'I understand this authorizes production spending and does not guarantee supplier delivery'
    const r = await submitLaunchRequest(submitInput('rev-sample'))
    await applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    const row1 = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const quoteId = (JSON.parse(row1.working) as { quotes: Array<{ id: string }> }).quotes[0].id
    await applyCreatorAction(r.ref, { type: 'quote_decision', quoteId, decision: 'accepted', ackText: 'I understand this does not commit the supplier, start production, or guarantee delivery' })
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: false, note: 'Wrong colour', ackText: SAMPLE_ACK })

    // production stays blocked after the rejection…
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409 })

    // …and a new decision supersedes the rejection (history kept in events)
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, note: 'Fixed sample looks good', ackText: SAMPLE_ACK })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const working = JSON.parse(row.working) as {
      sampleApproved: { approved: boolean; quoteRevision: number }
      events: Array<{ type: string; text: string }>
    }
    expect(working.sampleApproved.approved).toBe(true)
    const sampleEvents = working.events.filter((e) => e.type === 'sample_decision')
    expect(sampleEvents).toHaveLength(2)
    expect(sampleEvents[0].text).toMatch(/rejected/i)
    expect(sampleEvents[1].text).toMatch(/approved/i)
    await applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
  })
})

describe('quote-revision binding of approvals', () => {
  const SAMPLE_ACK = 'I have reviewed the sample myself and this approval is only about the sample'
  const PROD_ACK = 'I understand this authorizes production spending and does not guarantee supplier delivery'
  const QUOTE_ACK = 'I understand this does not commit the supplier, start production, or guarantee delivery'

  async function fullyApproved(ref: string) {
    await applyOperatorPatch(ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    let row = await db.launchRequest.findUniqueOrThrow({ where: { id: ref } })
    const q1 = (JSON.parse(row.working) as { quotes: Array<{ id: string }> }).quotes[0].id
    await applyCreatorAction(ref, { type: 'quote_decision', quoteId: q1, decision: 'accepted', ackText: QUOTE_ACK })
    await applyCreatorAction(ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    await applyCreatorAction(ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
  }

  it('a later revision does not silently inherit sample approval or production authorization', async () => {
    const r = await submitLaunchRequest(submitInput('bind-rev'))
    await fullyApproved(r.ref)
    await applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier A', unitCost: 27000, setupCost: 8000, minQuantity: 30, leadTimeDays: 12, includes: [], excludes: [] })

    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const working = JSON.parse(row.working) as {
      sampleApproved?: unknown
      productionAuthorized?: unknown
      quotes: Array<{ revision: number; creatorDecision?: string }>
      events: Array<{ type: string; actor: string; text: string }>
    }
    expect(working.quotes[1].revision).toBe(2)
    // approvals were explicitly cleared, with a system event (history retained)
    expect(working.sampleApproved).toBeUndefined()
    expect(working.productionAuthorized).toBeUndefined()
    expect(working.events.some((e) => e.actor === 'system' && /no longer apply/i.test(e.text))).toBe(true)

    // production is no longer authorized for the new revision
    await expect(
      applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    ).rejects.toMatchObject({ code: 'CONFLICT', status: 409, message: /approved sample/i })

    // usable path forward: accept revision 2, re-approve the sample (bound to rev 2), re-authorize
    const row2 = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const quotes2 = (JSON.parse(row2.working) as { quotes: Array<{ id: string }> }).quotes
    await applyCreatorAction(r.ref, { type: 'quote_decision', quoteId: quotes2[1].id, decision: 'accepted', ackText: QUOTE_ACK })
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })
    const after = JSON.parse((await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })).working) as { sampleApproved: { quoteRevision: number } }
    expect(after.sampleApproved.quoteRevision).toBe(2)
    await applyCreatorAction(r.ref, { type: 'production_decision', authorized: true, ackText: PROD_ACK })
    const final = JSON.parse((await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })).working) as { productionAuthorized: { quoteRevision: number } }
    expect(final.productionAuthorized.quoteRevision).toBe(2)
  })

  it('a new quote for a different supplier leaves existing approvals untouched', async () => {
    const r = await submitLaunchRequest(submitInput('bind-other'))
    await applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier A', unitCost: 25000, setupCost: 8000, minQuantity: 30, leadTimeDays: 10, includes: [], excludes: [] })
    const row1 = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const q1 = (JSON.parse(row1.working) as { quotes: Array<{ id: string }> }).quotes[0].id
    await applyCreatorAction(r.ref, { type: 'quote_decision', quoteId: q1, decision: 'accepted', ackText: QUOTE_ACK })
    await applyCreatorAction(r.ref, { type: 'sample_decision', approved: true, ackText: SAMPLE_ACK })

    await applyOperatorPatch(r.ref, { type: 'quote', supplier: 'Supplier B', unitCost: 24000, setupCost: 8000, minQuantity: 30, leadTimeDays: 8, includes: [], excludes: [] })
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    const working = JSON.parse(row.working) as { sampleApproved?: { approved: boolean }; events: Array<{ text: string }> }
    expect(working.sampleApproved?.approved).toBe(true)
    expect(working.events.some((e) => /no longer apply/i.test(e.text))).toBe(false)
  })
})

describe('creator key recovery and retries', () => {
  const authed = (key: string) => new Request('http://localhost/x', { headers: { 'x-creator-key': key } })

  it('re-issuing a creator key invalidates the previous key', async () => {
    const r = await submitLaunchRequest(submitInput('key-reissue'))
    const rowBefore = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    await expect(requireCreator(authed(r.creatorKey!), rowBefore)).resolves.toBeUndefined()

    const reissued = await issueCreatorKey(r.ref)
    expect(reissued.creatorKey).not.toBe(r.creatorKey)

    const rowAfter = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    await expect(requireCreator(authed(r.creatorKey!), rowAfter)).rejects.toMatchObject({ status: 401 })
    await expect(requireCreator(authed(reissued.creatorKey), rowAfter)).resolves.toBeUndefined()
  })

  it('a retry after a lost response serves the original record without exposing a key; ref alone grants nothing', async () => {
    const r = await submitLaunchRequest(submitInput('key-retry'))
    const retry = await submitLaunchRequest(submitInput('key-retry'))
    expect(retry.duplicate).toBe(true)
    expect(retry.creatorKey).toBeUndefined()
    expect(retry.ref).toBe(r.ref)
    // the originally issued key still works (nothing was rotated)
    const row = await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
    await expect(requireCreator(authed(r.creatorKey!), row)).resolves.toBeUndefined()
    // the short reference alone (no header) grants nothing
    await expect(requireCreator(new Request('http://localhost/x'), row)).rejects.toMatchObject({ status: 401 })
  })
})

describe('database backup and restore (sqlite3 .backup, per docs/PILOT-OPS.md)', () => {
  const execFileP = promisify(execFile)

  it('backs up the test database and verifies restored records in a separate temp location', async () => {
    const r = await submitLaunchRequest(submitInput('backup-restore'))
    const restorePath = path.join(testTmpDir, 'restored-copy.db')
    await execFileP('sqlite3', [testDbFile, `.backup '${restorePath}'`])
    expect(restorePath).not.toBe(testDbFile)

    // Open the restored copy through its own client — dev and test clients stay separate.
    const { PrismaClient } = await import('@prisma/client')
    const restored = new PrismaClient({ datasources: { db: { url: `file:${restorePath}` } } })
    try {
      const restoredRow = await restored.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })
      expect(restoredRow.creatorEmail).toBe('creator@example.com')
      expect(restoredRow.payloadHash).toBe((await db.launchRequest.findUniqueOrThrow({ where: { id: r.ref } })).payloadHash)
      const count = await restored.launchRequest.count()
      expect(count).toBe(await db.launchRequest.count())
    } finally {
      await restored.$disconnect()
    }
  })
})

// keep ApiError import used for type narrowing in matchers
void ApiError
