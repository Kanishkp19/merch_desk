import { describe, expect, it, vi } from 'vitest'
import { CATALOG } from '@/lib/score/collection'

const { generateImage } = vi.hoisted(() => ({ generateImage: vi.fn(async () => ({ dataUrl: 'data:image/jpeg;base64,AAAA', model: 'test' })) }))
vi.mock('@/lib/image/provider', () => ({ generateImage }))
vi.mock('@/lib/http/rate-limit', () => ({ clientIp: () => 'test', rateLimit: () => ({ ok: true, retryAfterSec: 0 }) }))

import { POST } from '@/app/api/image/route'

const body = (productId: string) => ({ productId, approved: true, approvedDescription: 'An abstract color study on the product.', paletteId: 'mono-punk', attempt: 1, brandNames: [] })
const request = (data: unknown, cookie?: string) => new Request('http://localhost/api/image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
  body: JSON.stringify(data),
})

describe('image route approval and server cap', () => {
  it('rejects unapproved requests before provider use', async () => {
    generateImage.mockClear()
    const response = await POST(request({ ...body(CATALOG[0].id), approved: false }))
    expect(response.status).toBe(422)
    expect(generateImage).not.toHaveBeenCalled()
  })

  it('caps a cookie session at 12 provider calls', async () => {
    generateImage.mockClear()
    let cookie: string | undefined
    for (const item of CATALOG.slice(0, 12)) {
      const response = await POST(request(body(item.id), cookie))
      expect(response.status).toBe(200)
      cookie ??= response.headers.get('Set-Cookie')?.split(';')[0]
    }
    expect(cookie).toBeTruthy()
    const capped = await POST(request(body(CATALOG[12].id), cookie))
    expect(capped.status).toBe(429)
    expect((await capped.json()).error.code).toBe('SESSION_CAP')
    expect(generateImage).toHaveBeenCalledTimes(12)
  })
})
