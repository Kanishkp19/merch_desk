import { describe, expect, it } from 'vitest'
import { moderate } from '@/lib/image/moderation'
import { buildImagePrompt } from '@/lib/image/prompt'
import { ApiError } from '@/lib/http/errors'
import type { CatalogItem } from '@/types'
import catalog from '@/data/catalog.json'

const CATALOG = catalog as CatalogItem[]

describe('moderation (the image safety net)', () => {
  it('strips artist and brand names (word-boundary, case-insensitive)', () => {
    const res = moderate({
      description: 'A hoodie inspired by Carhartt workwear and the American Football aesthetic',
      artistName: 'American Football',
      brandNames: ['Carhartt'],
    })
    expect(res.sanitized).not.toMatch(/carhartt/i)
    expect(res.sanitized).not.toMatch(/american football/i)
    expect(res.stripped).toContain('Carhartt')
  })

  it('strips a static trademark list', () => {
    const res = moderate({ description: 'A tee with a subtle nod to Nintendo-era graphics', brandNames: [] })
    expect(res.sanitized).not.toMatch(/nintendo/i)
  })

  it('rejects unsafe terms with MODERATION_BLOCKED', () => {
    expect(() => moderate({ description: 'A poster featuring a cowboy holding a rifle', brandNames: [] })).toThrow(ApiError)
    try {
      moderate({ description: 'a knife motif', brandNames: [] })
      expect.unreachable('should have thrown')
    } catch (err) {
      expect((err as ApiError).code).toBe('MODERATION_BLOCKED')
    }
  })

  it('removes text/logo request phrases', () => {
    const res = moderate({ description: 'A tote bag with text saying hello and a big logo on the front', brandNames: [] })
    expect(res.sanitized).not.toMatch(/text saying/i)
    expect(res.sanitized).not.toMatch(/logo/i)
  })
})

describe('image prompt builder', () => {
  const sticker = CATALOG.find((c) => c.id === 'sticker-pack')!

  it('wraps the sanitized description in the studio template', () => {
    const prompt = buildImagePrompt({
      category: sticker.category,
      noun: sticker.noun,
      sanitizedDescription: 'cream stickers with a pixel motif',
      paletteId: 'earth-retro',
      attempt: 1,
    })
    expect(prompt).toContain('Studio product photograph')
    expect(prompt).toContain('cream stickers with a pixel motif')
    expect(prompt).toContain('front view')
    expect(prompt).toContain('no text, no letters, no logos, no watermark, no people')
  })

  it('varies composition per attempt', () => {
    const attempt = (n: 1 | 2 | 3) =>
      buildImagePrompt({ category: sticker.category, noun: sticker.noun, sanitizedDescription: 'x', paletteId: 'mono-punk', attempt: n })
    expect(attempt(1)).toContain('front view')
    expect(attempt(2)).toContain('three-quarter view')
    expect(attempt(3)).toContain('flat lay from above')
  })
})
