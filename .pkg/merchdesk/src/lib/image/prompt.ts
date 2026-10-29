import type { ProductCategory } from '@/types'
import palettesJson from '@/data/palettes.json'
import { getPalette } from '@/lib/score/describe'

const COMPOSITIONS = ['front view', 'three-quarter view', 'flat lay from above'] as const

const CATEGORY_NOUN: Record<ProductCategory, string> = {
  apparel: 'apparel piece',
  print: 'printed paper product',
  objects: 'merch object',
  consumables: 'packaged consumable product',
}

/**
 * Image prompt template (02-TRD → image/prompt.ts).
 * Composition varies by attempt. No negative prompt (FLUX) → positive phrasing.
 */
export function buildImagePrompt(params: {
  category: ProductCategory
  noun: string
  sanitizedDescription: string
  paletteId: string
  attempt: number // 1..3
}): string {
  const palette = getPalette(params.paletteId)
  const paletteNames = palette.names.slice(0, 3).join(', ')
  const composition = COMPOSITIONS[Math.min(Math.max(params.attempt, 1), 3) - 1]
  return (
    `Studio product photograph of a ${params.noun} (${CATEGORY_NOUN[params.category]}): ` +
    `${params.sanitizedDescription}. ` +
    `Colour palette: ${paletteNames}. ${palette.imageStyle}. ` +
    `Plain warm off-white seamless backdrop, soft natural shadow, centered ${composition}, sharp focus, e-commerce catalog style. ` +
    `Blank unprinted label areas, no text, no letters, no logos, no watermark, no people.`
  )
}

export { COMPOSITIONS }
