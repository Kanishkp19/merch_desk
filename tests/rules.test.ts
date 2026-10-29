import { describe, expect, it } from 'vitest'
import { selectProducts, firstRunCost, BUDGET_RULES } from '@/lib/score/rules'
import { pickReplacement } from '@/lib/score/collection'
import { CATALOG } from '@/lib/score/collection'


const scoredFrom = (fits: Record<string, number>) =>
  CATALOG.map((item) => ({ item, fitScore: fits[item.id] ?? 0 })).sort(
    (a, b) => b.fitScore - a.fitScore || a.item.id.localeCompare(b.item.id)
  )

describe('evidence-driven hero selection', () => {
  it('never promotes a zero-evidence hero-flagged item when an evidenced item exists', () => {
    // only the heavyweight tee (not hero-flagged) has audience evidence
    const res = selectProducts(scoredFrom({ 'heavyweight-tee': 40 }), 'medium')
    const hero = res.selected.find((s) => s.role === 'hero')
    expect(hero?.item.id).toBe('heavyweight-tee')
    expect(res.notes.some((n) => /exploratory/i.test(n))).toBe(false)
  })

  it('prefers stronger evidence over a distant hero flag', () => {
    const res = selectProducts(scoredFrom({ 'hero-crewneck': 25, 'heavyweight-tee': 60 }), 'medium')
    const hero = res.selected.find((s) => s.role === 'hero')
    expect(hero?.item.id).toBe('heavyweight-tee')
  })

  it('returns an insufficient-evidence outcome when nothing has evidence', () => {
    const res = selectProducts(scoredFrom({}), 'medium')
    expect(res.selected).toEqual([])
    expect(res.notes.some((n) => /not enough audience evidence/i.test(n))).toBe(true)
  })

  it('withholds low-fit filler when stronger options exist', () => {
    const res = selectProducts(scoredFrom({ 'hero-crewneck': 40, 'poster-print': 35, 'sticker-pack': 10 }), 'medium')
    expect(res.selected.map((s) => s.item.id)).toEqual(expect.arrayContaining(['hero-crewneck', 'poster-print']))
    expect(res.selected.map((s) => s.item.id)).not.toContain('sticker-pack')
  })
})

describe('replacement picker respects the budget', () => {
  it('skips over-budget candidates instead of returning them', () => {
    // hoodie first-run cost (640) exceeds the medium per-item cap (600)
    expect(firstRunCost(CATALOG.find((c) => c.id === 'heavyweight-hoodie')!)).toBeGreaterThan(
      BUDGET_RULES.medium.perItemCap
    )
    const scored = scoredFrom({ 'heavyweight-hoodie': 80, 'heavyweight-tee': 50, 'patch-set': 10 })
    const res = pickReplacement(scored, 'medium', [], 'hero-crewneck')
    expect(res.selected[0]?.item.id).toBe('heavyweight-tee')
  })

  it('does not replace a rejected product with an unevidenced filler', () => {
    const res = pickReplacement(scoredFrom({ 'hero-crewneck': 50 }), 'medium', [], 'hero-crewneck')
    expect(res.selected).toEqual([])
  })

  it('excludes already-shown and rejected products from the candidates', () => {
    const scored = scoredFrom({ 'heavyweight-tee': 50, 'patch-set': 10 })
    const res = pickReplacement(scored, 'medium', ['patch-set'], 'heavyweight-tee')
    // falls through to the best remaining item, but never an excluded/rejected one
    const ids = res.selected.map((s) => s.item.id)
    expect(ids).not.toContain('heavyweight-tee')
    expect(ids).not.toContain('patch-set')
  })

  it('returns nothing only when every item is excluded or over budget', () => {
    const all = CATALOG.map((c) => c.id).filter((id) => id !== 'hero-crewneck')
    const res = pickReplacement(scoredFrom({}), 'medium', all, 'hero-crewneck')
    expect(res.selected).toEqual([])
    expect(res.notes[0]).toMatch(/no more good matches/i)
  })
})
