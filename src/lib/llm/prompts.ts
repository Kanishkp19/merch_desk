/**
 * All LLM prompts in one place. The LLM never produces data:
 * it picks tools, classifies into fixed vocabularies, and writes copy
 * from supplied facts only.
 */
import type { CatalogItem } from '@/types'

export const AGENT_SYSTEM = `You are MerchDesk's taste researcher. Build an audience taste profile for a creator's fans by choosing which Qloo tools to call.

You communicate ONLY in JSON. Each turn, reply with exactly one JSON object (no markdown, no prose):
{"action": "<tool_name>", "args": { ... }}

Available tools:
- qloo_search_entity  args: {"query": string, "type": "artist"|"brand"|"place"}  → search Qloo entities
- qloo_search_tags     args: {"query": string}                                   → search taste tags
- qloo_taste_tags      args: {"entityIds": string[], "tagIds": string[]}          → audience taste tags for seed ids
- qloo_related         args: {"type": "brand"|"videogame"|"tv_show"|"movie"|"book"|"podcast", "entityIds": string[], "tagIds": string[]} → related entities
- note                 args: {"text": string}                                     → show the user a short note
- finish               args: {"path": "A"|"B", "summary": string}                 → end the research

Rules:
1. If the user named an artist, call qloo_search_entity with type "artist" first. If no result clearly matches, do NOT guess: emit a note ("Not found in Qloo — trying genre and interest tags") and use qloo_search_tags with the genres/interests from the description and any "sounds like" names.
2. Call qloo_taste_tags once with the best seed ids you have (entityIds from a found artist, tagIds from tag searches).
3. Call qloo_related for type "brand" once. Then call it for up to 3 cross-domain types (videogame, tv_show, movie, book, podcast) that match what the fans are said to like. Skip irrelevant types.
4. Use only ids returned by tools. Never invent ids, names or facts about the artist.
5. Use at most 8 tool calls total. When you have taste tags, brands and at least one cross-domain list (or you have run out of useful calls), call finish.
6. finish.path is "A" when an artist entity was found in Qloo, "B" when building from a description.
Keep every reply to a single JSON object. Be quick and decisive.`

export function agentUserPrompt(input: {
  text: string
  artist?: { name: string }
  soundsLike: string[]
  creatorType: string
  city: string
}): string {
  const lines = [
    'RESEARCH REQUEST',
    `Creator type: ${input.creatorType}`,
    input.artist ? `Named artist: ${input.artist.name}` : 'Named artist: none',
    input.soundsLike.length ? `Sounds like: ${input.soundsLike.join(', ')}` : 'Sounds like: none',
    input.city ? `Home city: ${input.city}` : 'Home city: none',
    `Fan description: "${input.text}"`,
    '',
    'Start by deciding whether to search the artist or the fan description keywords. Reply with one JSON action.',
  ]
  return lines.join('\n')
}

export const DESCRIBE_SYSTEM = `You write product concept descriptions for a creator's merch line. You will receive a list of products with: catalog name, materials/production hints, the audience's top taste tags, and a colour palette.

Reply with ONLY a JSON object: {"items": [{"id": string, "name": string, "oneLiner": string, "visualDescription": string}]}

Rules for each visualDescription:
- 40 to 70 words, one paragraph.
- Describe what the product looks like: object, materials, colours (use the palette colour names), a motif inspired by the taste tags, and the overall mood.
- Use only the taste tags that genuinely suit each product. If a tag does not fit a product, leave it out — never force an unrelated genre onto a product.
- NEVER include brand names, artist names, people, or any text/logo/lettering content.
- No sales claims, no prices. Product names must be plain descriptive English (you may keep the catalog name or improve it slightly).
- oneLiner: max 12 words, punchy, no quotes.
Return only the JSON object.`

export function describeUserPrompt(
  products: Array<Pick<CatalogItem, 'id' | 'name' | 'noun' | 'supplierBrief' | 'tags'>>,
  topTags: string[],
  paletteNames: string[],
  mood: string
): string {
  const items = products
    .map(
      (p) =>
        `- id: ${p.id} | name: ${p.name} | object: ${p.noun} | production hints: ${p.supplierBrief} | related tags: ${p.tags.slice(0, 4).join(', ')}`
    )
    .join('\n')
  return `Audience taste tags: ${topTags.join(', ')}
Colour palette: ${paletteNames.join(', ')}
Mood: ${mood}

Products:
${items}

Write one visualDescription (40–70 words) and oneLiner for each product id above.`
}

export const TWEAK_SYSTEM = `You revise an existing merch product description according to one instruction. Keep the same product and length (40–70 words). Keep the same colour palette and taste motif unless the instruction changes them.

Reply with ONLY a JSON object: {"description": string}
Never include brand names, artist names, people, text/logo/lettering content, prices or sales claims.`

export function tweakUserPrompt(
  current: string,
  instruction: string,
  paletteNames: string[],
  profileTags: string[]
): string {
  const meanings: Record<string, string> = {
    more_minimal: 'Make it more minimal — fewer elements, cleaner composition, calmer colours.',
    bolder_colours: 'Make the colours bolder — higher contrast, punchier accents from the palette.',
    more_vintage: 'Make it more vintage — faded, thrifted, 90s photocopy warmth.',
    darker_palette: 'Use a darker palette — deeper inks, heavier mood.',
    simpler_design: 'Simplify the design — one clear motif, less detail.',
    more_playful: 'Make it more playful — friendlier shapes, a wink of humour.',
  }
  return `Current description:
"${current}"

Instruction: ${meanings[instruction] ?? instruction}
Palette: ${paletteNames.join(', ')}
Taste tags: ${profileTags.join(', ')}

Return the revised description as JSON.`
}

export const CLASSIFY_SYSTEM = `You classify names into fixed vocabularies for a merch planning tool. You will get a list of names (brands, games, shows, books). For each, pick the best fit from the allowed values.

Reply with ONLY a JSON object: {"classifications": [{"name": string, "categories": string[], "tier": "budget"|"mid"|"premium"}]}
- categories: 1–3 values from: workwear, outdoor, streetwear, skate, luxury, sportswear, vintage-americana, techwear, craft-food, coffee-culture, gaming, publishing, home-goods, eco-goods, boutique-fashion, collectibles, toys, art-goods, electronics
- tier: rough price positioning of that brand.
If you are unsure, still give your best guess — these will be marked as estimates. Return only JSON.`

export const COMPARE_SYSTEM = `You are a careful general-purpose merch advisor with NO access to audience taste data. A creator describes themselves and asks what merch to make. Give the best advice you can from general merchandising knowledge for their creator type — the solid, generic recommendation a good AI without audience data would produce.

Reply with ONLY a JSON object: {"generic": [{"name": string, "reason": string}]}
- name: a specific product name (e.g. "Logo t-shirt").
- reason: one short sentence of general reasoning (max 15 words). Do NOT claim knowledge of this creator's particular audience.
Return only JSON.`

export const COLLAB_SYSTEM = `You write one-line collaboration pitch ideas for a creator's merch line, based ONLY on the place/brand data supplied to you. Never invent venues or brands.

Reply with ONLY a JSON object: {"ideas": [{"name": string, "idea": string}]}
- idea: max 18 words, concrete, warm, actionable (e.g. "Co-branded pour with your label art at their taproom").
Return only JSON.`

export function extractJson(raw: string): unknown {
  const text = raw.trim()
  // strip markdown fences if the model added them
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1].trim() : text
  try {
    return JSON.parse(candidate)
  } catch {
    // try to find the first {...} block
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1))
    }
    throw new Error('unparseable JSON response')
  }
}
