import { ApiError } from '@/lib/http/errors'
import { env } from '@/lib/env'

/**
 * Pilot operator gate: a shared secret header, not authentication.
 * If OPERATOR_KEY is unset the queue is disabled and says so — it never falls
 * back to unprotected access.
 */
export function requireOperator(req: Request): void {
  const key = env().OPERATOR_KEY
  if (!key) throw new ApiError('INTERNAL', 'Operator queue is not configured on this deployment (OPERATOR_KEY missing).', { status: 503 })
  const provided = req.headers.get('x-operator-key')
  if (provided !== key) throw new ApiError('VALIDATION', 'Wrong operator key.', { status: 401 })
}
