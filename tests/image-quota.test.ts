import { describe, expect, it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { reserveImage } from '@/lib/image/quota'
import { ApiError } from '@/lib/http/errors'

describe('server image quota', () => {
  it('caps attempts, including failed provider calls', () => {
    const id = randomUUID()
    reserveImage(id, 'one', 'shirt', 2)()
    reserveImage(id, 'two', 'shirt', 2)()
    expect(() => reserveImage(id, 'three', 'shirt', 2)).toThrowError(ApiError)
  })

  it('rejects duplicate in-flight requests and limits one product to three attempts', () => {
    const id = randomUUID()
    const release = reserveImage(id, 'one', 'shirt', 12)
    expect(() => reserveImage(id, 'one', 'shirt', 12)).toThrowError(/already generating/)
    release()
    reserveImage(id, 'two', 'shirt', 12)()
    reserveImage(id, 'three', 'shirt', 12)()
    expect(() => reserveImage(id, 'four', 'shirt', 12)).toThrowError(/attempt limit/)
  })
})
