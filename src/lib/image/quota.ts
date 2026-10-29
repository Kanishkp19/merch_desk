import { randomUUID } from 'node:crypto'
import { ApiError } from '@/lib/http/errors'

const COOKIE = 'merchdesk_image_session'
const DAY = 24 * 60 * 60 * 1000
type Session = { used: number; expires: number; active: Set<string>; attempts: Map<string, number> }
const sessions = new Map<string, Session>()

function pruneSessions() {
  const now = Date.now()
  for (const [id, session] of sessions) if (session.expires <= now) sessions.delete(id)
  while (sessions.size >= 2000) sessions.delete(sessions.keys().next().value!)
}

export function imageSession(req: Request): { id: string; cookie?: string } {
  pruneSessions()
  const id = req.headers.get('cookie')?.match(/(?:^|;\s*)merchdesk_image_session=([a-f0-9-]{36})(?:;|$)/)?.[1]
  if (id && sessions.has(id)) return { id }
  const fresh = randomUUID()
  sessions.set(fresh, { used: 0, expires: Date.now() + DAY, active: new Set(), attempts: new Map() })
  return { id: fresh, cookie: `${COOKIE}=${fresh}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}` }
}

export function reserveImage(sessionId: string, key: string, productId: string, max: number): () => void {
  pruneSessions()
  const now = Date.now()
  const session = sessions.get(sessionId) ?? { used: 0, expires: now + DAY, active: new Set<string>(), attempts: new Map<string, number>() }
  sessions.set(sessionId, session)
  if (session.active.has(key)) throw new ApiError('RATE_LIMITED', 'This image is already generating.')
  if (session.used >= max) throw new ApiError('SESSION_CAP', `You've reached this session's image limit (${max}).`)
  if ((session.attempts.get(productId) ?? 0) >= 3) throw new ApiError('SESSION_CAP', 'This product has reached its image attempt limit.')
  session.active.add(key)
  session.used++
  session.attempts.set(productId, (session.attempts.get(productId) ?? 0) + 1)
  return () => session.active.delete(key)
}
