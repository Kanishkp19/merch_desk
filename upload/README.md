# MerchDesk

**Merch your fans actually want.**

MerchDesk is an agent for independent artists and creators. Describe your fans (or search an artist), and a Qloo-powered agent researches what that audience gravitates toward, then turns it into a launch-ready merch collection: 5–8 makeable products with estimated prices, margins and break-even quantities, supplier briefs, local collab ideas and a drop plan.

Built for the **Qloo Agentic Hackathon**.

- **Live demo:** https://merchdesk.vercel.app *(replace with your deployed URL after the first deploy)*
- **License:** MIT (see `LICENSE`)

---

## What makes it different

1. **Real taste data, not genre stereotypes.** The agent calls Qloo (entity search, tags, taste analysis, related brands/games/shows/places) and builds the product list from that audience's affinity. Every product shows *why* it was picked.
2. **Words first, then pictures.** Each product is described in words — what it looks like, materials, colours, mood. You approve or tweak the description. **Only then** does MerchDesk generate a concept image. Nothing is generated behind your back.
3. **Honest numbers.** Prices, margins and break-even are our estimates (labelled as such). Qloo supplies *affinity*, not sales data, and the UI never claims otherwise.
4. **Proof against a generic AI.** A side-by-side panel answers the same question with a plain LLM (no Qloo) and with MerchDesk.
5. **Runs on free tiers.** No paid services, no payment methods.

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

- **Agent:** an LLM chooses which Qloo tools to call. If your artist isn't in Qloo, it notices and switches to genre and interest tags. If free LLM quotas run out, a scripted fallback keeps the app working.
- **Scoring, pricing, drop plan:** deterministic code (no LLM), unit-tested.
- **Not for us:** reject a product and the agent re-queries Qloo with that product's driving entities excluded, then swaps in a replacement.
- **Collab Radar:** local places and brands your fans already like (Qloo place insights filtered by your city).

## Tech stack

Next.js 15 · TypeScript · Tailwind CSS v4 · Zod · Vitest · Vercel Hobby.
LLM (free): Groq → Google AI Studio (Gemini Flash-Lite) → Cloudflare Workers AI.
Images (free): Cloudflare Workers AI, FLUX.1 [schnell].
Taste data: Qloo hackathon API.

## Getting started

**Requirements:** Node.js 20+; free accounts for Qloo (hackathon key), Groq, Google AI Studio and Cloudflare. **Do not add payment methods anywhere.**

```bash
git clone https://github.com/<you>/merchdesk.git
cd merchdesk
npm install
cp .env.example .env.local     # then fill in the keys below
npm run validate:data          # checks the catalog and tag files
npm run probe:qloo             # checks your Qloo key and endpoints
npm run smoke:llm              # checks your LLM providers (and tool calling)
npm run smoke:image            # writes tmp/test.jpg via Cloudflare FLUX
npm run dev                    # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `QLOO_API_KEY` | yes (live mode) | Qloo hackathon key (sent as `X-Api-Key`) |
| `QLOO_BASE_URL` | no | Default `https://hackathon.api.qloo.com` |
| `LLM_PROVIDERS` | no | Priority order, default `groq,gemini,cloudflare` |
| `GROQ_API_KEY`, `GROQ_MODEL` | one provider needed* | Groq free tier |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | optional | Google AI Studio free tier (`gemini-2.5-flash-lite`) |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | for images | Cloudflare Workers AI (free plan) |
| `CF_LLM_MODEL`, `CF_IMAGE_MODEL` | no | Model ids from the Workers AI catalog |
| `NEXT_PUBLIC_MAX_IMAGES_PER_SESSION` | no | Default 12 (protects the free image quota) |
| `MERCHDESK_DATA_MODE` | no | `live` (default) or `fixtures` (synthetic sample data, dev only) |

\*Without any LLM key the app still runs in scripted/template mode.

Free-tier limits change; check each provider's dashboard.

### Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | Vitest unit tests (scoring, pricing, drops, image prompt, moderation, agent loop) |
| `npm run validate:data` | Validates `data/*.json` |
| `npm run probe:qloo` | Calls each Qloo endpoint once and prints results |
| `npm run smoke:llm` / `smoke:image` | Provider smoke tests |

## Deploying (free)

1. Push to GitHub (public repo, MIT license visible in About).
2. Import the repo in Vercel (Hobby plan).
3. Add the environment variables from `.env.example` for Production and Preview.
4. Open `/api/status` on the deployed URL: you should see `qloo: true`, at least one LLM provider, `image: true`, `dataMode: "live"`.

Vercel Hobby is for non-commercial use, which fits a hackathon demo. If MerchDesk becomes a business, move to a paid Vercel plan or another host.

## Project structure

```
app/          routes (/, /studio, /line-sheet, /about) and /api route handlers
components/   ui, layout, landing, studio, mockups, print
lib/          qloo adapter · llm provider chain · agent loop · scoring · image pipeline · state
data/         catalog and tag vocabularies (estimates are labelled)
scripts/      probes, smoke tests, data validation
tests/        Vitest
docs/         product and technical planning documents
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
- **AI concept images.** Generated from the description you approved; they are not final designs and can contain artefacts. Image prompts never include artist names, brand names or logos.
- **Fixtures.** `data/fixtures/` contains synthetic sample data for local development only; it is never used in production.

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
