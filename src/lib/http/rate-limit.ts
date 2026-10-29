/**
 * In-memory sliding-window rate limiter (best-effort, per IP).
 * Free-tier provider caps are the real backstop.
 */
type Window = { count: number; resetAt: number }

const buckets = new Map<string, Window>()

export function rateLimit(key: string, limit: number, windowMs = 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now()
  // opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, w] of buckets) if (w.resetAt < now) buckets.delete(k)
  }
  const existing = buckets.get(key)
  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfterSec: 0 }
  }
  existing.count += 1
  if (existing.count > limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
  }
  return { ok: true, retryAfterSec: 0 }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'local'
}
