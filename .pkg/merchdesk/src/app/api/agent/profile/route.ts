import { agentProfileBodySchema } from '@/lib/schemas/api'
import { runAgent } from '@/lib/agent/loop'
import { ApiError, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { sseStream } from '@/lib/http/sse'
import { env } from '@/lib/env'
import type { AgentEvent } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  // validate BEFORE streaming starts — errors here return normal JSON
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: { code: 'VALIDATION', message: 'Invalid JSON body.' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  const parsed = agentProfileBodySchema.safeParse(body)
  if (!parsed.success) {
    const err = validationError(parsed.error)
    return new Response(JSON.stringify(err.body()), { status: err.status, headers: { 'Content-Type': 'application/json' } })
  }
  const input = parsed.data

  if (env().RATE_LIMIT_ENABLED) {
    const { ok, retryAfterSec } = rateLimit(`agent:${clientIp(req)}`, 5)
    if (!ok) {
      throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }
  }

  return sseStream(async (send: (e: AgentEvent) => void) => {
    const { profile, mode } = await runAgent(input, send)
    send({ type: 'profile', profile })
    send({ type: 'done', mode })
  })
}
