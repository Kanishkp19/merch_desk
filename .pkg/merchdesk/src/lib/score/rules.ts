import type { BudgetTier, CatalogItem, ProductRole } from '@/types'
import { meanUnitCost } from './pricing'

export const BUDGET_RULES: Record<BudgetTier, { perItemCap: number; totalCap: number; targetSize: number }> = {
  small: { perItemCap: 200, totalCap: 700, targetSize: 6 },
  medium: { perItemCap: 600, totalCap: 2200, targetSize: 7 },
  large: { perItemCap: 1500, totalCap: 6000, targetSize: 8 },
}

export function firstRunCost(item: CatalogItem): number {
  return item.setupCost + item.minRun * meanUnitCost(item)
}

export interface SelectedProduct {
  item: CatalogItem
  role: ProductRole
  reason: string
}

export interface SelectionResult {
  selected: SelectedProduct[]
  totalFirstRun: number
  notes: string[]
}

/**
 * Deterministic selection rules (02-TRD → rules.ts):
 * eligibility → hero → low-risk → fill by fit with category caps → category diversity → relax once.
 */
export function selectProducts(
  scored: Array<{ item: CatalogItem; fitScore: number }>,
  budget: BudgetTier,
  opts: { excludeIds?: string[] } = {}
): SelectionResult {
  const rules = BUDGET_RULES[budget]
  const notes: string[] = []
  const exclude = new Set(opts.excludeIds ?? [])

  let perItemCap = rules.perItemCap
  const eligibleOf = (cap: number) =>
    scored.filter((s) => !exclude.has(s.item.id) && firstRunCost(s.item) <= cap)

  let eligible = eligibleOf(perItemCap)
  if (eligible.length < 5) {
    perItemCap = Math.round(perItemCap * 1.25)
    const relaxed = eligibleOf(perItemCap)
    if (relaxed.length > eligible.length) {
      notes.push('Budget was tight — per-item first-run cap relaxed by 25% to fill the collection.')
      eligible = relaxed
    }
  }

  const chosen: SelectedProduct[] = []
  const chosenIds = new Set<string>()
  const push = (s: { item: CatalogItem; fitScore: number }, role: ProductRole, reason: string) => {
    if (chosenIds.has(s.item.id)) return
    chosenIds.add(s.item.id)
    chosen.push({ item: s.item, role, reason })
  }

  // 1. Hero: highest-fit eligible item with hero:true; else highest-fit non-lowRisk
  const hero = eligible.find((s) => s.item.hero) ?? eligible.find((s) => !s.item.lowRisk)
  if (hero) push(hero, 'hero', 'Best-fit statement piece for this audience')

  // 2. Low-risk anchor: highest-fit eligible lowRisk item
  const lowRisk = eligible.find((s) => s.item.lowRisk && s.item.id !== hero?.item.id)
  if (lowRisk) push(lowRisk, 'core', 'Low-risk anchor — small minimum run')

  // 3. Fill by descending fit; ≤3 per category; ≤2 consumables; stop at target/total cap
  const categoryCount = new Map<string, number>()
  for (const c of chosen) categoryCount.set(c.item.category, (categoryCount.get(c.item.category) ?? 0) + 1)
  let total = chosen.reduce((s, c) => s + firstRunCost(c.item), 0)

  for (const s of eligible) {
    if (chosen.length >= rules.targetSize) break
    if (chosenIds.has(s.item.id)) continue
    const cat = s.item.category
    const catCount = categoryCount.get(cat) ?? 0
    const capForCat = cat === 'consumables' ? 2 : 3
    if (catCount >= capForCat) continue
    const cost = firstRunCost(s.item)
    if (total + cost > rules.totalCap) continue
    push(s, 'core', 'High taste fit for this audience')
    categoryCount.set(cat, catCount + 1)
    total += cost
  }

  // 4. Category diversity: if fewer than 3 categories, swap lowest-fit for best-fit missing category
  //    (never exceeding the total cap)
  const distinctCategories = () => new Set(chosen.map((c) => c.item.category)).size
  let runningTotal = chosen.reduce((s, c) => s + firstRunCost(c.item), 0)
  if (distinctCategories() < 3 && eligible.length > 0) {
    for (let guard = 0; guard < 4 && distinctCategories() < 3; guard++) {
      const present = new Set(chosen.map((c) => c.item.category))
      const missing = eligible.find(
        (s) =>
          !chosenIds.has(s.item.id) &&
          !present.has(s.item.category) &&
          runningTotal + firstRunCost(s.item) <= rules.totalCap
      )
      if (!missing) break
      // drop the lowest-fit non-hero, non-limited item
      const droppable = chosen.filter((c) => c.role === 'core')
      if (droppable.length === 0) break
      const drop = droppable[droppable.length - 1]
      chosen.splice(chosen.indexOf(drop), 1)
      chosenIds.delete(drop.item.id)
      runningTotal -= firstRunCost(drop.item)
      runningTotal += firstRunCost(missing.item)
      push(missing, 'core', 'Added for category diversity')
    }
  }

  // 5. Roles: hero → hero; collab consumable or highest-priced non-hero with minRun ≤ 50 → limited
  const nonHero = chosen.filter((c) => c.role !== 'hero')
  const limitedCandidate =
    nonHero.find((c) => c.item.collab) ??
    [...nonHero]
      .filter((c) => c.item.minRun <= 50)
      .sort((a, b) => meanUnitCost(b.item) - meanUnitCost(a.item))[0]
  if (limitedCandidate && chosen.length >= 5) {
    limitedCandidate.role = 'limited'
    limitedCandidate.reason = 'Limited edition — numbered small run'
  }

  const totalFirstRun = chosen.reduce((s, c) => s + firstRunCost(c.item), 0)
  if (chosen.length < 5) {
    notes.push('Fewer than 5 products fit this budget — consider a larger budget tier for the full experience.')
  }

  return { selected: chosen, totalFirstRun, notes }
}
