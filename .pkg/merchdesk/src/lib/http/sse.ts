/**
 * Server-Sent Events helper for /api/agent/profile.
 * Builds a ReadableStream that flushes each event immediately.
 */
import type { AgentEvent } from '@/types'

export const SSE_HEADERS: Record<string, string> = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no',
  Connection: 'keep-alive',
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, { status: 200, headers: SSE_HEADERS })
}

export function sseStream(handler: (send: (event: AgentEvent) => void) => Promise<void>): Response {
  const encoder = new TextEncoder()
  let closed = false

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AgentEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }
      try {
        await handler(send)
      } catch (err) {
        console.error('[merchdesk] sse handler error:', err instanceof Error ? err.message : err)
        send({ type: 'error', code: 'INTERNAL', message: 'Something went wrong while researching taste.' })
      } finally {
        closed = true
        try {
          controller.close()
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      closed = true
    },
  })

  return sseResponse(stream)
}

export async function readSseStream(
  res: Response,
  onEvent: (event: AgentEvent) => void
): Promise<void> {
  if (!res.body) throw new Error('No response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''
    for (const part of parts) {
      const line = part.split('\n').find((l) => l.startsWith('data: '))
      if (!line) continue
      try {
        const event = JSON.parse(line.slice(6)) as AgentEvent
        onEvent(event)
      } catch {
        /* ignore malformed chunk */
      }
    }
  }
}
