# MerchDesk

**Merch your fans actually want.**

MerchDesk is an agent for independent artists and creators. Describe your fans (or search an artist), and a Qloo-powered agent researches what that audience gravitates toward, then turns it into a launch-ready merch collection: 5–8 makeable products with estimated prices, margins and break-even quantities, supplier briefs, local collab ideas and a drop plan.

Built for the **Qloo Agentic Hackathon**.

- **Live demo:** *add your deployed URL after the first Vercel deploy*
- **License:** MIT (see `LICENSE`)

---

## What makes it different

1. **Real taste data, not genre stereotypes.** The agent calls Qloo (entity search, tags, taste analysis, related brands/games/shows/places) and builds the product list from that audience's affinity. Every product shows *why* it was picked.
2. **Words first, then pictures.** Each product is described in words — what it looks like, materials, colours, mood. You approve or tweak the description. **Only then** does MerchDesk generate a concept image. Nothing is generated behind your back. `/api/image` rejects any request without `approved: true`.
3. **Honest numbers.** Prices, margins and break-even are our estimates (labelled as such). Qloo supplies *affinity*, not sales data, and the UI never claims otherwise.
4. **Proof against a generic AI.** A side-by-side panel answers the same question with a plain LLM (no Qloo) and with MerchDesk.
5. **Runs on free tiers.** No paid services, no payment methods. Graceful degradation everywhere: scripted agent steps, template descriptions, SVG concept sketches.

## How it works

```
Your fans ─► Agent (LLM + Qloo tools) ─► Taste profile (tags, brands, games/shows, places)
                                              │
            catalog of 20 real merch items ──►┤ scoring: 0.5 taste tags + 0.3 brand affinity + 0.2 cross-domain
                                              ▼
              5–8 products · evidence chips · price · margin · break-even · drop plan
                                              │
            read description ─► approve / edit ─► AI concept image ─► line sheet (print to PDF)
```

- **Agent:** an LLM chooses which Qloo tools to call (JSON-action loop — provider-agnostic, works with every free provider). If your artist isn't in Qloo, it notices and switches to genre and interest tags. If free LLM quotas run out, a scripted fallback keeps the app working.
- **Scoring, pricing, drop plan:** deterministic code (no LLM), unit-tested.
- **Not for us:** reject a product and the agent re-queries Qloo with that product's driving entities excluded, then swaps in a replacement.
- **Collab Radar:** local places and brands your fans already like (Qloo place insights filtered by your city).

## Tech stack

Next.js 16 (App Router; also builds on 15) · TypeScript strict · Tailwind CSS v4 (`@theme` zine design system) · Zod 4 · Vitest · Vercel Hobby.

- **Taste data:** Qloo hackathon API (`X-Api-Key`, isolated behind `src/lib/qloo/client.ts`)
- **LLM (free chain):** `zai` (auto-detected when the SDK is installed) → Groq `llama-3.3-70b-versatile` → Google AI Studio `gemini-2.5-flash-lite` → Cloudflare Workers AI; scripted fallback
- **Images (free):** z-ai (when present) → Cloudflare Workers AI FLUX.1 [schnell]; approval-gated, session-capped, moderation-stripped

## Getting started

**Requirements:** Node.js 20+; free accounts for Qloo (hackathon key), Groq, Google AI Studio and Cloudflare. **Do not add payment methods anywhere.**

```bash
git clone <your-fork-url> merchdesk
cd merchdesk
npm install
cp .env.example .env.local     # then fill in the keys below
npm run validate:data          # checks the catalog and tag files
npm run probe:qloo             # checks your Qloo key and endpoints
npm run smoke:llm              # checks your LLM providers
npm run smoke:image            # checks the image chain
npm test                       # scoring / pricing / drops / moderation / fixtures
npm run dev                    # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `QLOO_API_KEY` | yes (live mode) | Qloo hackathon key (sent as `X-Api-Key`) |
| `QLOO_BASE_URL` | no | Default `https://hackathon.api.qloo.com` |
| `LLM_PROVIDERS` | no | Priority order, default `zai,groq,gemini,cloudflare` |
| `GROQ_API_KEY`, `GROQ_MODEL` | one provider needed* | Groq free tier |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | optional | Google AI Studio free tier |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | for CF images | Cloudflare Workers AI (free plan) |
| `CF_LLM_MODEL`, `CF_IMAGE_MODEL` | no | Model ids from the Workers AI catalog |
| `NEXT_PUBLIC_MAX_IMAGES_PER_SESSION` | no | Default 12 (protects the free image quota) |
| `MERCHDESK_DATA_MODE` | no | `auto` (default: live with a Qloo key, else fixtures) · `live` · `fixtures` |

\*Without any LLM key the app still runs in scripted/template mode. Without a Qloo key it runs on **clearly-labelled sample data** (every surface says "SAMPLE DATA — not Qloo output"); the hackathon demo should run live.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit tests (scoring, pricing, drops, image prompt, moderation, Qloo normalization, fixtures) |
| `npm run validate:data` | Validates `src/data/*.json` |
| `npm run probe:qloo` | Calls each Qloo endpoint once and prints results |
| `npm run smoke:llm` / `smoke:image` | Provider smoke tests |

## Deploying (free)

1. Push to GitHub (public repo, MIT license visible in About).
2. Import the repo in Vercel (Hobby plan).
3. Add the environment variables from `.env.example` for Production and Preview.
4. Open `/api/status` on the deployed URL: you should see `qloo: true`, at least one LLM provider, `image: true`.

Vercel Hobby is for non-commercial use, which fits a hackathon demo. If MerchDesk becomes a business, move to a paid Vercel plan or another host.

## Project structure

```
src/
├── app/            routes: /, /studio, /line-sheet, /about, 404, error + 9 API handlers
│   └── api/        status · search · agent/profile (SSE) · collection · describe · replace · image · collabs · compare
├── components/     ui, layout, landing, studio, mockups (13 SVG silhouettes), print, views
├── lib/
│   ├── qloo/       the ONLY module that knows Qloo URL parameters (+ fixtures engine)
│   ├── llm/        provider chain + prompts (JSON-action agent, describe, tweak, classify, compare)
│   ├── agent/      tools, memory, loop, scripted fallback
│   ├── score/      tag-map · score · rules · pricing · drops · classify · describe (deterministic)
│   ├── image/      moderation (artist/brand/trademark stripping) · prompt builder · provider chain
│   ├── http/       error codes, SSE, rate limits
│   ├── state/      useReducer studio state machine + sessionStorage mirror
│   └── schemas/    Zod (input, profile, product, api)
├── data/           catalog.json (20 items) · canonical-tags · tag-aliases · brand-tiers · palettes
├── types/          shared TypeScript types
scripts/            probe-qloo · smoke-llm · smoke-image · validate-data
tests/              Vitest
docs/               the full planning documents (PRD, TRD, app flow, UI brief, API contract, plan)
```

## Documentation

| File | Contents |
|---|---|
| `docs/00-MASTER-PROMPT.md` | Start here (for AI coding agents) |
| `docs/01-PRD.md` | Product requirements |
| `docs/02-TRD.md` | Technical requirements |
| `docs/03-APP-FLOW.md` | Screens and flows |
| `docs/04-UI-UX-BRIEF.md` | Design system |
| `docs/05-BACKEND-SCHEMA.md` | API contract and data files |
| `docs/06-IMPLEMENTATION-PLAN.md` | Build plan and checklists |

## Honesty notes

- **Affinity, not purchases.** Qloo tells us what an audience gravitates toward. We never claim what fans "buy".
- **Estimates.** Unit costs, prices, margins and break-even figures are our estimates; get real supplier quotes before ordering.
- **AI concept images.** Generated from the description you approved; they are not final designs and can contain artefacts. Image prompts never include artist names, brand names or logos (moderation layer, unit-tested).
- **Sample data.** With no Qloo key configured, the app runs on hand-written synthetic data labelled "SAMPLE DATA — not Qloo output" on every surface. Never present fixtures mode as live Qloo data.

## Limitations

- Free-tier quotas (LLM, images, Qloo) can run out; the app degrades to template descriptions and concept sketches rather than failing.
- Generated images exist in your browser tab only; download the ones you want to keep.
- English and USD only in v1.
- Compliance for consumables (hot sauce, coffee, beer) varies by place; check local rules.

## Roadmap

Fan Crate bundles · shareable collections · INR/multi-currency · creator-type catalogs · supplier quote requests.

## License

MIT © 2026 Kanishk. See `LICENSE`.

*Audience insights powered by Qloo.*
