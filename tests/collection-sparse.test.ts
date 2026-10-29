import { describe, expect, it } from 'vitest'
import { buildCollection } from '@/lib/score/collection'
import type { StudioInput, TasteProfile } from '@/types'

const profile: TasteProfile = {
  path: 'B_description', seeds: { entityIds: [], tagIds: [] },
  tags: [{ name: 'Pop culture', canonical: 'pop', weight: 0.8, source: 'qloo' }],
  brands: [], crossDomain: [], inspirationPlaces: [], priceTier: 'mid',
  priceTierEstimated: true, paletteId: 'mono-punk', notes: [],
  agentMode: 'scripted_fallback', qlooCalls: 1,
}

describe('sparse audience evidence', () => {
  it('does not turn one incidental affinity into a collection', async () => {
    const input: StudioInput = {
      text: 'Brand-new creator, still exploring; audience preferences are unknown.',
      soundsLike: [], city: 'Pune', creatorType: 'other', budget: 'small',
    }
    const result = await buildCollection(input, profile, input.budget)
    expect(result.products).toEqual([])
    expect(result.meta.notes[0]).toMatch(/not enough audience evidence/i)
  })
})
