# MerchDesk — Data & API Contract

## Assumptions

- **No database in v1.** Reasons: (1) free: nothing to host or pause; (2) judges need zero sign-up; (3) the product's value is the run, not stored accounts. Persistent data is limited to static JSON in `data/` and a text-only `sessionStorage` copy of the run.
- All endpoints are Next.js route handlers (`app/api/**/route.ts`, `runtime = 'nodejs'`, `maxDuration = 60`).
- No auth. Abuse protection = in-memory rate limits + free-tier provider caps.
- Types mirror `02-TRD.md → TypeScript Interfaces`. Zod schemas here are the source of truth for runtime validation.
- Optional v2 storage (shareable links) is sketched at the end; it is **not** part of the MVP.

---

## Data Flow Diagram (replaces ER diagram)

```
StudioInput ──► [agent] ──► AgentMemory ──► TasteProfile
                                              │
data/catalog.json ──► [score] ◄───────────────┤
data/tag-aliases.json, brand-tiers.json, palettes.json
                                              ▼
                                       ProductProposal[] + DropPlan
                                              │
                       description ──approve──► image (data URL, memory only)
                                              │
                          CollabSuggestion[] ◄┘ (Qloo places + city)
```

---

## Zod Schemas (`lib/schemas/*`)

```ts
// lib/schemas/input.ts
import { z } from 'zod'

export const creatorType = z.enum(['musician','podcaster','youtuber','streamer','comic_artist','other'])
export const budgetTier = z.enum(['small','medium','large'])
export const priceTier = z.enum(['budget','mid','premium'])
export const entityType = z.enum(['artist','brand','place','movie','tv_show','book','podcast','videogame','destination'])

export const studioInputSchema = z.object({
  text: z.string().trim().min(2, 'Tell us about your fans, or search an artist').max(1000),
  artist: z.object({ id: z.string().min(1).max(100), name: z.string().min(1).max(120) }).optional(),
  soundsLike: z.array(z.string().trim().min(1).max(80)).max(3).default([]),
  city: z.string().trim().max(80).default(''),
  creatorType: creatorType.default('musician'),
  budget: budgetTier.default('medium'),
})
export type StudioInput = z.infer<typeof studioInputSchema>
```

```ts
// lib/schemas/profile.ts
import { z } from 'zod'
import { entityType, priceTier } from './input'

export const weightedTagSchema = z.object({
  name: z.string().min(1).max(80),
  qlooTagId: z.string().max(120).optional(),
  canonical: z.string().max(40).optional(),
  weight: z.number().min(0).max(1),
  source: z.enum(['qloo','llm_estimate']),
})

export const affinityEntitySchema = z.object({
  id: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  type: entityType,
  weight: z.number().min(0).max(1),
  tags: z.array(z.string().max(80)).max(20),
  canonicalTags: z.array(z.string().max(40)).max(10),
  brandCategories: z.array(z.string().max(40)).max(5).optional(),
  priceTier: priceTier.optional(),
  estimated: z.boolean(),
  imageUrl: z.string().url().optional(),
  location: z.string().max(160).optional(),
})

export const tasteProfileSchema = z.object({
  path: z.enum(['A_artist_found','B_description']),
  artist: z.object({ id: z.string(), name: z.string() }).optional(),
  seeds: z.object({ entityIds: z.array(z.string()).max(20), tagIds: z.array(z.string()).max(20) }),
  tags: z.array(weightedTagSchema).max(30),
  brands: z.array(affinityEntitySchema).max(20),
  crossDomain: z.array(affinityEntitySchema).max(30),
  inspirationPlaces: z.array(affinityEntitySchema).max(15),
  priceTier,
  priceTierEstimated: z.boolean(),
  paletteId: z.string().max(40),
  notes: z.array(z.string().max(200)).max(10),
  agentMode: z.enum(['llm_agent','scripted_fallback']),
  qlooCalls: z.number().int().min(0).max(40),
})
export type TasteProfile = z.infer<typeof tasteProfileSchema>
```

```ts
// lib/schemas/product.ts
import { z } from 'zod'

export const descriptionSchema = z.object({
  text: z.string().trim().min(10).max(600),
  version: z.number().int().min(1),
  history: z.array(z.string().max(600)).max(5),
  source: z.enum(['llm','template','user']),
})

export const llmDescribeItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2).max(60),
  oneLiner: z.string().min(5).max(120),
  visualDescription: z.string().refine(s => { const n = s.trim().split(/\s+/).length; return n >= 40 && n <= 70 }, 'Must be 40–70 words'),
})
export const llmDescribeSchema = z.object({ items: z.array(llmDescribeItemSchema).min(1).max(8) })

export const pricingSchema = z.object({
  unitCost: z.number().nonnegative(), price: z.number().positive(), marginPerUnit: z.number(),
  minRun: z.number().int().positive(), setupCost: z.number().nonnegative(), firstRunCost: z.number().nonnegative(),
  breakEvenUnits: z.number().int().positive().nullable(),
  typicalRange: z.tuple([z.number(), z.number()]),
  estimate: z.literal(true),
})

export const evidenceSchema = z.object({
  kind: z.enum(['tag','brand','cross_domain']),
  label: z.string().max(80), entityName: z.string().max(160).optional(), entityId: z.string().max(120).optional(),
  points: z.number(), estimated: z.boolean(),
})

export const productProposalSchema = z.object({
  id: z.string(), name: z.string(), oneLiner: z.string(),
  category: z.enum(['apparel','print','objects','consumables']),
  role: z.enum(['core','hero','limited']),
  silhouette: z.string(),
  fitScore: z.number().min(0).max(100),
  scoreParts: z.object({ tag: z.number(), brand: z.number(), cross: z.number() }),
  evidence: z.array(evidenceSchema).max(3),
  pricing: pricingSchema,
  supplierType: z.string(), supplierBrief: z.string(), complianceNote: z.string().optional(),
  description: descriptionSchema,
  decision: z.enum(['pending','approved','rejected']),
  image: z.object({
    status: z.enum(['idle','generating','ready','failed','quota','cap']),
    dataUrl: z.string().optional(), attempts: z.number().int().min(0).max(3),
    outdated: z.boolean(), error: z.string().optional(),
  }),
  replacedFrom: z.string().optional(),
})
export type ProductProposal = z.infer<typeof productProposalSchema>
```

```ts
// lib/schemas/api.ts
import { z } from 'zod'
import { studioInputSchema, budgetTier, creatorType } from './input'
import { tasteProfileSchema } from './profile'

export const searchQuery = z.object({
  q: z.string().trim().min(2).max(80),
  kind: z.enum(['entity','tag']).default('entity'),
  type: z.enum(['artist','brand','place']).default('artist'),
})

export const agentProfileBody = studioInputSchema

export const collectionBody = z.object({
  input: studioInputSchema,
  profile: tasteProfileSchema,
})

export const describeBody = z.object({
  productId: z.string(),
  currentDescription: z.string().trim().min(10).max(600),
  instruction: z.enum(['more_minimal','bolder_colours','more_vintage','darker_palette','simpler_design','more_playful']),
  paletteId: z.string(),
  profileTags: z.array(z.string().max(40)).max(10),
})

export const replaceBody = z.object({
  input: studioInputSchema,
  profile: tasteProfileSchema,
  currentProductIds: z.array(z.string()).min(1).max(12),
  rejectedProductId: z.string(),
  excludeEntityIds: z.array(z.string()).max(30),
  positiveEntityIds: z.array(z.string()).max(30).default([]),
  budget: budgetTier,
  creatorType,
})

export const imageBody = z.object({
  productId: z.string(),
  approved: z.literal(true),
  approvedDescription: z.string().trim().min(10).max(600),
  paletteId: z.string(),
  attempt: z.number().int().min(1).max(3),
  artistName: z.string().max(120).optional(),
  brandNames: z.array(z.string().max(160)).max(30).default([]),
})

export const collabsBody = z.object({
  profile: tasteProfileSchema,
  city: z.string().trim().min(2).max(80),
  productIds: z.array(z.string()).max(12),
})

export const compareBody = z.object({ input: studioInputSchema, count: z.number().int().min(5).max(8).default(6) })
```

```ts
// lib/schemas/events.ts  (SSE payloads for /api/agent/profile)
import { z } from 'zod'
import { tasteProfileSchema } from './profile'

export const agentEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('step'), id: z.string(), label: z.string(), status: z.enum(['running','done','skipped','failed']), detail: z.string().optional() }),
  z.object({ type: z.literal('tool_call'), id: z.string(), tool: z.string(), args: z.record(z.unknown()) }),
  z.object({ type: z.literal('tool_result'), id: z.string(), tool: z.string(), summary: z.string(), count: z.number().int().optional() }),
  z.object({ type: z.literal('note'), text: z.string().max(200) }),
  z.object({ type: z.literal('profile'), profile: tasteProfileSchema }),
  z.object({ type: z.literal('error'), code: z.string(), message: z.string() }),
  z.object({ type: z.literal('done'), mode: z.enum(['llm_agent','scripted_fallback']) }),
])
export type AgentEvent = z.infer<typeof agentEventSchema>
```

---

## Error Format (all JSON endpoints)

```ts
{ error: { code: 'VALIDATION'|'QLOO_NO_KEY'|'QLOO_RATE_LIMIT'|'QLOO_UNAVAILABLE'|'LLM_UNAVAILABLE'|'IMAGE_QUOTA'|'IMAGE_FAILED'|'MODERATION_BLOCKED'|'RATE_LIMITED'|'INTERNAL', message: string, field?: string, retryAfterSec?: number } }
```

| Code | HTTP | User-facing message (UI copy) |
|---|---|---|
| `VALIDATION` | 400 / 422 | "Please check *field*." |
| `RATE_LIMITED` | 429 | "Slow down a little — try again in *N* s." |
| `QLOO_NO_KEY` | 503 | "MerchDesk can't reach its taste data right now." |
| `QLOO_RATE_LIMIT` | 503 | "Taste data is busy — try again in *N* s." |
| `QLOO_UNAVAILABLE` | 503 | "Taste data is unavailable. Try again." |
| `LLM_UNAVAILABLE` | 503 | "Our free AI is resting. Using simplified mode." |
| `IMAGE_QUOTA` | 429 | "Free image quota used up for today. Your description and sketch are kept." |
| `IMAGE_FAILED` | 502 | "Image generation failed. Try again." |
| `MODERATION_BLOCKED` | 422 | "That description can't be turned into an image. Edit it and try again." |
| `INTERNAL` | 500 | "Something went wrong on our side." |

---

## API Contract

All endpoints: `Content-Type: application/json` unless stated. No auth.

### `GET /api/status`
Reports which services are configured (booleans only; never keys).
**200:**
```ts
{ data: { qloo: boolean, llmProviders: ('groq'|'gemini'|'cloudflare')[], image: boolean, dataMode: 'live'|'fixtures', maxImagesPerSession: number } }
```
**Rate limit:** none. Used by the landing page to show a warning banner if `qloo=false`.

---

### `GET /api/search`
Autocomplete for artists and tags.
**Query:** `q` (2–80 chars), `kind` = `entity`|`tag` (default `entity`), `type` = `artist`|`brand`|`place` (default `artist`, entity only).
**200:**
```ts
{ data: { results: { id: string; name: string; type?: string; imageUrl?: string; hint?: string }[] } }   // ≤5
```
**Errors:** 400 `VALIDATION`; 503 Qloo codes. **Rate limit:** 60/min/IP. **Cache:** 30 min server LRU.

---

### `POST /api/agent/profile`  (Server-Sent Events)
**Body:** `StudioInput` (`studioInputSchema`).
**Response headers:** `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`.
**Stream format:** each event is `data: <json>\n\n` where json matches `agentEventSchema`. Stream ends after a `done` or `error` event.
**Typical sequence:**
```
step   {id:"s1",label:"Understanding your fans",status:"running"}
tool_call {id:"t1",tool:"qloo_search_entity",args:{query:"…",type:"artist"}}
tool_result {id:"t1",tool:"qloo_search_entity",summary:"No match for “…”",count:0}
note   {text:"Not found in Qloo — trying genre and interest tags"}
tool_call {id:"t2",tool:"qloo_search_tags",args:{query:"midwest emo"}}
…
profile {profile:{…TasteProfile…}}
done   {mode:"llm_agent"}
```
**Errors:** validation failure returns normal JSON `400` (before streaming starts). After streaming starts, failures are an `error` event. **Rate limit:** 5/min/IP.

---

### `POST /api/collection`
**Body:** `{ input: StudioInput, profile: TasteProfile }`
**200:**
```ts
{ data: {
    products: ProductProposal[],              // 5–8, decision:'pending', image:{status:'idle',attempts:0,outdated:false}
    dropPlan: DropPlan,
    meta: { descriptionSource: 'llm'|'template', llmProvider?: string, notes: string[] }
} }
```
**Errors:** 400 `VALIDATION`; 500 `INTERNAL`. LLM failure is **not** an error (template descriptions used, `meta.descriptionSource='template'`). **Rate limit:** 10/min/IP.

---

### `POST /api/describe`
Revise one description from a tweak chip.
**Body:** `describeBody`. **200:** `{ data: { description: string } }` (40–70 words, validated; falls back to a deterministic phrase-swap if the LLM is unavailable). **Rate limit:** 20/min/IP.

---

### `POST /api/replace`
Swap in a replacement for a rejected product using Qloo exclusion.
**Body:** `replaceBody`.
**200:**
```ts
{ data: { product: ProductProposal, profileDelta: { brands: AffinityEntity[]; crossDomain: AffinityEntity[] }, note: string } }
```
**Errors:** `404`-style → returns `{ data: { product: null, note: "No more good matches for this budget" } }` with status 200 (not an error). **Rate limit:** 10/min/IP.

---

### `POST /api/image`
**Body:** `imageBody` (note `approved` must be literal `true`).
**Server steps:** validate → moderation (strip artist/brands/trademarks, reject unsafe) → `buildImagePrompt` → Cloudflare FLUX → return.
**200:**
```ts
{ data: { imageDataUrl: string /* data:image/jpeg;base64,… */, model: string, attempt: number } }
```
**Errors:** 400/422 `VALIDATION` (missing approval or empty description); 422 `MODERATION_BLOCKED`; 429 `IMAGE_QUOTA`; 502 `IMAGE_FAILED`. **Rate limit:** 6/min/IP.

---

### `POST /api/collabs`
**Body:** `collabsBody`. Uses Qloo `related` with `type=place` (and `brand`) with the city filter and the profile's seeds.
**200:**
```ts
{ data: { collabs: CollabSuggestion[] /* 3–6 */, cityNote?: string } }
```
Empty result → `{ collabs: [], cityNote: "Few matches in <City>" }`. **Rate limit:** 10/min/IP.

---

### `POST /api/compare`
Generic baseline: **no Qloo data**.
**Body:** `compareBody`. **200:**
```ts
{ data: { generic: { name: string; reason: string }[], provider: string } }
```
**Errors:** `LLM_UNAVAILABLE` → 503. Cached per `hash(input.text + input.creatorType)` in server LRU. **Rate limit:** 5/min/IP.

---

## State Machines

### Product card (client reducer `studio-reducer.ts`)

```
                     EDIT_TEXT / TWEAK_OK
                    ┌──────────────┐
                    ▼              │
  [proposed] ───────┴──────────────┘
      │  APPROVE                    │  REJECT
      ▼                             ▼
  [approved] ──IMAGE_REQUESTED──► [generating]      [rejected] ──► (REPLACE_REQUESTED → new [proposed] card)
                                       │
                    IMAGE_OK ──────────┤────────── IMAGE_FAIL ──► [failed] ──RETRY──► [generating]
                                       ▼                         IMAGE_QUOTA ──► [quota]   (terminal for session)
                                   [ready]                       SESSION_CAP ──► [cap]     (terminal for session)
                                       │
          REGENERATE (attempts<3) ─────┘──► [generating]
          EDIT_TEXT ───────────────────────► [proposed] + image.outdated=true
          UNDO_TEXT ───────────────────────► [proposed] (previous description version)
```
Rules: `IMAGE_REQUESTED` is only valid from `approved` (or `failed`/`ready` with `approved` retained). `attempts` increments on `IMAGE_OK` only. Editing text always clears `decision` back to `pending`.

### Collection run (`stage` in the studio state)
```
idle → profiling → profile_ready → building → collection
                      ▲   │            │
                      └───┘ (edit chips, re-run)   └─► (error) → profile_ready
```

---

## Static Data Files (`data/`)

### `data/canonical-tags.json`
```json
["retro-gaming","board-games","tabletop","esports","anime","sci-fi","fantasy","horror","cinema","books","comics","zines","art-print","vintage","80s","90s","y2k","workwear","outdoors","streetwear","skate","techwear","minimal","maximalist","handmade","thrift","luxury","eco","craft-beer","coffee","tea","hot-sauce","foodie","nightlife","festival","travel","fitness","pets","plants","cozy","punk","indie","hiphop","electronic","folk","metal","emo","pop","collectible","cassette","vinyl"]
```

### `data/tag-aliases.json` (seed; extend freely — keys lowercase)
```json
{
  "retro gaming": "retro-gaming", "video games": "retro-gaming", "classic games": "retro-gaming", "arcade": "retro-gaming", "8-bit": "retro-gaming", "nintendo": "retro-gaming",
  "board games": "board-games", "tabletop": "tabletop", "dungeons": "fantasy", "fantasy": "fantasy", "sci-fi": "sci-fi", "science fiction": "sci-fi", "horror": "horror", "anime": "anime", "manga": "anime",
  "craft beer": "craft-beer", "sour beer": "craft-beer", "brewery": "craft-beer", "ipa": "craft-beer", "coffee": "coffee", "cafe": "coffee", "tea": "tea", "hot sauce": "hot-sauce", "spicy": "hot-sauce", "foodie": "foodie",
  "vintage": "vintage", "retro": "vintage", "thrift": "thrift", "workwear": "workwear", "outdoors": "outdoors", "camping": "outdoors", "hiking": "outdoors",
  "streetwear": "streetwear", "skate": "skate", "skateboarding": "skate", "punk": "punk", "emo": "emo", "midwest emo": "emo", "indie": "indie", "indie rock": "indie", "folk": "folk", "metal": "metal", "hip hop": "hiphop", "rap": "hiphop", "electronic": "electronic", "pop": "pop",
  "cassette": "cassette", "vinyl": "vinyl", "zine": "zines", "comics": "comics", "poster": "art-print", "cinema": "cinema", "film": "cinema", "books": "books", "reading": "books",
  "festival": "festival", "nightlife": "nightlife", "travel": "travel", "fitness": "fitness", "pets": "pets", "dogs": "pets", "cats": "pets", "plants": "plants", "cozy": "cozy", "minimalist": "minimal", "luxury": "luxury", "sustainable": "eco", "eco-friendly": "eco", "90s": "90s", "80s": "80s", "y2k": "y2k"
}
```

### `data/brand-tiers.json` (shape + starter rows; **estimates**, all `"estimated": false` here means "curated by us", still not Qloo data)
```json
{
  "carhartt": { "categories": ["workwear","outdoor","streetwear"], "tier": "mid" },
  "patagonia": { "categories": ["outdoor","eco-goods"], "tier": "premium" },
  "vans": { "categories": ["skate","streetwear"], "tier": "mid" },
  "levi's": { "categories": ["vintage-americana","workwear"], "tier": "mid" },
  "supreme": { "categories": ["streetwear","skate"], "tier": "premium" },
  "stüssy": { "categories": ["streetwear","skate"], "tier": "premium" },
  "dickies": { "categories": ["workwear","skate"], "tier": "budget" },
  "new balance": { "categories": ["sportswear","streetwear"], "tier": "mid" },
  "stanley": { "categories": ["outdoor","home-goods"], "tier": "mid" },
  "yeti": { "categories": ["outdoor","home-goods"], "tier": "premium" },
  "stumptown coffee": { "categories": ["coffee-culture","craft-food"], "tier": "mid" },
  "blue bottle": { "categories": ["coffee-culture","craft-food"], "tier": "premium" },
  "sierra nevada": { "categories": ["craft-food","outdoor"], "tier": "mid" },
  "tapatío": { "categories": ["craft-food"], "tier": "budget" },
  "penguin books": { "categories": ["publishing"], "tier": "mid" },
  "uniqlo": { "categories": ["boutique-fashion"], "tier": "budget" }
}
```
Extend to 40–60 rows during Phase 3 (brand-category vocabulary: `workwear, outdoor, streetwear, skate, luxury, sportswear, vintage-americana, techwear, craft-food, coffee-culture, gaming, publishing, home-goods, eco-goods, boutique-fashion`).

### `data/palettes.json`
```json
[
  { "id": "earth-retro", "names": ["burnt orange","cream","forest green","charcoal"], "hex": ["#B5651D","#E8D8B0","#3B4A3A","#14110F"], "matchTags": ["vintage","workwear","outdoors","folk","coffee"], "imageStyle": "warm earthy retro look, matte textures, slightly faded print" },
  { "id": "neon-arcade", "names": ["hot pink","cyan","yellow","deep purple"], "hex": ["#FF2E93","#2EE6FF","#FFE600","#1A1033"], "matchTags": ["retro-gaming","esports","electronic","y2k","anime"], "imageStyle": "bright neon arcade colours, glossy highlights, playful pixel-art-inspired graphics" },
  { "id": "mono-punk", "names": ["black","off-white","signal red"], "hex": ["#14110F","#F5F0E6","#E4002B"], "matchTags": ["punk","metal","emo","streetwear","skate"], "imageStyle": "high-contrast monochrome with one red accent, rough photocopied zine texture" },
  { "id": "pastel-cozy", "names": ["blush pink","sage","butter yellow","cocoa"], "hex": ["#F7C8D0","#CDE7D8","#FFF1C9","#5B4B49"], "matchTags": ["cozy","pets","plants","tea","pop"], "imageStyle": "soft pastel palette, gentle lighting, friendly rounded shapes" },
  { "id": "forest-outdoors", "names": ["pine green","sand","rust","slate"], "hex": ["#234D3A","#D9C7A0","#A4471F","#3C4650"], "matchTags": ["outdoors","craft-beer","travel","fitness"], "imageStyle": "natural outdoorsy palette, canvas and enamel textures" },
  { "id": "chrome-y2k", "names": ["silver","baby blue","magenta","black"], "hex": ["#C9CED6","#9CC9FF","#E000A8","#14110F"], "matchTags": ["y2k","electronic","hiphop","techwear"], "imageStyle": "glossy chrome y2k aesthetic, metallic sheen, bubbly shapes" },
  { "id": "sunset-festival", "names": ["coral","marigold","teal","plum"], "hex": ["#FF6F59","#F5B83D","#1F8A8A","#5B2A5E"], "matchTags": ["festival","nightlife","travel","foodie"], "imageStyle": "warm sunset festival colours, screen-print look with slight misregistration" },
  { "id": "ink-literary", "names": ["ink blue","paper white","mustard"], "hex": ["#1B2A49","#F5F0E6","#D9A441"], "matchTags": ["books","zines","cinema","art-print","comics"], "imageStyle": "editorial print look, tidy typographic layout without any readable text, paper grain" }
]
```
Palette selection: highest count of `matchTags` ∩ profile canonical tags; ties by order; default `mono-punk`. Tag→phrase tables for template descriptions live in the same file under `"motifs": { "retro-gaming": "pixel-art", "craft-beer": "hop-cone", … }` and `"moods": { "vintage": "faded vintage", "minimal": "clean minimal", … }` — add ≥1 phrase per canonical tag.

### `data/catalog.json` (20 items; **costs/prices are estimates** — verify with supplier quotes)
Fields: `unitCost:[lo,hi]` USD per unit at min run; `priceRange:[lo,hi]` USD retail guardrail; `silhouette` ∈ {cap, top, socks, tote, flat, round, cassette, mug, bottle, bag, can, bandana, cards}.

```json
[
 {"id":"sticker-pack","name":"Sticker pack","category":"print","noun":"vinyl sticker sheet","silhouette":"flat","tags":["indie","art-print","collectible","punk","skate"],"crossDomainTags":["retro-gaming","anime","sci-fi","skate"],"brandCategories":["skate","streetwear","gaming"],"minRun":100,"unitCost":[0.25,0.6],"setupCost":0,"priceRange":[4,8],"supplierType":"sticker printer","supplierBrief":"Die-cut or kiss-cut vinyl stickers, 3 designs, waterproof, 100 min run.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"enamel-pin-set","name":"Enamel pin set","category":"objects","noun":"hard-enamel pin set","silhouette":"round","tags":["collectible","retro-gaming","indie","art-print","anime"],"crossDomainTags":["retro-gaming","anime","fantasy","sci-fi","pets"],"brandCategories":["gaming","streetwear"],"minRun":50,"unitCost":[1.5,3.5],"setupCost":40,"priceRange":[12,22],"supplierType":"enamel pin maker","supplierBrief":"Set of 3 hard-enamel pins, 1.25 in, butterfly clasps, mold fee applies.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"embroidered-cap","name":"Embroidered corduroy cap","category":"apparel","noun":"embroidered corduroy cap","silhouette":"cap","tags":["vintage","workwear","outdoors","indie","coffee"],"crossDomainTags":["outdoors","craft-beer","coffee","travel"],"brandCategories":["workwear","outdoor","vintage-americana","streetwear"],"minRun":24,"unitCost":[7,11],"setupCost":25,"priceRange":[28,38],"supplierType":"embroidery shop","supplierBrief":"Unstructured 6-panel corduroy cap, flat embroidery up to 3 colours, digitizing fee applies.","difficulty":"medium","lowRisk":false,"hero":false},
 {"id":"heavyweight-tee","name":"Heavyweight tee","category":"apparel","noun":"heavyweight cotton t-shirt","silhouette":"top","tags":["streetwear","vintage","punk","skate","indie","minimal"],"crossDomainTags":["skate","cinema","horror"],"brandCategories":["streetwear","skate","vintage-americana"],"minRun":36,"unitCost":[6,10],"setupCost":30,"priceRange":[28,40],"supplierType":"screen printer","supplierBrief":"6.5 oz cotton tee, 1–2 colour screen print front, small back print, sizes S–XXL.","difficulty":"low","lowRisk":false,"hero":false},
 {"id":"hero-crewneck","name":"Heavyweight crewneck","category":"apparel","noun":"heavyweight crewneck sweatshirt","silhouette":"top","tags":["luxury","minimal","vintage","streetwear","cozy"],"crossDomainTags":["cinema","books","coffee"],"brandCategories":["streetwear","luxury","boutique-fashion","vintage-americana"],"minRun":24,"unitCost":[18,26],"setupCost":40,"priceRange":[58,78],"supplierType":"premium blank + embroidery/print","supplierBrief":"12–14 oz fleece crewneck, embroidered chest mark, numbered neck label, limited run.","difficulty":"medium","lowRisk":false,"hero":true},
 {"id":"heavyweight-hoodie","name":"Heavyweight hoodie","category":"apparel","noun":"heavyweight pullover hoodie","silhouette":"top","tags":["streetwear","techwear","punk","metal","hiphop"],"crossDomainTags":["skate","esports","horror","anime"],"brandCategories":["streetwear","sportswear","techwear"],"minRun":24,"unitCost":[20,30],"setupCost":40,"priceRange":[65,90],"supplierType":"screen printer / embroidery","supplierBrief":"Heavy fleece hoodie, large back print, small front chest embroidery, kangaroo pocket.","difficulty":"medium","lowRisk":false,"hero":true},
 {"id":"tote-bag","name":"Tote bag","category":"objects","noun":"canvas tote bag","silhouette":"tote","tags":["indie","eco","books","art-print","thrift"],"crossDomainTags":["books","coffee","plants","travel"],"brandCategories":["eco-goods","publishing","boutique-fashion"],"minRun":36,"unitCost":[2.5,4.5],"setupCost":25,"priceRange":[15,25],"supplierType":"screen printer","supplierBrief":"10 oz natural canvas tote, 1–2 colour print, reinforced handles.","difficulty":"low","lowRisk":false,"hero":false},
 {"id":"poster-print","name":"Art print poster","category":"print","noun":"printed poster","silhouette":"flat","tags":["art-print","indie","vintage","cinema","collectible"],"crossDomainTags":["cinema","sci-fi","fantasy","travel"],"brandCategories":["publishing"],"minRun":50,"unitCost":[1.2,3],"setupCost":0,"priceRange":[10,25],"supplierType":"digital / offset print shop","supplierBrief":"18×24 in matte poster on 100 lb stock, single design, shipped in tubes.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"zine","name":"Mini zine","category":"print","noun":"stapled mini zine","silhouette":"flat","tags":["zines","punk","indie","handmade","comics"],"crossDomainTags":["comics","books","anime"],"brandCategories":["publishing"],"minRun":50,"unitCost":[1.5,3.5],"setupCost":0,"priceRange":[6,12],"supplierType":"copy / print shop","supplierBrief":"16-page half-letter zine, saddle-stitched, colour cover, black-and-white inside.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"cassette-usb","name":"Cassette-style USB","category":"objects","noun":"cassette-shaped USB drive","silhouette":"cassette","tags":["cassette","vinyl","collectible","vintage","indie","electronic"],"crossDomainTags":["retro-gaming","sci-fi","cinema"],"brandCategories":["vintage-americana","gaming"],"minRun":50,"unitCost":[3.5,6.5],"setupCost":30,"priceRange":[18,28],"supplierType":"USB / cassette duplicator","supplierBrief":"Cassette-style 8 GB USB pre-loaded with the artist's own tracks, printed J-card insert.","difficulty":"medium","lowRisk":false,"hero":false},
 {"id":"enamel-camp-mug","name":"Enamel camp mug","category":"objects","noun":"enamel camp mug","silhouette":"mug","tags":["outdoors","coffee","cozy","vintage","workwear"],"crossDomainTags":["coffee","outdoors","travel"],"brandCategories":["outdoor","coffee-culture","home-goods"],"minRun":48,"unitCost":[3,5.5],"setupCost":40,"priceRange":[18,28],"supplierType":"drinkware printer","supplierBrief":"12 oz enamel-coated steel mug, 1–2 colour print, silver rim.","difficulty":"medium","lowRisk":false,"hero":false},
 {"id":"custom-socks","name":"Custom socks","category":"apparel","noun":"knit crew socks","silhouette":"socks","tags":["indie","pop","streetwear","collectible","cozy"],"crossDomainTags":["skate","pets","retro-gaming"],"brandCategories":["streetwear","sportswear"],"minRun":36,"unitCost":[4,7],"setupCost":60,"priceRange":[14,22],"supplierType":"custom sock knitter","supplierBrief":"Cotton-blend crew socks, jacquard logo or pattern, 2–3 colours, setup fee.","difficulty":"medium","lowRisk":false,"hero":false},
 {"id":"matchbook","name":"Matchbooks","category":"objects","noun":"printed matchbook","silhouette":"flat","tags":["vintage","nightlife","punk","craft-beer","collectible"],"crossDomainTags":["nightlife","craft-beer","foodie","coffee"],"brandCategories":["vintage-americana","craft-food"],"minRun":100,"unitCost":[0.4,0.9],"setupCost":20,"priceRange":[3,6],"supplierType":"print shop","supplierBrief":"Box of matchbooks with custom cover art, 100 min run, check local shipping rules.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"acrylic-keychain","name":"Acrylic keychain","category":"objects","noun":"acrylic charm keychain","silhouette":"round","tags":["anime","collectible","pop","indie","pets"],"crossDomainTags":["anime","retro-gaming","pets","plants"],"brandCategories":["gaming","streetwear"],"minRun":50,"unitCost":[1.2,2.5],"setupCost":25,"priceRange":[8,14],"supplierType":"acrylic charm maker","supplierBrief":"2 in double-sided printed acrylic charm with ring and clasp.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"playing-cards","name":"Playing card deck","category":"objects","noun":"custom playing card deck","silhouette":"cards","tags":["board-games","collectible","vintage","art-print"],"crossDomainTags":["board-games","tabletop","fantasy","retro-gaming"],"brandCategories":["gaming","publishing"],"minRun":50,"unitCost":[3,6],"setupCost":40,"priceRange":[12,20],"supplierType":"card printer","supplierBrief":"54-card poker-size deck with custom back and 4 custom face cards, tuck box.","difficulty":"medium","lowRisk":false,"hero":false},
 {"id":"hot-sauce-collab","name":"Hot sauce collab","category":"consumables","noun":"hot sauce bottle with custom label","silhouette":"bottle","tags":["hot-sauce","foodie","punk","metal","craft-beer"],"crossDomainTags":["foodie","hot-sauce","craft-beer"],"brandCategories":["craft-food"],"minRun":48,"unitCost":[3,5],"setupCost":50,"priceRange":[10,16],"supplierType":"small-batch sauce maker (co-pack)","supplierBrief":"5 oz bottles produced by a licensed local sauce maker; you supply label art. Partner-led.","complianceNote":"Check food labelling rules and the producer's licence.","difficulty":"high","lowRisk":false,"hero":false,"collab":true},
 {"id":"coffee-collab","name":"Coffee roast collab","category":"consumables","noun":"coffee bag with custom label","silhouette":"bag","tags":["coffee","indie","cozy","foodie","folk"],"crossDomainTags":["coffee","books","outdoors"],"brandCategories":["coffee-culture","craft-food"],"minRun":50,"unitCost":[5,8],"setupCost":40,"priceRange":[14,20],"supplierType":"local roaster","supplierBrief":"12 oz bags roasted by a local roaster, custom sleeve or label from you.","complianceNote":"Check food labelling rules with the roaster.","difficulty":"medium","lowRisk":false,"hero":false,"collab":true},
 {"id":"beer-label-collab","name":"Beer label collab","category":"consumables","noun":"craft beer can with custom wrap label","silhouette":"can","tags":["craft-beer","nightlife","festival","punk","emo"],"crossDomainTags":["craft-beer","nightlife","foodie"],"brandCategories":["craft-food"],"minRun":100,"unitCost":[2,3.5],"setupCost":100,"priceRange":[5,9],"supplierType":"local brewery (partner-priced)","supplierBrief":"Limited batch brewed and packaged by a local brewery with your label art. Pricing and minimums are set by the brewery.","complianceNote":"Alcohol labelling, age checks and shipping rules vary by place — the brewery leads on compliance.","difficulty":"high","lowRisk":false,"hero":false,"collab":true},
 {"id":"patch-set","name":"Embroidered patch set","category":"objects","noun":"embroidered patch set","silhouette":"round","tags":["punk","metal","workwear","skate","indie","collectible"],"crossDomainTags":["skate","horror","outdoors"],"brandCategories":["workwear","streetwear","skate"],"minRun":50,"unitCost":[1.2,2.8],"setupCost":40,"priceRange":[8,15],"supplierType":"embroidery shop","supplierBrief":"Set of 2 iron-on embroidered patches, 3 in, merrowed border, digitizing fee applies.","difficulty":"low","lowRisk":true,"hero":false},
 {"id":"bandana","name":"Printed bandana","category":"apparel","noun":"printed cotton bandana","silhouette":"bandana","tags":["folk","festival","hiphop","vintage","workwear"],"crossDomainTags":["festival","travel","outdoors"],"brandCategories":["workwear","vintage-americana"],"minRun":36,"unitCost":[2.5,4.5],"setupCost":30,"priceRange":[12,20],"supplierType":"screen printer / sublimation","supplierBrief":"22 in square cotton bandana, 1–2 colour all-over print.","difficulty":"low","lowRisk":false,"hero":false}
]
```
Validation script (`scripts/validate-data.ts`, Phase 3): every `tags`/`crossDomainTags` value is in `canonical-tags.json`; every `silhouette` is one of the 13 known; 20 unique ids; `unitCost[0] ≤ unitCost[1]`.

### `data/fixtures/` (dev only)
Hand-written **synthetic** JSON that mimics the normalized `QlooEntity` shape for 3 inputs. Every file starts with `"_comment": "SAMPLE DATA — not Qloo output"`. Never used when `VERCEL_ENV=production`. The demo and submission use live Qloo only.

---

## Rate-limit Table (in-memory sliding window, per IP, best-effort)

| Route | Limit |
|---|---|
| `GET /api/search` | 60 / min |
| `POST /api/agent/profile` | 5 / min |
| `POST /api/collection` | 10 / min |
| `POST /api/describe` | 20 / min |
| `POST /api/replace` | 10 / min |
| `POST /api/image` | 6 / min |
| `POST /api/collabs` | 10 / min |
| `POST /api/compare` | 5 / min |

---

## Optional v2: shareable collections (NOT in MVP)

If added later, use Supabase free tier with one table and RLS that allows anonymous read by id and insert-only writes (no updates/deletes):

```sql
create table shared_collections (
  id uuid primary key default gen_random_uuid(),
  payload jsonb not null,               -- text only: input, profile summary, products, no images
  created_at timestamptz not null default now()
);
alter table shared_collections enable row level security;
create policy "read_by_id" on shared_collections for select using (true);
create policy "insert_only" on shared_collections for insert with check (true);
```
Constraints: payload ≤ 64 KB; rate-limit inserts; free Supabase projects pause when idle — acceptable only for v2.
