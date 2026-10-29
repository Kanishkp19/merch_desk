import type { CatalogItem, ProductDescription, TasteProfile } from '@/types'
import palettesJson from '@/data/palettes.json'
import { chat } from '@/lib/llm/providers'
import { DESCRIBE_SYSTEM, TWEAK_SYSTEM, describeUserPrompt, tweakUserPrompt, extractJson } from '@/lib/llm/prompts'
import { z } from 'zod'
import { toCanonical } from './tag-map'

const PAL = palettesJson as {
  palettes: Array<{ id: string; names: string[]; hex: string[]; matchTags: string[]; imageStyle: string }>
  motifs: Record<string, string>
  moods: Record<string, string>
}

export function getPalette(id: string) {
  return PAL.palettes.find((p) => p.id === id) ?? PAL.palettes[2] // mono-punk default
}

/** Palette selection: highest count of matchTags ∩ profile canonical tags; ties by order. */
export function pickPalette(profile: TasteProfile): string {
  const canon = new Set(profile.tags.map((t) => t.canonical ?? toCanonical(t.name)).filter(Boolean) as string[])
  let bestId = 'mono-punk'
  let bestScore = -1
  for (const p of PAL.palettes) {
    const score = p.matchTags.reduce((s, t) => s + (canon.has(t) ? 1 : 0), 0)
    if (score > bestScore) {
      bestScore = score
      bestId = p.id
    }
  }
  return bestId
}

const describeSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(2).max(60),
        oneLiner: z.string().min(5).max(120),
        visualDescription: z.string().refine((s) => {
          const n = s.trim().split(/\s+/).length
          return n >= 35 && n <= 75
        }, 'Must be 40–70 words'),
      })
    )
    .min(1)
    .max(8),
})

/** Template fallback description (deterministic, never fails). */
export function templateDescription(item: CatalogItem, profile: TasteProfile, paletteId: string): { name: string; oneLiner: string; text: string } {
  const palette = getPalette(paletteId)
  const canon = profile.tags.map((t) => t.canonical ?? toCanonical(t.name)).filter(Boolean) as string[]
  const motifTag = item.tags.find((t) => canon.includes(t)) ?? item.tags[0] ?? 'indie'
  const moodTag = canon.find((c) => PAL.moods[c]) ?? 'indie'
  const motif = (PAL.motifs[motifTag] ?? 'hand-drawn').replace(/-/g, ' ')
  const mood = PAL.moods[moodTag] ?? 'indie'
  const [c1, c2] = palette.names
  const material = item.noun.replace(/^(heavyweight|embroidered|printed|custom|enamel|knit|cassette-shaped|canvas|vinyl|hard-enamel)\s+/, '')
  const text = `A ${material} in ${c1?.toLowerCase()} and ${c2?.toLowerCase()}, finished with a ${motif} motif. ${item.supplierBrief.split(',')[0]}. The overall feel is ${mood} — built for fans who lean into ${canon.slice(0, 2).join(' and ') || 'this scene'} — with a clean blank area left for the artist's own mark.`
  return {
    name: item.name,
    oneLiner: `${item.name.toLowerCase()} in ${c1?.toLowerCase()}, ${mood} by design`,
    text: text.trim(),
  }
}

export interface DescribeOutcome {
  descriptions: Record<string, { name: string; oneLiner: string; text: string; source: 'llm' | 'template' }>
  source: 'llm' | 'template'
}

/** One batched LLM call for all products; template fallback per product on any failure. */
export async function describeProducts(
  items: CatalogItem[],
  profile: TasteProfile,
  paletteId: string
): Promise<DescribeOutcome> {
  if (items.length === 0) return { descriptions: {}, source: 'template' }
  const palette = getPalette(paletteId)
  const canon = profile.tags
    .map((t) => t.canonical ?? toCanonical(t.name))
    .filter(Boolean) as string[]
  const mood = PAL.moods[canon[0] ?? 'indie'] ?? 'indie'
  const out: DescribeOutcome['descriptions'] = {}

  try {
    const res = await chat({
      messages: [
        { role: 'system', content: DESCRIBE_SYSTEM },
        { role: 'user', content: describeUserPrompt(items, canon.slice(0, 8), palette.names, mood) },
      ],
      json: true,
      temperature: 0.8,
      maxTokens: 1800,
      timeoutMs: 8000,
    })
    const parsed = describeSchema.parse(extractJson(res.text))
    for (const item of parsed.items) {
      const catalogItem = items.find((i) => i.id === item.id)
      if (!catalogItem) continue
      out[item.id] = {
        name: item.name,
        oneLiner: item.oneLiner,
        text: item.visualDescription.trim(),
        source: 'llm',
      }
    }
  } catch {
    // fall through to templates for anything missing
  }

  for (const item of items) {
    if (!out[item.id]) {
      const t = templateDescription(item, profile, paletteId)
      out[item.id] = { ...t, source: 'template' }
    }
  }

  const anyLlm = Object.values(out).some((d) => d.source === 'llm')
  return { descriptions: out, source: anyLlm ? 'llm' : 'template' }
}

const tweakSchema = z.object({ description: z.string().min(10).max(600) })

/** Tweak chip revision — LLM with deterministic phrase-swap fallback. */
export async function tweakDescription(params: {
  current: string
  instruction: string
  paletteId: string
  profileTags: string[]
}): Promise<{ text: string; source: 'llm' | 'template' }> {
  const palette = getPalette(params.paletteId)
  try {
    const res = await chat({
      messages: [
        { role: 'system', content: TWEAK_SYSTEM },
        { role: 'user', content: tweakUserPrompt(params.current, params.instruction, palette.names, params.profileTags) },
      ],
      json: true,
      temperature: 0.7,
      maxTokens: 500,
    })
    const parsed = tweakSchema.parse(extractJson(res.text))
    const words = parsed.description.trim().split(/\s+/).length
    if (words >= 25 && words <= 90) {
      return { text: parsed.description.trim(), source: 'llm' }
    }
  } catch {
    /* fall back below */
  }
  return { text: deterministicTweak(params.current, params.instruction, palette.names), source: 'template' }
}

const TWEAK_PHRASES: Record<string, { find: RegExp; replace: (names: string[]) => string }> = {
  more_minimal: { find: /\bdecorated with\b/i, replace: () => 'restrained, with a single small' },
  bolder_colours: { find: /\bin (?:\w+ and \w+)/i, replace: (n) => `in bold ${n[0]?.toLowerCase()} with punchy ${n[1]?.toLowerCase()}` },
  more_vintage: { find: /\bfinished\b/i, replace: () => 'worn-in and faded, finished' },
  darker_palette: { find: /\bin (?:\w+ and \w+)/i, replace: (n) => `in deep ${n[3]?.toLowerCase() ?? 'charcoal'} and ${n[0]?.toLowerCase()}` },
  simpler_design: { find: /\bmotif\b/i, replace: () => 'mark, kept to one element' },
  more_playful: { find: /\bmotif\b/i, replace: () => 'motif with a playful wink' },
}

function deterministicTweak(current: string, instruction: string, paletteNames: string[]): string {
  const rule = TWEAK_PHRASES[instruction]
  if (rule && rule.find.test(current)) {
    return current.replace(rule.find, (m) => rule.replace(paletteNames)).slice(0, 600)
  }
  return current
}

export function initialDescription(text: string, source: 'llm' | 'template'): ProductDescription {
  return { text, version: 1, history: [], source }
}
