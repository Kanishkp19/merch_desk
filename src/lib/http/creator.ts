import { timingSafeEqual } from 'node:crypto'
import { ApiError } from '@/lib/http/errors'

/**
 * Creator credential: a cryptographically strong secret issued once per
 * request, shown to the creator at submission and verified by SHA-256 hash.
 * The short MD reference stays a display identifier only — it never grants
 * access. Credentials travel in the `x-creator-key` header, never in URLs.
 */

const KEY_PREFIX = 'mdk_'

/** 256 bits of entropy, URL-safe. Shown once; only the SHA-256 hash is stored. */
export function generateCreatorKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return KEY_PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hashesMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'hex')
  const bufB = Buffer.from(b, 'hex')
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

/**
 * Verify a creator credential against a stored record. Throws:
 *  - 403 FORBIDDEN for legacy records (no credential issued yet) — never expose
 *    them silently; the operator issues a key from the operator queue.
 *  - 401 UNAUTHORIZED when the header is missing or wrong.
 */
export async function requireCreator(
  req: Request,
  record: { creatorKeyHash: string | null }
): Promise<void> {
  if (!record.creatorKeyHash) {
    throw new ApiError(
      'FORBIDDEN',
      'This request was created before creator keys existed. Ask the operator to issue you a creator key from the operator queue — the reference alone no longer grants access.',
      { status: 403 }
    )
  }
  const provided = req.headers.get('x-creator-key')?.trim()
  if (!provided) {
    throw new ApiError('UNAUTHORIZED', 'Missing creator key. Send the key you saved when you submitted this request.', { status: 401 })
  }
  const providedHash = await sha256Hex(provided)
  if (!hashesMatch(providedHash, record.creatorKeyHash)) {
    throw new ApiError('UNAUTHORIZED', 'Wrong creator key for this reference.', { status: 401 })
  }
}
