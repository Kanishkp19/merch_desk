# MerchDesk — Technical Requirements Document

## Assumptions

- Next.js App Router, TypeScript strict, deployed to **Vercel Hobby** (free). Hobby is for non-commercial use: fine for a hackathon demo. If MerchDesk becomes a business, move to Vercel Pro or Cloudflare Pages.
- **No database, no auth.** State lives in React (`useReducer`) with a text-only copy in `sessionStorage`. Generated images stay in memory only (too big for sessionStorage).
- **No paid SDKs.** LLM, Qloo and image calls use plain `fetch`. This removes SDK version drift and keeps the dependency list tiny.
- **Qloo parameter names below are from public hackathon projects and developer notes, not from the official docs** (docs.qloo.com blocked automated reading). The adapter `lib/qloo/client.ts` is the only place that knows parameter names. Phase 2 of the plan verifies every call with a probe script before anything else is built.
- Free-tier limits change. Numbers below were checked in October 2026 from public sources and **must be re-checked in each provider's dashboard** on build day.
- Package versions are known-good majors. After first `npm install`, **commit `package-lock.json` and do not upgrade during the hackathon.**

---

## Free-tier compliance (the "free of cost" contract)

| Need | Service | Free allowance (verify in dashboard) | If exhausted |
|---|---|---|---|
| Hosting + API routes | Vercel Hobby | Free forever, non-commercial; function max duration is 10 s default and configurable to 60 s (some sources list higher; we set `maxDuration = 60`, valid under either reading) | Site pauses until reset; no charge |
| Taste data | Qloo hackathon API | Key issued by organizers; works only on `https://hackathon.api.qloo.com`; keys expire after the event | Show "Qloo unavailable" + retry |
| LLM (primary) | Groq free tier, `llama-3.3-70b-versatile` | Rate-limited free tier, OpenAI-compatible, supports tool calling | Fall to next provider |
| LLM (fallback 1) | Google AI Studio, `gemini-2.5-flash-lite` | Free tier; **Flash-Lite is the safe free choice** — reports conflict on whether 2.5 Flash is still free, so the model name is an env var | Fall to next provider |
| LLM (fallback 2) + images | Cloudflare Workers AI (Free plan) | 10,000 neurons/day, no card. FLUX.1 [schnell] ≈ 43–58 neurons per 1024² image per Cloudflare-based sources (≈170–230 images/day); other write-ups quote higher per-image costs, so **budget for ≥50/day** | SVG sketch stays; text still works |
| Domain | `*.vercel.app` | Free | — |
| Repo | GitHub public | Free | — |

**Hard rules**
1. Never add a payment method to Groq, Google AI Studio, Cloudflare, Vercel or Qloo. A free plan with no card cannot overspend.
2. Cloudflare account stays on the **Free** plan (not Workers Paid).
3. Gemini image models (Nano Banana / Imagen) have **no free API tier** — do not use them.
4. Any new service added later must pass: free tier exists, no card needed, works from a Vercel serverless function.

**Per-run quota math (typical):** ~10–12 Qloo calls, ~6–8 LLM calls (agent loop 3–6, descriptions 1, classify 0–1, compare 0–1), 0 image calls until approval, then 1 per approved product (≤ 8 + regenerations).

---

## Tech Stack

| Layer | Technology | Version (major) | Justification |
|---|---|---|---|
| Framework | Next.js (App Router) | 15.x | Route handlers for server-side keys, one-command Vercel deploy |
| UI runtime | React | 19.x | Ships with Next 15 |
| Language | TypeScript | 5.x (`strict: true`) | Safe contracts between agent, scorer and UI |
| Styling | Tailwind CSS | 4.x | Tokens in CSS via `@theme`; fast iteration |
| Validation | Zod | 3.x | Validates every API input/output and every LLM JSON response |
| Icons | lucide-react | latest at install | Small, consistent |
| Class merge | clsx | 2.x | Conditional classes |
| Tests | Vitest | 2.x | Pure-function tests for scoring/pricing/prompt builder |
| Fonts | `next/font/google` | — | Archivo Black, Space Grotesk, JetBrains Mono (self-hosted at build, free) |
| LLM transport | `fetch` to OpenAI-compatible endpoints | — | Groq, Gemini and Cloudflare all expose `/chat/completions` |
| Image | Cloudflare Workers AI REST, FLUX.1 [schnell] (Apache-2.0) | — | Free daily allowance, no watermark |
| Hosting | Vercel Hobby | — | Free |

No Redux, no TanStack Query, no shadcn, no ORM. All server calls go through one typed `lib/api-client.ts`.

### npm packages

```bash
# runtime
npm i zod lucide-react clsx
# dev
npm i -D vitest @vitest/coverage-v8 @types/node tsx
```
(Next, React, Tailwind and TypeScript come from `create-next-app`.)

| Package | Purpose |
|---|---|
| `next`, `react`, `react-dom` | App framework |
| `tailwindcss`, `@tailwindcss/postcss` | Styling |
| `zod` | Schemas (`lib/schemas/*`) |
| `lucide-react` | Icons used in `04-UI-UX-BRIEF.md` |
| `clsx` | Class merging helper in `lib/cn.ts` |
| `vitest`, `@vitest/coverage-v8` | Unit tests |
| `tsx` | Runs `scripts/*.ts` (probe scripts) |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Browser (Next.js client components)                              │
│  StudioProvider (useReducer) ── sessionStorage (text only)       │
│  AgentThinkingPanel ◄── SSE ──┐                                  │
│  ProductCard (describe → approve → image state machine)          │
└──────────────┬───────────────────────────────────────────────────┘
               │ fetch (JSON) / fetch+ReadableStream (SSE)
┌──────────────▼───────────────────────────────────────────────────┐
│ Next.js route handlers on Vercel (keys live here only)           │
│  /api/search      /api/agent/profile (SSE)    /api/collection    │
│  /api/describe    /api/replace                /api/image         │
│  /api/collabs     /api/compare                /api/status        │
│                                                                  │
│  lib/agent  ── LLM tool loop (or scripted fallback)              │
│  lib/score  ── tag/brand/cross scoring, rules, pricing, drops    │
│  lib/image  ── prompt builder + moderation + CF client           │
│  lib/http   ── errors, SSE, in-memory rate limit                 │
└───────┬───────────────┬──────────────────┬───────────────────────┘
        │               │                  │
┌───────▼──────┐ ┌──────▼─────────────┐ ┌──▼───────────────────────┐
│ Qloo         │ │ LLM chain          │ │ Cloudflare Workers AI    │
│ hackathon    │ │ Groq → Gemini →    │ │ FLUX.1 schnell (images)  │
│ API (GET)    │ │ Cloudflare chat    │ │ (also CF chat fallback)  │
└──────────────┘ └────────────────────┘ └──────────────────────────┘
```

**Data flow in one run**
1. `POST /api/agent/profile` streams agent steps → client builds `TasteProfile`.
2. User confirms/edits chips → `POST /api/collection` → scored `ProductProposal[]` (descriptions via one batched LLM call, or template fallback) + `DropPlan`.
3. Per product: user approves → `POST /api/image` → `data:` URL shown. Reject → `POST /api/replace`.
4. `POST /api/collabs` fills Collab Radar. `POST /api/compare` runs lazily.
5. `/line-sheet` reads `sessionStorage` and prints.

---

## Folder Structure (scaffold exactly this)

```
merchdesk/
├── app/
│   ├── layout.tsx                    # fonts, SiteHeader/Footer, StudioProvider, ToastHost
│   ├── page.tsx                      # landing + HeroInput
│   ├── globals.css                   # tokens from 04-UI-UX-BRIEF.md
│   ├── not-found.tsx
│   ├── error.tsx                     # global error boundary
│   ├── about/page.tsx                # how it works, data honesty, license, credits
│   ├── studio/
│   │   ├── page.tsx                  # workspace (client)
│   │   └── loading.tsx
│   ├── line-sheet/page.tsx           # print view
│   └── api/
│       ├── status/route.ts
│       ├── search/route.ts
│       ├── agent/profile/route.ts    # SSE
│       ├── collection/route.ts
│       ├── describe/route.ts
│       ├── replace/route.ts
│       ├── image/route.ts
│       ├── collabs/route.ts
│       └── compare/route.ts
├── components/
│   ├── layout/{SiteHeader,SiteFooter,PoweredByQloo,ToastHost}.tsx
│   ├── landing/{HeroInput,ExampleChips,ArtistAutocomplete}.tsx
│   ├── studio/
│   │   ├── Stepper.tsx
│   │   ├── OptionsBar.tsx
│   │   ├── AgentThinkingPanel.tsx
│   │   ├── TasteProfileCard.tsx
│   │   ├── TasteChips.tsx
│   │   ├── CollectionGrid.tsx
│   │   ├── ProductCard.tsx
│   │   ├── DescriptionEditor.tsx
│   │   ├── ApprovalBar.tsx
│   │   ├── ImageStage.tsx
│   │   ├── NumbersDrawer.tsx
│   │   ├── WhyPopover.tsx
│   │   ├── CollabRadar.tsx
│   │   ├── DropTimeline.tsx
│   │   ├── ComparePanel.tsx
│   │   └── ExportBar.tsx
│   ├── mockups/Silhouette.tsx        # 13 flat SVG shapes (no AI)
│   ├── print/LineSheet.tsx
│   └── ui/{Button,Chip,Card,Input,Select,Textarea,Skeleton,Modal,Drawer,Tooltip,ScoreRing,Sticker,Tape,Toast}.tsx
├── lib/
│   ├── env.ts                        # zod-parsed env, server only
│   ├── cn.ts
│   ├── api-client.ts                 # typed fetch wrappers + SSE reader
│   ├── qloo/{client,types,normalize}.ts
│   ├── llm/{providers,chat,prompts}.ts
│   ├── agent/{tools,loop,scripted,memory,events}.ts
│   ├── score/{score,rules,pricing,drops,tag-map,classify,describe}.ts
│   ├── image/{cloudflare,prompt,moderation}.ts
│   ├── http/{errors,sse,rate-limit}.ts
│   ├── state/{studio-reducer.ts,StudioProvider.tsx,storage.ts}
│   └── schemas/{input,profile,product,api,events}.ts
├── data/
│   ├── catalog.json                  # 20 items (full file in 05-BACKEND-SCHEMA.md)
│   ├── canonical-tags.json
│   ├── tag-aliases.json
│   ├── brand-tiers.json              # 40–60 brands → categories/tier (estimates)
│   ├── palettes.json                 # 8 palettes + image style phrases
│   └── fixtures/                     # SYNTHETIC sample data for local dev only
├── scripts/{probe-qloo,smoke-llm,smoke-image}.ts
├── tests/{score,pricing,drops,image-prompt,moderation,qloo-normalize,agent-loop}.test.ts
├── types/index.ts                    # re-exports z.infer types
├── LICENSE                           # MIT
├── README.md
├── .env.example
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

---

## Environment Variables

```bash
# .env.local  (never commit; mirror in Vercel → Project → Settings → Environment Variables)

# --- Qloo (server only) ---
QLOO_API_KEY=                     # issued via the hackathon developer guide
QLOO_BASE_URL=https://hackathon.api.qloo.com

# --- LLM chain (server only). Order = priority; missing keys are skipped ---
LLM_PROVIDERS=groq,gemini,cloudflare
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
CF_LLM_MODEL=@cf/meta/llama-3.3-70b-instruct-fp8-fast

# --- Cloudflare Workers AI (server only; one account for LLM fallback + images) ---
CF_ACCOUNT_ID=
CF_API_TOKEN=                     # token with Workers AI read/edit permission
CF_IMAGE_MODEL=@cf/black-forest-labs/flux-1-schnell

# --- App ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MAX_IMAGES_PER_SESSION=12
MERCHDESK_DATA_MODE=live          # live | fixtures  (fixtures = synthetic sample data, dev only)
RATE_LIMIT_ENABLED=true
```

| Variable | Type | Layer | Notes |
|---|---|---|---|
| `QLOO_API_KEY` | string | server | Sent only as `X-Api-Key`; never logged; never prefixed `NEXT_PUBLIC_` |
| `QLOO_BASE_URL` | url | server | Leave at hackathon default |
| `LLM_PROVIDERS` | csv enum | server | Allowed: `groq`, `gemini`, `cloudflare` |
| `GROQ_*`, `GEMINI_*` | string | server | OpenAI-compatible chat completions |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | string | server | Used by `lib/image/cloudflare.ts` and Cloudflare LLM provider |
| `CF_LLM_MODEL`, `CF_IMAGE_MODEL` | string | server | Model ids may change — confirm in Cloudflare model catalog |
| `NEXT_PUBLIC_MAX_IMAGES_PER_SESSION` | int | client | Default 12 |
| `MERCHDESK_DATA_MODE` | enum | server | `fixtures` is blocked when `VERCEL_ENV=production` |
| `RATE_LIMIT_ENABLED` | bool | server | In-memory, best-effort |

`lib/env.ts` parses these with Zod at first use and throws a readable error listing missing required keys. At least one LLM provider **or** scripted fallback must be available; Qloo key is required unless `MERCHDESK_DATA_MODE=fixtures` (dev).

---

## Third-party Integrations

### 1. Qloo (hackathon API) — `lib/qloo/client.ts`

- Base: `https://hackathon.api.qloo.com`. All calls are **GET** with header `X-Api-Key: <key>`.
- Entity type URNs to use: `urn:entity:artist`, `urn:entity:brand`, `urn:entity:place`, `urn:entity:movie`, `urn:entity:tv_show`, `urn:entity:book`, `urn:entity:podcast`, `urn:entity:videogame`, `urn:entity:destination`. **`urn:entity:video_game` returns HTTP 400 — use `videogame`.**
- Adapter methods (the rest of the app never builds a Qloo URL):

| Method | Request (believed shape — verify in Phase 2) | Returns |
|---|---|---|
| `searchEntities(query, type, take=5)` | `GET /search?query=…&types=urn:entity:artist&take=5` | `QlooEntity[]` |
| `searchTags(query, take=5)` | `GET /v2/tags?filter.query=…&take=5` | `QlooTag[]` |
| `tasteTags({entityIds, tagIds, take=15})` | `GET /v2/insights?filter.type=urn:tag&signal.interests.entities=…&signal.interests.tags=…&take=15` | `QlooTag[]` with affinity scores |
| `related({type, entityIds, tagIds, location?, excludeEntityIds?, take=10})` | `GET /v2/insights?filter.type=<urn>&signal.interests.entities=…&signal.interests.tags=…&filter.location.query=<city>&filter.exclude.entities=…&take=10&feature.explainability=true` | `QlooEntity[]` with affinity and tags |

- **Caching:** in-memory LRU Map keyed by full URL, TTL 30 min, max 200 entries. Reduces quota use and keeps demos fast.
- **Timeouts:** 8 s per call, 1 retry on network error or 5xx, no retry on 4xx.
- **Normalization (`normalize.ts`):** map each response to `QlooEntity { id, name, type, weight(0..1), tags: string[], imageUrl?, location? }`. If a numeric affinity score is absent, use rank-based weight `w = 1 − 0.7 × rank/N`. Drop entries without id or name. Unit-tested with synthetic JSON.
- **Errors:** `401/403` → `QLOO_NO_KEY`; `429` → `QLOO_RATE_LIMIT` (with `retryAfterSec` if header present); network/5xx → `QLOO_UNAVAILABLE`; `400` → logged with sanitized URL, surfaced as `QLOO_UNAVAILABLE` plus dev-only detail.

### 2. LLM chain — `lib/llm/*`

Providers share one OpenAI-compatible shape:

| Provider | Endpoint | Auth | Tools |
|---|---|---|---|
| groq | `https://api.groq.com/openai/v1/chat/completions` | `Authorization: Bearer $GROQ_API_KEY` | yes |
| gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | `Authorization: Bearer $GEMINI_API_KEY` | yes |
| cloudflare | `https://api.cloudflare.com/client/v4/accounts/$CF_ACCOUNT_ID/ai/v1/chat/completions` | `Authorization: Bearer $CF_API_TOKEN` | **no** (treated as text/JSON only) |

```ts
// lib/llm/chat.ts
export interface ChatMessage { role: 'system'|'user'|'assistant'|'tool'; content: string; tool_call_id?: string; tool_calls?: ToolCall[] }
export interface ChatRequest { messages: ChatMessage[]; tools?: ToolSpec[]; json?: boolean; temperature?: number; maxTokens?: number }
export interface ChatResult { text: string; toolCalls: ToolCall[]; provider: ProviderName; model: string }
export async function chat(req: ChatRequest): Promise<ChatResult>  // tries providers in order
```
**Fallback rule:** on HTTP 429, 5xx, timeout (20 s) or unparseable response, try the next provider. If `tools` is set, skip providers without tool support. If no provider remains, throw `LLM_UNAVAILABLE` and callers use the **scripted** or **template** fallback.

**JSON discipline:** every LLM JSON output is parsed with a Zod schema; on failure retry once with "Return only valid JSON matching the schema", then fall back.

### 3. Cloudflare Workers AI image — `lib/image/cloudflare.ts`

```ts
POST https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_IMAGE_MODEL}
Headers: Authorization: Bearer ${CF_API_TOKEN}, Content-Type: application/json
Body: { "prompt": string, "steps": 6 }   // schnell: default 4, max 8
Response: { "result": { "image": "<base64 JPEG>" }, "success": true, "errors": [] }
```
- Server returns `data:image/jpeg;base64,<image>` to the client.
- Timeout 40 s. HTTP 429 or error code indicating daily limit → `IMAGE_QUOTA`. Other failures → `IMAGE_FAILED`.
- Width/height are assumed fixed (schnell default 1024²). Do not send them unless the docs for your chosen model list them.

---

## TypeScript Interfaces (`types/index.ts` re-exports; Zod versions in `05-BACKEND-SCHEMA.md`)

```ts
export type CreatorType = 'musician'|'podcaster'|'youtuber'|'streamer'|'comic_artist'|'other'
export type BudgetTier = 'small'|'medium'|'large'
export type PriceTier = 'budget'|'mid'|'premium'
export type EntityType = 'artist'|'brand'|'place'|'movie'|'tv_show'|'book'|'podcast'|'videogame'|'destination'
export type ProductCategory = 'apparel'|'print'|'objects'|'consumables'
export type ProductRole = 'core'|'hero'|'limited'

export interface CatalogItem {       // one row of data/catalog.json
  id: string; name: string; noun: string
  category: ProductCategory
  silhouette: 'cap'|'top'|'socks'|'tote'|'flat'|'round'|'cassette'|'mug'|'bottle'|'bag'|'can'|'bandana'|'cards'
  tags: string[]                     // canonical tags (taste fit)
  crossDomainTags: string[]          // canonical tags (games, drinks, places…)
  brandCategories: string[]          // brand-category vocabulary
  minRun: number
  unitCost: [number, number]         // USD per unit at min run (estimate)
  setupCost: number                  // USD one-off (estimate)
  priceRange: [number, number]       // USD retail guardrail
  supplierType: string; supplierBrief: string
  complianceNote?: string
  difficulty: 'low'|'medium'|'high'
  lowRisk: boolean; hero: boolean; collab?: boolean
}

export interface StudioInput {
  text: string                       // free text or artist name as typed
  artist?: { id: string; name: string }   // set when user picked an autocomplete result
  soundsLike: string[]               // up to 3 names
  city: string                       // may be ''
  creatorType: CreatorType
  budget: BudgetTier
}

export interface WeightedTag {
  name: string                       // as shown (Qloo's name)
  qlooTagId?: string
  canonical?: string                 // mapped to data/canonical-tags.json
  weight: number                     // 0..1
  source: 'qloo'|'llm_estimate'
}

export interface AffinityEntity {
  id: string; name: string; type: EntityType
  weight: number                     // 0..1
  tags: string[]
  canonicalTags: string[]            // mapped, may be LLM-estimated
  brandCategories?: string[]         // brands only
  priceTier?: PriceTier              // brands only
  estimated: boolean                 // true if canonicalTags/brandCategories came from LLM
  imageUrl?: string
  location?: string
}

export interface TasteProfile {
  path: 'A_artist_found' | 'B_description'
  artist?: { id: string; name: string }
  seeds: { entityIds: string[]; tagIds: string[] }
  tags: WeightedTag[]
  brands: AffinityEntity[]
  crossDomain: AffinityEntity[]      // videogame, tv_show, movie, book, podcast
  inspirationPlaces: AffinityEntity[]
  priceTier: PriceTier
  priceTierEstimated: boolean
  paletteId: string
  notes: string[]                    // shown in UI (e.g. "Artist not found in Qloo")
  agentMode: 'llm_agent' | 'scripted_fallback'
  qlooCalls: number
}

export interface EvidenceLink {
  kind: 'tag'|'brand'|'cross_domain'
  label: string                      // e.g. "retro gaming"
  entityName?: string                // brand/entity that drove it
  entityId?: string
  points: number                     // contribution to the 0–100 fit score
  estimated: boolean
}

export interface Pricing {
  unitCost: number; price: number; marginPerUnit: number
  minRun: number; setupCost: number; firstRunCost: number
  breakEvenUnits: number | null      // null = not reachable within min run
  typicalRange: [number, number]
  estimate: true
}

export interface ProductDescription {
  text: string                       // 40–70 words, what it looks like
  version: number                    // increments on every change
  history: string[]                  // previous versions for Undo (max 5)
  source: 'llm' | 'template' | 'user'
}

export type ImageStatus = 'idle'|'generating'|'ready'|'failed'|'quota'|'cap'
export interface ProductImage {
  status: ImageStatus
  dataUrl?: string                   // memory only, never persisted
  attempts: number                   // 0..3
  outdated: boolean
  error?: string
}

export type Decision = 'pending'|'approved'|'rejected'
export interface ProductProposal {
  id: string                         // catalog id
  name: string; oneLiner: string
  category: ProductCategory; role: ProductRole
  silhouette: string
  fitScore: number                   // 0..100
  scoreParts: { tag: number; brand: number; cross: number }  // 0..1 each
  evidence: EvidenceLink[]
  pricing: Pricing
  supplierType: string; supplierBrief: string
  complianceNote?: string
  description: ProductDescription
  decision: Decision
  image: ProductImage
  replacedFrom?: string              // catalog id of the rejected product
}

export interface CollabSuggestion {
  id: string; name: string; type: 'place'|'brand'
  area?: string; tags: string[]
  partnerIdea: string                // LLM text restricted to supplied data, or template
  linkedProductIds: string[]
}

export interface DropStep { wave: 'core'|'hero'|'limited'; weekOffset: number; productIds: string[]; runSizes: Record<string, number>; note: string }
export interface DropPlan { steps: DropStep[]; firstRunTip: string }

export interface ApiErrorBody { error: { code: ErrorCode; message: string; field?: string; retryAfterSec?: number } }
export type ErrorCode = 'VALIDATION'|'QLOO_NO_KEY'|'QLOO_RATE_LIMIT'|'QLOO_UNAVAILABLE'|'LLM_UNAVAILABLE'|'IMAGE_QUOTA'|'IMAGE_FAILED'|'MODERATION_BLOCKED'|'RATE_LIMITED'|'INTERNAL'
```

---

## Agent Design — `lib/agent/*`

**Principle:** the LLM *decides which Qloo calls to make*; it never *produces* data. Tool results are stored server-side in `AgentMemory`; the final `TasteProfile` is assembled from memory by code, not by the LLM.

### Tools exposed to the LLM (`tools.ts`)

| Tool | Args | Backed by | Result summary shown in UI |
|---|---|---|---|
| `qloo_search_entity` | `{query:string, type:'artist'\|'brand'\|'place'}` | `searchEntities` | "Found *X* (artist)" / "No match for *X*" |
| `qloo_search_tags` | `{query:string}` | `searchTags` | "Matched tags: a, b, c" |
| `qloo_taste_tags` | `{entityIds?:string[], tagIds?:string[]}` | `tasteTags` | "Audience taste tags: …" |
| `qloo_related` | `{type:'brand'\|'videogame'\|'tv_show'\|'movie'\|'book'\|'podcast', entityIds?, tagIds?}` | `related` | "12 related brands" |
| `note` | `{text:string}` | — | Free-text note shown in panel (max 160 chars) |
| `finish` | `{path:'A'\|'B', summary:string}` | — | Ends loop |

**Guards:** max 8 tool calls; 45 s wall clock; arguments validated with Zod; entity/tag IDs in args must exist in `AgentMemory` (else the call is rejected with "unknown id" and the model is told); each tool result truncated to 12 items before being fed back to the model.

### System prompt (`prompts.ts → AGENT_SYSTEM`)

```
You are MerchDesk's taste researcher. Build an audience taste profile for a creator's fans using ONLY the provided Qloo tools.

Rules:
1. If the user named an artist, call qloo_search_entity(type="artist") first. If no result clearly matches the name, do NOT guess. Call note("Not found in Qloo — trying genre and interest tags") and use qloo_search_tags with the genres/interests from the description and any "sounds like" names.
2. Call qloo_taste_tags once using the best seed ids you have.
3. Call qloo_related for type "brand" once. Then call it for up to 3 cross-domain types (videogame, tv_show, movie, book, podcast) that match what the fans are said to like. Skip types with no relevance.
4. Use only ids returned by tools. Never invent ids, names or facts about the artist.
5. Use at most 8 tool calls total. When you have taste tags, brands and at least one cross-domain list (or you have run out of useful calls), call finish.
6. Keep notes short and factual.
```

### Scripted fallback (`scripted.ts`)
Used when no tool-capable LLM provider is available or the loop fails. Fixed sequence, no LLM: artist search if `input.artist`/text looks like a name; else split description into up to 4 keyword phrases and call `searchTags` for each → `tasteTags` → `related(brand)` → `related` for the first 2 cross-domain types detected by keyword (`game`→videogame, `show|series|tv`→tv_show, `movie|film`→movie, `book|read`→book, `podcast`→podcast). Marks `agentMode: 'scripted_fallback'`.

### Classification step (`score/classify.ts`)
After tool results are in, entities with no mapping in `tag-aliases.json` / `brand-tiers.json` are classified in **one batched LLM call** into the fixed vocabularies (`canonical-tags.json`, brand categories) and flagged `estimated: true`. If the LLM is unavailable they are simply skipped (never guessed by code).

---

## Scoring, Selection, Pricing (deterministic; `lib/score/*`)

### Mapping to canonical tags
`tag-map.ts`: lowercase → trim → exact match in `tag-aliases.json` → else substring match on alias keys → else unmapped (kept for display, not scored). Profile weight per canonical tag `P[c]` = max weight among tags mapping to `c`. Cross-domain weights `X[c]` built the same way from `crossDomain` and `inspirationPlaces` entities' `canonicalTags` × entity weight.

### Fit score
```
tag    = clamp( Σ_{c ∈ item.tags ∩ P}            P[c] / 2 , 0, 1 )
brand  = clamp( Σ top2 over brands b with b.brandCategories ∩ item.brandCategories ≠ ∅
                    of (b.weight × (b.estimated ? 0.6 : 1)) / 2 , 0, 1 )
cross  = clamp( Σ_{c ∈ item.crossDomainTags ∩ X}  X[c] / 1.5 , 0, 1 )
fitScore = round( 100 × (0.5·tag + 0.3·brand + 0.2·cross) )
```
Evidence points per link = coefficient × (share of that term contributed by the link) × 100. Top 3 links by points are kept. Ties break on catalog `id` for determinism.

### Selection (`rules.ts`)
Per-item first-run cap and total cap by budget:

| Budget | Per-item first-run cap | Total first-run cap | Target size |
|---|---|---|---|
| small | $200 | $700 | 6 |
| medium | $600 | $2,200 | 7 |
| large | $1,500 | $6,000 | 8 |

`firstRunCost = setupCost + minRun × mean(unitCost range)`.
1. Eligible = items with `firstRunCost ≤ perItemCap`.
2. Hero = highest-fit eligible item with `hero: true`; if none, highest-fit non-lowRisk eligible item.
3. Low-risk = highest-fit eligible item with `lowRisk: true`.
4. Fill by descending fit, skipping items that would make a category exceed 3 items or consumables exceed 2, stopping at target size or total cap.
5. If fewer than 3 categories, swap the lowest-fit item for the best-fit item from a missing category.
6. If fewer than 5 items fit, relax per-item cap by 25% once, then return what exists with a note.
7. Roles: hero → `hero`; the collab consumable or highest-priced non-hero item with `minRun ≤ 50` → `limited` (if any); rest → `core`.

### Pricing (`pricing.ts`)
```
mult = { budget: 2.2, mid: 2.8, premium: 3.5 }[profile.priceTier]
unitCost = (lo + hi) / 2
price = charm( clamp(unitCost × mult, priceRange[0], priceRange[1]) )   // charm = nearest .00 or .50
marginPerUnit = price − unitCost
firstRunCost = setupCost + minRun × unitCost
breakEvenUnits = ceil(firstRunCost / price)  →  null if > minRun
```
`priceTier` comes from brands' tiers weighted by affinity (`brand-tiers.json`; unknown brands LLM-estimated, `priceTierEstimated=true`); default `mid`. Public benchmarks from the earlier research (stickers ≈ $5, posters ≤ $10, totes $15–25) are *guardrails already encoded in `priceRange`*; re-verify before quoting them publicly.

### Drop plan (`drops.ts`)
| Wave | Week offset | Contents | Run size |
|---|---|---|---|
| core | 0 | all `core` products | `minRun` |
| hero | 2 | hero product, pre-order framing | `minRun` |
| limited | 5 | limited product, numbered edition | `minRun` |
Run size never exceeds `2 × minRun`. `firstRunTip` = "Order less than you think you'll sell — a sell-out creates demand." (from the earlier research; keep wording soft, no statistics).

---

## Image Pipeline (describe → approve → generate)

```
catalog + profile ─► describeProducts() ─► ProductDescription (text only)
                                   │
              user edits/approves ─┘
                                   ▼
                 POST /api/image { approved: true, text }
                                   │
              moderation.check ─► sanitize ─► buildImagePrompt ─► Cloudflare FLUX ─► data URL
```

1. **Description generation (`score/describe.ts` via `llm/prompts.ts → DESCRIBE_SYSTEM`):** one batched JSON call for all products. Input per product: catalog name/category/materials hints, top 3 canonical tags, palette color names. Output: `{id, name, oneLiner, visualDescription}`. Rules: 40–70 words; cover object, materials, colours (from palette), motif drawn from tags, overall mood; **no brand names, no artist name, no text or logo content**, no sales claims. Zod-validated; word count enforced (retry once, else template).
2. **Template fallback:** `"A {material} {noun} in {color1} and {color2}, decorated with a simple {motif} motif, finished in a {mood} style."` with motif/mood looked up from tag→phrase tables in `palettes.json`.
3. **Approval gate:** the client state machine (`studio-reducer.ts`) only dispatches `IMAGE_REQUESTED` from state `approved`. `/api/image` additionally requires `approved: true` and a non-empty `approvedDescription`; otherwise `422 VALIDATION`. A unit test asserts that no code path other than the approve action calls the image API.
4. **Moderation (`moderation.ts`):** remove (word-boundary, case-insensitive) the artist name, every Qloo-returned brand name in the profile, and a static list of major trademarks (e.g. Nike, Adidas, Supreme, Nintendo, Pokémon, Disney, Marvel, Carhartt) from the description. Reject with `MODERATION_BLOCKED` if it contains unsafe terms (weapons, nudity, slurs, real-person names list). Strip any "text saying", "logo", "slogan", "brand" phrases.
5. **Prompt template (`image/prompt.ts`):**
```
Studio product photograph of {categoryNoun}: {sanitizedDescription}. Colour palette: {paletteNames}. {palette.imageStyle}. Plain warm off-white seamless backdrop, soft natural shadow, centered {composition}, sharp focus, e-commerce catalog style. Blank unprinted label areas, no text, no letters, no logos, no watermark, no people.
```
`composition` by attempt: 1 = "front view", 2 = "three-quarter view", 3 = "flat lay from above". (FLUX has no negative prompt, so the constraints are phrased positively. Free text-to-image models often garble text even when told to avoid it; the UI labels outputs as concept images.)
6. **Session cap:** client refuses to call the API after `NEXT_PUBLIC_MAX_IMAGES_PER_SESSION` generations (counter in reducer).

---

## Error Handling Strategy

| Layer | Condition | Handling |
|---|---|---|
| Route handler | Invalid body | `400` `{error:{code:'VALIDATION', field}}` via Zod |
| Route handler | Rate limit hit | `429` `RATE_LIMITED` + `Retry-After` |
| Qloo | No key / 401 / 403 | `503` `QLOO_NO_KEY`; UI: "MerchDesk can't reach its taste data right now" + retry |
| Qloo | 429 | `503` `QLOO_RATE_LIMIT`; UI shows retry-after |
| Qloo | 5xx/timeout | 1 retry then `503` `QLOO_UNAVAILABLE` |
| Agent | Tool arg invalid / unknown id | Return error text to model once; second failure aborts loop → scripted fallback |
| Agent | 45 s budget hit | Emit `note`, build profile from memory so far, continue |
| LLM | All providers fail | `LLM_UNAVAILABLE` → scripted agent, template descriptions, skip compare panel with message |
| Image | Daily quota | `429`-like → `IMAGE_QUOTA`; card keeps sketch |
| Image | Other failure | `IMAGE_FAILED`; card offers Retry (counts as an attempt only on success) |
| Client | Network error | Toast "Connection problem — try again", action buttons re-enabled |
| Client | Unhandled render error | `app/error.tsx` shows "Something went wrong" + Reload; state in sessionStorage is kept |

---

## Performance Requirements

| Target | How |
|---|---|
| Landing LCP < 2.5 s on mobile | Static page, 3 fonts via `next/font` with `display: swap`, no images above the fold |
| Agent run ≤ 25 s typical, hard cap 45 s | ≤8 tool calls, Qloo cache, parallelize independent `related` calls with `Promise.all` where the agent requests multiple |
| Collection build ≤ 6 s | Scoring is pure and instant; one batched LLM call for descriptions |
| Image ≤ 15 s typical | FLUX schnell, 6 steps; skeleton with timer |
| No layout shift on card state change | Fixed aspect-ratio image stage (`aspect-square`) |
| Bundle | No heavy libs; `Silhouette` is inline SVG |

---

## Security Checklist

- [ ] No secret is ever referenced in client code; all keys read in route handlers via `lib/env.ts`
- [ ] No `NEXT_PUBLIC_` prefix on any key
- [ ] `.env.local` in `.gitignore`; `.env.example` has empty values only
- [ ] Every API body/query validated with Zod; max sizes enforced (text ≤ 1,000 chars, arrays ≤ 20, description ≤ 600 chars)
- [ ] LLM output treated as untrusted: JSON-parsed + Zod-validated; rendered as text only (never `dangerouslySetInnerHTML`)
- [ ] Prompt-injection hygiene: user text and Qloo strings are placed in clearly delimited data blocks; tool IDs validated against memory
- [ ] In-memory rate limits on all POST routes (best-effort; the providers' own free-tier caps are the real backstop)
- [ ] Response headers via `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`
- [ ] Logs never contain API keys, full prompts with user text in production, or Qloo keys in URLs (keys are headers)
- [ ] `MERCHDESK_DATA_MODE=fixtures` refused in production builds
- [ ] Generated images and user text are not stored server-side

---

## Testing Strategy (`tests/`, run with `npx vitest run`)

| File | Covers |
|---|---|
| `score.test.ts` | Fit formula edge cases (no overlap = 0, saturation at 1), deterministic ordering, evidence points sum |
| `pricing.test.ts` | Tier multipliers, clamping, charm rounding, break-even null case |
| `drops.test.ts` | Wave assignment, run size ≤ 2×minRun |
| `image-prompt.test.ts` | Template output, composition per attempt, no brand/artist name leakage |
| `moderation.test.ts` | Brand/artist stripping, blocklist rejection, "text/logo" phrase removal |
| `qloo-normalize.test.ts` | Synthetic response → `QlooEntity`, rank-based weights, drops invalid rows |
| `agent-loop.test.ts` | Mock LLM: invalid arg handling, unknown id rejection, max-calls stop, scripted fallback |
| Approval-gate test (in `agent-loop.test.ts` or `image-prompt.test.ts`) | `/api/image` handler rejects `approved: false` |

Manual matrix and Lighthouse checks are in `06-IMPLEMENTATION-PLAN.md`.

---

## Known Risks (technical)

| Risk | Mitigation |
|---|---|
| Qloo parameter names differ from this doc | Probe script first (Phase 2); change only `lib/qloo/client.ts` |
| Free-tier models/quotas change mid-week | Env-driven model names, provider chain, scripted + template fallbacks |
| SSE buffering on Vercel | `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`, flush after each event |
| Hobby function time limit | `maxDuration = 60`; agent hard cap 45 s; images 40 s timeout |
| In-memory rate limiter resets between serverless instances | Accept; real caps come from free-tier providers |
| FLUX ignores "no text" | UI label + blank-label phrasing; description rules avoid text content |
| Hobby plan is non-commercial | Fine for hackathon; migrate if commercialized |
