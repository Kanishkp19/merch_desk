# MerchDesk implementation map (29 October 2026)

Written after inspecting the repository, not from the prior context report. Real paths, current state.

## What the repo actually is

- Next.js 16 + React 19 + Tailwind 4 + shadcn/radix. Single-page app shell at `src/app/page.tsx`
  with **hash routing** (`src/lib/routes.ts`): views `home`, `studio`, `line-sheet`, `about`.
- Flow: hero input (`src/components/landing/HeroInput.tsx`) → agent profile via Qloo or fixtures
  (`src/lib/agent/*`, `src/lib/qloo/*`) → deterministic collection scoring/selection
  (`src/lib/score/rules.ts`, `score.ts`) → product proposals with INR estimates
  (`src/lib/score/pricing.ts`) → descriptions (`score/describe.ts`, LLM with template fallback)
  → AI concept images → drop plan (`score/drops.ts`) → venue ideas (`src/lib/partners/india.ts`)
  → printable line sheet (`src/components/print/LineSheet.tsx`).
- Persistence: **sessionStorage only** (`src/lib/state/studio-reducer.ts`, key `merchdesk:v2`);
  image bytes in IndexedDB (`src/lib/image/storage.ts`). No account system.
- Prisma + SQLite is scaffolded (`prisma/schema.prisma`, `src/lib/db.ts`) but **unused boilerplate**
  (placeholder User/Post models; `db.ts` imported nowhere). `.env` DATABASE_URL points to a
  nonexistent `/home/z/...` path.
- API routes under `src/app/api/*` all exist and follow a consistent
  `handle()/jsonOk()/ApiError` convention (`src/lib/http/errors.ts`). No auth anywhere.
- Mocked/degradable integrations: Qloo (fixtures fallback), LLM (zai/groq/gemini/cf, template
  fallback), image gen (quota + moderation). All degrade honestly; none are fabricated as live.
- Tests: vitest, `tests/*.test.ts`, pure-logic only.

## Verified capability report vs prior context report

| Reported capability | Verified? |
| --- | --- |
| Creator briefs | Partial — `HeroInput` captures text/artist/city/budget/creatorType only |
| Recommendations | Yes — rules-based scoring with evidence links, 30-point fit floor |
| INR pricing | Yes — `src/lib/score/pricing.ts` (illustrative estimates, labelled) |
| Seven cities | Yes — `src/lib/india/cities.ts` + venue list `src/lib/partners/india.ts` (links only, no outreach) |
| Venues | Yes — curated with source URLs, explicitly unverified partnerships |
| Seasonal notes | Yes — `src/lib/score/drops.ts` `indiaSeasonNote()` |
| Printable line sheets | Yes — `LineSheetView` + `src/components/print/LineSheet.tsx`, print CSS |
| GST rates | **Stale** — apparel ≤₹1,000 @5% / >₹1,000 @12%. Superseded 22 Sep 2025: ≤₹2,500 @5%, >₹2,500 @18% (Notifications 9/2025 & 13/2025-Central Tax (Rate)). Fixed in this change. |

## Retain (unchanged)

- `src/lib/score/score.ts`, `score/tag-map.ts`, `classify.ts`, `describe.ts` — scoring + descriptions
- `src/lib/qloo/*`, `src/lib/llm/*`, `src/lib/image/*`, `src/lib/agent/*` — research pipeline
- `src/lib/india/cities.ts`, `src/lib/partners/*` — pilot geography and venues
- `src/lib/http/*` — route conventions (extended for new routes)
- `src/data/*` — catalog, tags, palettes
- `src/components/studio/*` product cards, stepper, agent panel — reused inside the launch flow
- `src/components/print/LineSheet.tsx` — evolved, not replaced

## Edit

- `src/components/views/LandingView.tsx` — rewritten for the musician pilot (section A)
- `src/components/landing/HeroInput.tsx` — CTA copy, pilot framing
- `src/lib/routes.ts` + `src/app/page.tsx` + `src/components/layout/SiteHeader.tsx` — new views
- `src/lib/score/pricing.ts` — GST 2.0 rates (verified 29 Oct 2026), break-even on contribution
  (old formula divided fixed cost by price, ignoring unit cost)
- `src/lib/state/studio-reducer.ts` / `StudioProvider.tsx` — brief + launch state slices
- `prisma/schema.prisma`, `.env` DATABASE_URL — launch persistence (was boilerplate)
- `src/components/print/LineSheet.tsx` — extended into exportable launch brief

## Add

- `src/lib/economics/engine.ts` + `schema.ts` — launch economics (money in integer paise;
  scenarios; contribution vs final profit; missing costs stay unknown, never zero)
- `src/lib/launch/*` — launch plan types, snapshot builder, checklist, brief export (markdown)
- `src/lib/launch/sample.ts` — clearly-labelled example plan
- `src/components/views/BriefView.tsx` — creator brief (section B)
- `src/components/views/LaunchView.tsx` — launch builder + economics + checklist (C, D, E)
- `src/components/views/QuoteView.tsx` — request review/submit + creator status (F)
- `src/components/views/OperatorView.tsx` — operator queue behind a pilot key (F)
- `src/app/api/launches/route.ts`, `src/app/api/launches/[ref]/route.ts`,
  `src/app/api/operator/requests/route.ts`, `src/app/api/operator/requests/[ref]/route.ts`
- `tests/economics.test.ts` + updates to `tests/pricing.test.ts`

## Defer (explicitly out of scope for this pilot build)

- Real authentication (accounts, sessions) — pilot uses ref-based retrieval + a shared operator key
- Supplier integrations, email dispatch, payment collection (Razorpay etc.) — manual workflows
- Subscriptions / commission marketplace — no evidence yet
- Demand forecasting from audience size — no evidence base

## Case-collision fix (macOS)

Git index tracked both `Button.tsx` and `button.tsx` (also Card/Chip/Drawer/Input/Modal/Skeleton/
Toast) under `src/components/ui/`. Only the capitalized versions exist on disk; nothing imports the
lowercase ones except unused shadcn boilerplate (`sidebar`, `toaster`, `calendar`, `carousel`,
`pagination`, `alert-dialog`, `hooks/use-toast`). `tsc --noEmit` passes after removing the
lowercase duplicates from the index; capitalized components are the canonical design system.

## Verified end to end (29 October 2026)

- 99/99 vitest tests (12 new economics tests), `tsc --noEmit` clean, eslint clean, production build passes.
- Live browser journey verified: landing → brief → plan creation → assortment editing → economics
  → quote submission (ref issued, duplicate-submission idempotent) → operator queue (key-gated,
  401 without key) → quote recorded with revision → creator tracked the request and accepted it
  behind the explicit acknowledgement. Sample-plan example view renders with its sample banner.
- Bugs found and fixed during the journey: brief name not flowing into new plans; `formatInr`
  rounding sub-rupee unit costs to ₹0; artwork-readiness warning wrongly disabling quote
  submission; submitted refs not appearing in the creator's tracked list.
