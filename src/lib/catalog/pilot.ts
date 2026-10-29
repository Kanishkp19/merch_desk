import type { CatalogItem } from '@/types'
import catalogJson from '@/data/catalog.json'

/**
 * The pilot catalog, client-safe (JSON + types only — no LLM/env imports).
 * Defers alcohol, matches, and sauce until local sourcing/compliance is
 * verified; scoring and building live in lib/score/collection.ts.
 */
export const PILOT_CATALOG: CatalogItem[] = (catalogJson as CatalogItem[]).filter((item) =>
  !['beer-label-collab', 'matchbook', 'hot-sauce-collab'].includes(item.id)
)

export function catalogItem(id: string): CatalogItem | undefined {
  return PILOT_CATALOG.find((c) => c.id === id)
}
