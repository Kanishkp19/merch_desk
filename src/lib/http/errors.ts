import { z } from 'zod'
import type { ApiErrorBody, ErrorCode } from '@/types'

const HTTP_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION: 400,
  RATE_LIMITED: 429,
  QLOO_NO_KEY: 503,
  QLOO_RATE_LIMIT: 503,
  QLOO_UNAVAILABLE: 503,
  LLM_UNAVAILABLE: 503,
  IMAGE_QUOTA: 429,
  SESSION_CAP: 429,
  IMAGE_FAILED: 502,
  MODERATION_BLOCKED: 422,
  INTERNAL: 500,
}

export class ApiError extends Error {
  code: ErrorCode
  status: number
  field?: string
  retryAfterSec?: number

  constructor(code: ErrorCode, message: string, opts: { status?: number; field?: string; retryAfterSec?: number } = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = opts.status ?? HTTP_BY_CODE[code]
    this.field = opts.field
    this.retryAfterSec = opts.retryAfterSec
  }

  body(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.field ? { field: this.field } : {}),
        ...(this.retryAfterSec ? { retryAfterSec: this.retryAfterSec } : {}),
      },
    }
  }
}

export function validationError(err: z.ZodError): ApiError {
  const first = err.issues[0]
  const path = first?.path.join('.')
  const message = first?.message ?? 'Invalid input'
  return new ApiError('VALIDATION', path ? `Please check ${path}: ${message}` : message, { field: path || undefined, status: 400 })
}

export function jsonError(err: ApiError): Response {
  return Response.json(err.body(), { status: err.status })
}

export function jsonOk<T>(data: T, init?: ResponseInit): Response {
  return Response.json({ data }, init)
}

/** Wrap a route handler with uniform error handling. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn()
  } catch (err) {
    if (err instanceof ApiError) return jsonError(err)
    if (err instanceof z.ZodError) return jsonError(validationError(err))
    console.error('[merchdesk] unhandled route error:', err instanceof Error ? err.message : err)
    return jsonError(new ApiError('INTERNAL', 'Something went wrong on our side.'))
  }
}
