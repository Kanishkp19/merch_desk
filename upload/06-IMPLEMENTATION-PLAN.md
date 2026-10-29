# MerchDesk — Implementation Plan

## Assumptions

- Today is **Wed 28 Oct 2026**. Hackathon closes **Sat 31 Oct 2026, 9:15 AM IST**. **Internal submit target: Fri 30 Oct, 6 PM IST** (14+ hours of buffer). Finalists are announced soon after close and appear on air Nov 5, so keep the live demo stable after submitting.
- One developer + an AI coding agent (Claude Code, Cursor Agent or Windsurf). Roughly 2.5 working days.
- Everything free, no card (`02-TRD.md → Free-tier compliance`).
- Docs referenced: `01-PRD.md`, `02-TRD.md`, `03-APP-FLOW.md`, `04-UI-UX-BRIEF.md`, `05-BACKEND-SCHEMA.md`.

## Build Philosophy

1. **De-risk first.** The riskiest unknowns (Qloo key + parameter names, free LLM tool-calling, free image generation) are tested in Phase 2 before any UI exists.
2. **Vertical slices.** Each phase ends with something runnable and verifiable.
3. **Fallbacks are features.** Scripted agent, template descriptions and SVG sketches are built, not "if time permits".
4. **Feature freeze Friday noon.** After that: bug fixes, README, submit.
5. **Cut order if late:** compare panel polish → drop timeline polish → line-sheet polish → replace flow. **Never cut:** agent thinking panel, scored collection with evidence, describe→approve→image flow, side-by-side compare (basic version), README/license/live URL.

## Schedule (IST)

| When | Phases |
|---|---|
| Wed 28 Oct, evening | 0, 1, 2 (gate), 3 |
| Thu 29 Oct, morning | 4, 5 |
| Thu 29 Oct, afternoon | 6, 7 |
| Thu 29 Oct, evening/night | 8, 9 |
| Fri 30 Oct, morning | 10, test matrix, bug fixes |
| Fri 30 Oct, noon → 6 PM | 11 (polish, README, deploy check, submit) |

---

## Phase 0 — Accounts and Keys (all free, no card)

**Entry:** none. **Exit:** all keys in a local notes file (never in git).

- [ ] **Qloo:** request/confirm the hackathon API key via the developer guide linked on the Devpost page (`https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide`). Keys are issued manually and only work on `https://hackathon.api.qloo.com`. Also join the hackathon Discord (listed in the Devpost to-dos) — ask there if the key is slow.
- [ ] **Groq:** create a free account → API key (`GROQ_API_KEY`). Do not add billing.
- [ ] **Google AI Studio:** create a key (`GEMINI_API_KEY`). Do not enable billing. Use `gemini-2.5-flash-lite`.
- [ ] **Cloudflare:** free account → Workers AI → "Use REST API" → create API token with Workers AI permission; copy **Account ID** and token (`CF_ACCOUNT_ID`, `CF_API_TOKEN`). Stay on the Free plan.
- [ ] **GitHub:** new **public** repo `merchdesk` (no template).
- [ ] **Vercel:** sign in with GitHub, Hobby plan.

**Verify:** you can `curl` each provider once (Phase 2 scripts do this).

---

## Phase 1 — Scaffold, License, First Deploy

**Entry:** Phase 0 done. **Exit:** blank app live on a `*.vercel.app` URL; MIT license visible in repo About.

```bash
npx create-next-app@15 merchdesk --typescript --tailwind --app --eslint --no-src-dir --import-alias "@/*"
cd merchdesk
npm i zod lucide-react clsx
npm i -D vitest @vitest/coverage-v8 tsx @types/node

mkdir -p app/{studio,line-sheet,about} app/api/{status,search,collection,describe,replace,image,collabs,compare} app/api/agent/profile
mkdir -p components/{layout,landing,studio,mockups,print,ui}
mkdir -p lib/{qloo,llm,agent,score,image,http,state,schemas} data/fixtures scripts tests types
```

**Files to create/modify**
- `LICENSE` — standard MIT text, "Copyright (c) 2026 Kanishk".
- `.env.example` — copy the block from `02-TRD.md → Environment Variables` with empty values.
- `.gitignore` — ensure `.env*.local` is ignored.
- `app/globals.css` — paste the full CSS block from `04-UI-UX-BRIEF.md → CSS Variables and Tokens`.
- `app/layout.tsx` — fonts (Archivo Black, Space Grotesk, JetBrains Mono), `<html lang="en">`, "Skip to content" link, `<main id="main">`.
- `next.config.ts` — security headers from `02-TRD.md → Security Checklist`.
- `vitest.config.ts` — `test: { environment: 'node', include: ['tests/**/*.test.ts'] }` with `@` alias.
- `package.json` scripts: `"test": "vitest run"`, `"probe:qloo": "tsx scripts/probe-qloo.ts"`, `"smoke:llm": "tsx scripts/smoke-llm.ts"`, `"smoke:image": "tsx scripts/smoke-image.ts"`, `"validate:data": "tsx scripts/validate-data.ts"`.
- `README.md` — paste from `README.md` in this docs folder.

```bash
git init && git add -A && git commit -m "chore: scaffold MerchDesk"
git branch -M main
git remote add origin https://github.com/<you>/merchdesk.git && git push -u origin main
```
- Vercel: **Add New → Project → import repo** → Framework: Next.js → Deploy.
- GitHub repo → ⚙ About → confirm the license shows as **MIT** (GitHub detects `LICENSE`). If not, edit the About box and re-check; it is a hard submission requirement.

**Verify:** `npm run dev` loads `localhost:3000`; the Vercel URL loads; About shows MIT.

---

## Phase 2 — Provider Probes (THE GATE)

**Entry:** Phase 1 done. **Exit:** all three probes pass, or a documented workaround exists. **Do not start Phase 3+ until this is green.**

### `scripts/probe-qloo.ts`
Loads `.env.local` (use `process.loadEnvFile?.('.env.local')` on Node 20.12+ or `dotenv`-free manual parse). Calls, in order, printing status code, first 2 results, and the exact URL (key omitted):
1. `GET /search?query=Arctic Monkeys&types=urn:entity:artist&take=3` (famous artist)
2. `GET /search?query=<a small indie band you know>&types=urn:entity:artist&take=3` (record whether it's found)
3. `GET /v2/tags?filter.query=retro gaming&take=5`
4. `GET /v2/insights?filter.type=urn:tag&signal.interests.entities=<id from 1>&take=10`
5. `GET /v2/insights?filter.type=urn:entity:brand&signal.interests.entities=<id from 1>&take=10`
6. `GET /v2/insights?filter.type=urn:entity:videogame&signal.interests.tags=<tag id from 3>&take=10`
7. `GET /v2/insights?filter.type=urn:entity:place&signal.interests.entities=<id from 1>&filter.location.query=Columbus, Ohio&take=10`
8. Same as 5 with `&filter.exclude.entities=<first result id>` (confirms exclusion works)
Header on every call: `X-Api-Key: $QLOO_API_KEY`, base `https://hackathon.api.qloo.com`.

**Record results in `docs/qloo-notes.md`** (new file in repo): correct parameter names, response field names for id/name/score/tags/location, and whether entity results include a numeric affinity score and a tag list. Update `lib/qloo/client.ts` and `normalize.ts` to match reality. If a parameter in `02-TRD.md` is wrong, fix it **only** in the adapter.

### `scripts/smoke-llm.ts`
For each configured provider: send a trivial chat completion, then one with a dummy tool (`get_weather`) and confirm a `tool_calls` response. Print provider, model, ms, and whether tools worked. **Pick the order of `LLM_PROVIDERS` from the results.** If Gemini 2.5 Flash-Lite isn't available, set `GEMINI_MODEL` to what AI Studio lists as free.

### `scripts/smoke-image.ts`
POST to the Cloudflare FLUX endpoint (`02-TRD.md → Cloudflare Workers AI image`), write `tmp/test.jpg`, print elapsed ms. Open the file and look at it. If `steps: 6` errors, use the default.

**Decision table**
| Result | Action |
|---|---|
| Qloo key not issued yet | Ask in Discord; meanwhile build with `MERCHDESK_DATA_MODE=fixtures` (synthetic data, dev only). The demo must use live Qloo before submit |
| Artist-not-found for indie band | Expected; Path B must handle it — add as test case |
| No provider supports tools | Agent always runs in scripted mode; keep the thinking panel (it streams the scripted steps) and label "Fallback: fixed steps" |
| Cloudflare image fails | Try `@cf/stabilityai/stable-diffusion-xl-base-1.0` from the Workers AI catalog; if all fail, ship SVG sketches only and say so honestly |

**Commit:** `git commit -m "chore: provider probes and notes"`.

---

## Phase 3 — Data Files and Validation

**Entry:** Phase 2 green. **Exit:** `npm run validate:data` passes.

**Files**
- `data/canonical-tags.json`, `data/tag-aliases.json`, `data/palettes.json`, `data/brand-tiers.json`, `data/catalog.json` — copy from `05-BACKEND-SCHEMA.md → Static Data Files`. Extend `brand-tiers.json` to 40–60 brands and `palettes.json` with `motifs` and `moods` tables (≥1 phrase per canonical tag).
- `types/index.ts` — all interfaces from `02-TRD.md → TypeScript Interfaces` (including `CatalogItem`).
- `lib/schemas/{input,profile,product,api,events}.ts` — copy from `05-BACKEND-SCHEMA.md → Zod Schemas`.
- `scripts/validate-data.ts` — asserts: 20 unique catalog ids; all `tags`/`crossDomainTags` ∈ canonical tags; `silhouette` ∈ 13 known; `unitCost[0] ≤ unitCost[1]`; `priceRange[0] ≤ priceRange[1]`; every palette `matchTags` ∈ canonical tags; each canonical tag has a motif and mood phrase.

**Verify:** `npm run validate:data` prints "OK 20 items".
**Commit:** `feat: data files and schemas`.

---

## Phase 4 — Scoring, Selection, Pricing, Drop Plan (pure code, TDD)

**Entry:** Phase 3. **Exit:** `npm test` green for score/pricing/drops.

**Files and signatures**
- `lib/score/tag-map.ts` — `canonicalize(name: string): string | null`; `buildTagWeights(tags: WeightedTag[]): Map<string, number>`; `buildCrossWeights(entities: AffinityEntity[]): Map<string, number>`.
- `lib/score/score.ts` — `scoreItem(item: CatalogItem, ctx: ScoreContext): { fit: number; parts: {tag:number;brand:number;cross:number}; evidence: EvidenceLink[] }` implementing the formula in `02-TRD.md → Fit score`.
- `lib/score/rules.ts` — `selectCollection(items: CatalogItem[], scores: Map<string, ScoreResult>, budget: BudgetTier, excludeIds: string[]): { picks: CatalogItem[]; notes: string[] }` implementing selection steps 1–7 and the budget cap table.
- `lib/score/pricing.ts` — `priceItem(item: CatalogItem, tier: PriceTier): Pricing`.
- `lib/score/drops.ts` — `planDrops(products: ProductProposal[]): DropPlan`.
- `lib/score/palette.ts` — `pickPalette(tagWeights): string` (highest `matchTags` overlap; default `mono-punk`).
- Tests: `tests/score.test.ts`, `tests/pricing.test.ts`, `tests/drops.test.ts` covering: zero overlap → 0; saturation at 1; deterministic tie-break by id; hero present when eligible; ≥3 categories; a `small` budget excludes `hero-crewneck`; `breakEvenUnits === null` when first-run cost > minRun × price; run size ≤ 2×minRun.

**Verify:** `npm test` all green.
**Commit:** `feat: scoring, rules, pricing, drops`.

---

## Phase 5 — Qloo Client, LLM Chain, Agent Loop, SSE Route

**Entry:** Phase 4. **Exit:** `curl -N` to `/api/agent/profile` streams a full run and ends with a `profile` event.

**Files**
- `lib/env.ts` — Zod-parse env; export `getEnv()`; throw readable error listing missing keys.
- `lib/http/{errors,sse,rate-limit}.ts` — `apiError(code, message, status, extra?)`; `sseResponse(run: (send: (e: AgentEvent) => void) => Promise<void>)` that sets the headers in `05-BACKEND-SCHEMA.md → POST /api/agent/profile` and flushes after each event; `rateLimit(key: string, limit: number, windowMs: number): {ok: boolean; retryAfterSec: number}`.
- `lib/qloo/{types,client,normalize}.ts` — adapter methods from `02-TRD.md → Qloo`; LRU cache; timeouts; error mapping. Use the corrected parameter names from Phase 2 notes.
- `lib/llm/{providers,chat,prompts}.ts` — chain with fallback; `AGENT_SYSTEM`, `DESCRIBE_SYSTEM`, `CLASSIFY_SYSTEM`, `GENERIC_SYSTEM` prompts.
- `lib/agent/{tools,memory,events,loop,scripted}.ts` — tools + Zod arg schemas, `AgentMemory` (Maps of entities/tags by id), loop with limits (8 calls, 45 s), `assembleProfile(memory, input): TasteProfile`, scripted fallback.
- `lib/score/classify.ts` — one batched LLM call for unmapped brand/cross-domain names → canonical tags/brand categories/tier; result flagged `estimated`.
- `app/api/agent/profile/route.ts` — `export const runtime='nodejs'; export const maxDuration=60`; validate body; rate-limit; run loop (or scripted); stream events.
- `app/api/search/route.ts`, `app/api/status/route.ts`.
- `tests/agent-loop.test.ts` (mock `chat`): invalid args retried once; unknown id rejected; stops at 8 calls; falls back to scripted when `chat` throws `LLM_UNAVAILABLE`.
- `tests/qloo-normalize.test.ts`.

**Verify (manual):**
```bash
npm run dev
curl -N -X POST localhost:3000/api/agent/profile -H 'Content-Type: application/json' \
  -d '{"text":"Midwest emo band, fans love vintage video games and craft sour beers","city":"Columbus, Ohio","creatorType":"musician","budget":"medium","soundsLike":[]}'
```
Expect `step`/`tool_call`/`tool_result` events then `profile`, `done`. Repeat with a real artist name and with `{"text":"<tiny indie band>", ...}` — confirm the "Not found in Qloo" note path.
**Commit:** `feat: qloo client, llm chain, agent, sse`.

---

## Phase 6 — Collection, Describe, Replace, Image, Collabs, Compare APIs

**Entry:** Phase 5. **Exit:** each endpoint returns the documented shape via curl.

**Files**
- `lib/score/describe.ts` — `describeProducts(picks, profile, palette): Promise<{descriptions, source}>` (batched LLM + `llmDescribeSchema` validation + one retry + template fallback); `reviseDescription(text, instruction, ...)` (LLM, else deterministic phrase-swap).
- `app/api/collection/route.ts` — build tag/cross weights → score → `selectCollection` → `priceItem` → describe → `planDrops` → response.
- `app/api/describe/route.ts`, `app/api/replace/route.ts` (uses `qloo.related` with `excludeEntityIds` and optional `positiveEntityIds`; re-scores; picks best eligible not in `currentProductIds` or rejected).
- `lib/image/{prompt,moderation,cloudflare}.ts` + `app/api/image/route.ts` — rules in `02-TRD.md → Image Pipeline`; reject when `approved !== true`.
- `app/api/collabs/route.ts` — `related(type='place' and 'brand', location=city)`; then one LLM call for `partnerIdea` strings restricted to supplied names (template fallback "Co-branded *product* with *Name*"); link `linkedProductIds` by tag overlap (beer→beer-label-collab, coffee→coffee-collab, sauce/foodie→hot-sauce-collab).
- `app/api/compare/route.ts` — plain LLM call, no Qloo data, `GENERIC_SYSTEM`: "List N merch product ideas for this creator. Return JSON {items:[{name,reason}]}."
- Tests: `tests/image-prompt.test.ts`, `tests/moderation.test.ts` (including an assertion that the image route handler returns 422 when `approved` is false or description empty).

**Verify:** curl each endpoint using output from Phase 5. Check `/api/image` returns a `data:image/jpeg;base64,` string, and that sending `"approved": false` returns 422.
**Commit:** `feat: collection, describe, replace, image, collabs, compare APIs`.

---

## Phase 7 — UI Foundations, Landing, Studio Shell, Taste Profile

**Entry:** Phase 6. **Exit:** full flow from `/` to a confirmed taste profile works in the browser.

**Files**
- `components/ui/*` — implement per `04-UI-UX-BRIEF.md → Component Library` (Button, Chip, Card, Input, Select, Textarea, Skeleton, Modal, Drawer, Tooltip, ScoreRing, Sticker, Tape, Toast).
- `components/layout/{SiteHeader,SiteFooter,PoweredByQloo,ToastHost}.tsx`.
- `lib/state/{studio-reducer.ts,StudioProvider.tsx,storage.ts}` — state shape and actions in `03-APP-FLOW.md → Studio State`; persist text-only fields to `sessionStorage['merchdesk:v1']` in `useEffect`; strip `image.dataUrl` before saving.
- `lib/api-client.ts` — `getStatus`, `search`, `streamProfile(input, onEvent)` (fetch + `ReadableStream` reader parsing `data:` lines), `postJson<T>`.
- `components/landing/{HeroInput,ExampleChips,ArtistAutocomplete}.tsx`, `app/page.tsx` — spec in `03-APP-FLOW.md → /`.
- `app/studio/page.tsx`, `components/studio/{Stepper,OptionsBar,AgentThinkingPanel,TasteProfileCard,TasteChips}.tsx` — spec in `03-APP-FLOW.md → /studio` sections 1–2.
- `app/about/page.tsx`, `app/not-found.tsx`, `app/error.tsx`.

**Verify:** run the Midwest-emo example; thinking panel streams; chips render; removing a chip works; Build button enables with ≥3 tags; 375 px width has no horizontal scroll.
**Commit:** `feat: landing, studio shell, taste profile UI`.

---

## Phase 8 — Collection UI and the Approval Gate

**Entry:** Phase 7. **Exit:** one product can go proposed → edited → approved → image → regenerate; reject → replacement works.

**Files**
- `components/mockups/Silhouette.tsx` — 13 SVG shapes.
- `components/studio/{CollectionGrid,ProductCard,ImageStage,DescriptionEditor,ApprovalBar,WhyPopover,NumbersDrawer}.tsx` — states table in `03-APP-FLOW.md → ProductCard`.
- Reducer logic for `EDIT_TEXT`, `TWEAK_OK`, `UNDO_TEXT`, `APPROVE`, `IMAGE_REQUESTED/OK/FAIL/QUOTA`, `SESSION_CAP`, `REGENERATE`, `REJECT`, `REPLACE_OK/NONE`, `UNDO_REJECT` per `05-BACKEND-SCHEMA.md → State Machines`.
- Session cap check in the action creator **before** calling `/api/image`.

**Verify (the key test):** open DevTools → Network, filter `image`. Run a full collection. **No `/api/image` request may appear until you click Approve.** Click Approve on one card → exactly one request. Regenerate twice → total 3 attempts, button disappears. Edit text after an image → "Outdated" shows and Approve is available again.
**Commit:** `feat: collection UI, approval gate, image flow`.

---

## Phase 9 — Collab Radar, Drop Timeline, Compare Panel

**Entry:** Phase 8. **Exit:** sections 4–5 work with live data.

**Files:** `components/studio/{CollabRadar,DropTimeline,ComparePanel,ExportBar}.tsx`; wire `POST /api/collabs` automatically after `COLLECTION_READY` when `input.city` is set; wire lazy `POST /api/compare` on first panel open.

**Verify:** with city "Columbus, Ohio" collabs show real Qloo places; with empty city the input prompt shows; compare panel renders both columns with overlap badges.
**Commit:** `feat: collabs, drop plan, compare panel`.

---

## Phase 10 — Line Sheet and Export

**Entry:** Phase 9. **Exit:** print preview shows a clean one-page A4 line sheet.

**Files:** `components/print/LineSheet.tsx`, `app/line-sheet/page.tsx` — spec in `03-APP-FLOW.md → /line-sheet`; print CSS already in `globals.css`.
**Verify:** Chrome → Print → A4 → one page for 7 products; images/sketches visible; disclaimers in footer; header/footer hidden.
**Commit:** `feat: printable line sheet`.

---

## Phase 11 — Polish, Test Matrix, Docs, Deploy, Submit

**Entry:** Phase 10. **Exit:** submitted.

### UI polish checklist
- [ ] Audit every component against `04-UI-UX-BRIEF.md` (classes, states, aria)
- [ ] Skeletons (not spinners) for chip groups, product cards, collabs
- [ ] All empty/error states from `03-APP-FLOW.md` implemented
- [ ] Mobile at 375 px: no horizontal overflow; 44 px targets
- [ ] Reduced-motion check; keyboard-only pass through landing → studio
- [ ] Copy audit: grep the repo for `buy`, `sell`, `predict`, `guarantee` in UI strings; fix any claims
- [ ] Lighthouse mobile accessibility ≥ 90 on `/` and `/studio`

### Manual test matrix (record results in `docs/test-log.md`)
| # | Input | Expect |
|---|---|---|
| 1 | Famous artist (e.g. "Arctic Monkeys"), city "London", medium, musician | Path A banner; 5–8 products; evidence chips reference real Qloo tags/brands; collabs in London |
| 2 | Small indie band you know, city "Jaipur", small | Path B (or A); "Not found in Qloo" note if applicable; collection still valid; hero rule relaxed for small budget |
| 3 | Description-only: "Midwest emo band, fans love vintage video games and craft sour beers", Columbus, medium | Taste chips include gaming/beer-like tags; products such as pins/cap/beer collab score high |
| 4 | Podcaster: "Food and true-crime podcast", Pune, medium, podcaster | Valid collection; consumable collab suggestions; no music-specific wording |
| 5 | Approval gate | Zero `/api/image` calls before Approve (Network tab); 1 call after |
| 6 | Tweak + Undo | Description changes, version increments, Undo restores |
| 7 | Not for us | Replacement appears; panel shows exclusion row; rejected item never returns |
| 8 | Kill LLM keys (blank in `.env.local`) | Scripted fallback banner; template descriptions; app still completes |
| 9 | Blank `CF_API_TOKEN` | Image card shows failure/quota message; sketch + description kept; line sheet works |
| 10 | Slow network (DevTools "Slow 3G") | Skeletons visible; no layout jump |
| 11 | Reload `/studio` mid-run | Text state restored; images show "Generate again" (not auto-called) |

### README and Devpost
- [ ] Final `README.md` (from `README.md` in this folder) with live URL filled in
- [ ] Devpost description (Appendix A below)
- [ ] GitHub About: description, website = live URL, topics (`qloo`, `agents`, `hackathon`, `nextjs`), **License: MIT visible**
- [ ] Repo contains **no secrets** (`git log -p | grep -i "api_key"` returns nothing real)

### Deployment checklist (exact steps)
1. `npm run build` passes locally with zero type errors; `npm test` green.
2. Vercel → Project → Settings → Environment Variables: add every variable from `.env.example` for **Production** and **Preview** (`QLOO_API_KEY`, `QLOO_BASE_URL`, `LLM_PROVIDERS`, `GROQ_API_KEY`, `GROQ_MODEL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CF_ACCOUNT_ID`, `CF_API_TOKEN`, `CF_LLM_MODEL`, `CF_IMAGE_MODEL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_MAX_IMAGES_PER_SESSION`, `MERCHDESK_DATA_MODE=live`, `RATE_LIMIT_ENABLED=true`).
3. Set `NEXT_PUBLIC_APP_URL` to the production URL; redeploy.
4. Open the production URL on **your phone** and run test #3 end to end including one image.
5. Open `/api/status`: `qloo: true`, at least one LLM provider, `image: true`, `dataMode: "live"`.
6. Confirm no account has a payment method (Groq, Google AI Studio, Cloudflare, Vercel).
7. Try the live link in an incognito window (judges won't be logged in).

### Submit (Devpost)
- [ ] Demo link (live URL) • [ ] Public repo URL • [ ] Text description • [ ] License visible • [ ] Hosted externally ✔ • Optional: 60-second screen recording (not required by the rules)
- Submit by **Fri 30 Oct 18:00 IST**. Re-open the submission page after saving to confirm it shows as submitted, not draft.

### Post-submit monitoring (free)
- Vercel → Logs for errors during judging; watch for 429s.
- Free uptime ping to `/api/status` every 5 minutes (e.g. UptimeRobot free plan or a GitHub Actions cron) — do not ping `/api/image`, `/api/agent/profile`, or any route that spends quota.
- Check Groq, AI Studio, Cloudflare dashboards daily for quota exhaustion; if images are exhausted the UI already degrades.

---

## Git Commit Strategy
One commit per phase (messages above), small `fix:` commits for bugs, tag `v1.0-submission` at submit time. Work on `main` (single developer); Vercel auto-deploys on push, so run `npm run build` before pushing late in the schedule.

## AI Agent Prompt Sequence (paste in order)

**Prompt 1 — Orientation**
```
Read 00-MASTER-PROMPT.md fully. Then read 02-TRD.md and 05-BACKEND-SCHEMA.md. Summarize in 10 lines: the stack, the free-only rule, the approval-gate rule for images, and the folder structure. Do not write code yet.
```
**Prompt 2 — Phases 1–3**
```
Execute Phases 1, 2 (scripts only), and 3 of 06-IMPLEMENTATION-PLAN.md exactly. Create every listed file. Run `npm run validate:data` and show me the output. Do not move on until it passes. Ask me for my API keys only by telling me which .env.local lines to fill.
```
**Prompt 3 — Phase 4**
```
Execute Phase 4 test-first: write tests/score.test.ts, pricing.test.ts, drops.test.ts from the formulas in 02-TRD.md, then implement lib/score/*. Run `npm test` and show me the results.
```
**Prompt 4 — Phase 5**
```
Execute Phase 5. Use the parameter names recorded in docs/qloo-notes.md for the Qloo adapter. Implement the agent loop with the guards in 02-TRD.md (max 8 tool calls, 45 s, validate IDs against memory) and the scripted fallback. Show me the curl command and its streamed output.
```
**Prompt 5 — Phase 6**
```
Execute Phase 6. The /api/image route MUST reject requests unless approved === true and approvedDescription is non-empty, and MUST sanitize the prompt per 02-TRD.md → Image Pipeline. Add the tests listed. Show curl examples for every endpoint.
```
**Prompt 6 — Phases 7–8**
```
Read 03-APP-FLOW.md and 04-UI-UX-BRIEF.md fully. Execute Phase 7, then Phase 8. Match class strings in 04-UI-UX-BRIEF.md exactly. The ProductCard must follow the state table in 03-APP-FLOW.md, and no image request may happen before Approve. After finishing, tell me how to verify this in the Network tab.
```
**Prompt 7 — Phases 9–10**
```
Execute Phases 9 and 10. Implement Collab Radar, Drop Timeline, Compare Panel, Export bar and the /line-sheet print view as specified in 03-APP-FLOW.md.
```
**Prompt 8 — Polish**
```
Audit every component against 04-UI-UX-BRIEF.md and every screen against 03-APP-FLOW.md. List mismatches, then fix them. Then grep all UI strings for 'buy', 'sell', 'predict', 'guarantee' and fix any claim that violates 01-PRD.md → Copy and Claims Rules.
```
**Prompt 9 — Deploy**
```
Walk me through the Deployment checklist in 06-IMPLEMENTATION-PLAN.md step by step. Do not skip the incognito and phone checks.
```

## Common Failure Points and Debugging

| Symptom | Likely cause | Fix |
|---|---|---|
| Qloo `401`/`403` | Wrong header or key for wrong host | Header must be `X-Api-Key`; base must be `hackathon.api.qloo.com` |
| Qloo `400` on videogame | Used `urn:entity:video_game` | Use `urn:entity:videogame` |
| Agent never finishes | Model keeps calling tools | Enforce max 8 calls in loop; return "tool budget exhausted — call finish" |
| LLM returns invalid JSON | Free model drifting | `json: true`, strict Zod, one retry, template fallback |
| Groq/Gemini `429` | Free tier rate limit | Chain falls through; check `/api/status` and dashboards |
| SSE shows nothing until the end | Response buffered | Verify headers in `05-BACKEND-SCHEMA.md`; send a leading comment `: ok\n\n`; flush per event |
| `FUNCTION_INVOCATION_TIMEOUT` | Run exceeded the Vercel limit | `maxDuration = 60`; cut agent calls; lower timeouts |
| Cloudflare `401`/`403` | Token lacks Workers AI permission or wrong account id | Recreate token; re-copy Account ID |
| Image comes back but won't display | Missing `data:image/jpeg;base64,` prefix | Prefix in `cloudflare.ts` |
| Images vanish on reload | By design (memory only) | Card shows "Generate again"; Download first |
| `sessionStorage` quota error | Storing images | Strip `dataUrl` in `storage.ts` |
| Hydration mismatch | Reading storage during render | Read in `useEffect` |
| Brand names appear in image prompt | Moderation not applied | Ensure `brandNames` sent by client and stripped server-side; unit test |
| Collection has <5 items | Budget too tight/eligible set small | Relax per-item cap once (rules step 6) and add note |
| Fonts not loading | Missing `variable` class on `<body>` | Apply all three font variables |

---

## Appendix A — Devpost Description (paste and edit)

**Problem.** Independent artists and creators often default to a logo on a black tee because they don't know what their specific fans would actually want to own — and a bad first print run ties up scarce cash.

**Solution.** MerchDesk is an agent that turns a creator's audience into a launch-ready merch collection. You describe your fans (or search an artist), and the agent researches their cultural taste with Qloo, then proposes 5–8 makeable products with estimated prices, margins, break-even quantities, supplier briefs, local collab partners and a Core/Hero/Limited drop plan. Every product is first described in words; only after you approve (or tweak) the description does MerchDesk generate a concept image.

**How it uses Qloo.** An LLM agent calls Qloo tools — entity search, tag search, taste (tag) analysis, and related-entity insights for brands, games, shows, books and local places with a city filter. If the artist isn't in Qloo, the agent notices and switches to genre and interest tags on its own. When a user rejects a product, the agent re-queries Qloo with that product's driving entities excluded and swaps in a replacement. A deterministic scoring layer matches Qloo's audience affinity to a catalog of real, makeable products, and every pick carries an evidence trail ("← retro gaming", "← audience affinity: …").

**Why it beats a generic LLM.** A side-by-side panel shows the same input answered by a generic LLM (no Qloo) and by MerchDesk. The LLM never invents data: tool results come from Qloo, numbers come from code, and the LLM only names products and writes descriptions from supplied facts.

**Honesty.** Qloo supplies affinity, not purchase data — copy says so. Prices and margins are our estimates. Images are AI concept images.

**Built with.** Next.js, TypeScript, Tailwind, Zod; Groq/Gemini/Cloudflare (free tiers) for the LLM; Cloudflare Workers AI (FLUX.1 schnell) for images; Qloo hackathon API; Vercel. Runs entirely on free tiers. MIT licensed.

**What's next.** Fan Crate bundles, shareable collections, multi-currency, supplier quote requests.
