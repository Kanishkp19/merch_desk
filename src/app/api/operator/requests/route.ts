import { handle, jsonOk } from '@/lib/http/errors'
import { requireOperator } from '@/lib/http/operator'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  return handle(async () => {
    requireOperator(req)
    const records = await db.launchRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
    return jsonOk({
      requests: records.map((r) => {
        const payload = JSON.parse(r.payload) as Record<string, unknown>
        const working = JSON.parse(r.working) as { events: unknown[]; quotes: unknown[] }
        return {
          ref: r.id,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          creatorName: r.creatorName,
          launchName: payload.launchName,
          lineCount: Array.isArray(payload.lines) ? payload.lines.length : 0,
          quoteCount: (working.quotes ?? []).length,
        }
      }),
      manualNote: 'No supplier integration exists. The founder contacts suppliers manually and records responses here.',
    })
  })
}
