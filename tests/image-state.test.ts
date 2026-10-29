import { describe, expect, it } from 'vitest'
import { initialStudioState, studioReducer } from '@/lib/state/studio-reducer'
import type { ProductProposal } from '@/types'

const product = {
  id: 'shirt',
  description: { text: 'A simple shirt design', version: 2, history: [], source: 'user' },
  image: { status: 'generating', attempts: 0, outdated: false },
  decision: 'approved',
} as unknown as ProductProposal

describe('image response belongs to approved description', () => {
  it('discards stale run and description results', () => {
    const state = { ...initialStudioState, runId: 'run-a', products: [product] }
    expect(studioReducer(state, { type: 'IMAGE_OK', productId: 'shirt', dataUrl: 'data:x', runId: 'run-b', version: 2 })).toBe(state)
    expect(studioReducer(state, { type: 'IMAGE_OK', productId: 'shirt', dataUrl: 'data:x', runId: 'run-a', version: 1 })).toBe(state)
    const next = studioReducer(state, { type: 'IMAGE_OK', productId: 'shirt', dataUrl: 'data:x', runId: 'run-a', version: 2 })
    expect(next.products[0].image.dataUrl).toBe('data:x')
  })
})
