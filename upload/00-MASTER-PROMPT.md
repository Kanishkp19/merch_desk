# MerchDesk — Master Agent Prompt

> Read this file first. Then load each document listed below before writing any code. Do not ask the user questions that these documents already answer.

## What We're Building

MerchDesk is a web app for the **Qloo Agentic Hackathon** (deadline Sat 31 Oct 2026, 9:15 AM IST). An independent artist or creator describes their fans; an LLM **agent** calls Qloo tools to learn what that audience gravitates toward; deterministic code turns that taste into a scored collection of 5–8 makeable merch products with estimated prices, margins, break-even quantities, a drop plan and local collab partners.

**Signature flow:** every product is first shown as a **written description** of what it would look like. Only after the user **approves** (or edits) the description does the app **generate an image** from it. No image is ever generated before approval.

**Hard constraints:** (1) the whole stack must be **free** — no paid services, no payment methods; (2) the demo must be hosted publicly with an MIT-licensed public repo; (3) Qloo provides *affinity*, not purchase data — never claim sales or buying behaviour.

## Tech Stack (Non-Negotiable)

- **Framework:** Next.js 15 (App Router), TypeScript `strict`
- **Styling:** Tailwind CSS v4 with `@theme` tokens (see `04-UI-UX-BRIEF.md`); no shadcn
- **Validation:** Zod 3 for every API input and every LLM JSON output
- **State:** React `useReducer` in `StudioProvider`; text-only mirror in `sessionStorage`; images in memory only
- **Database / Auth:** **none** (v1)
- **Taste data:** Qloo hackathon API (`https://hackathon.api.qloo.com`, GET, `X-Api-Key`)
- **LLM (free chain):** Groq `llama-3.3-70b-versatile` → Gemini `gemini-2.5-flash-lite` → Cloudflare Workers AI; plain `fetch`, OpenAI-compatible; scripted/template fallbacks
- **Images (free):** Cloudflare Workers AI FLUX.1 [schnell]
- **Tests:** Vitest
- **Hosting:** Vercel Hobby (+ GitHub public repo, MIT)

## Folder Structure (scaffold this first)

The complete, authoritative tree is in `02-TRD.md → Folder Structure`. Top level:

```
merchdesk/
├── app/            # routes: /, /studio, /line-sheet, /about, /api/*
├── components/     # layout, landing, studio, mockups, print, ui
├── lib/            # env, qloo, llm, agent, score, image, http, state, schemas
├── data/           # catalog.json, canonical-tags.json, tag-aliases.json, brand-tiers.json, palettes.json, fixtures/
├── scripts/        # probe-qloo.ts, smoke-llm.ts, smoke-image.ts, validate-data.ts
├── tests/          # vitest files
├── docs/           # these planning documents + qloo-notes.md + test-log.md
├── types/ LICENSE README.md .env.example next.config.ts vitest.config.ts
```

## Documents to Load (in order)

1. **`01-PRD.md`** — what to build and for whom; features F1–F8 with acceptance criteria; copy and claims rules
2. **`02-TRD.md`** — stack, free-tier contract, architecture, folder tree, env vars, integrations, TypeScript types, agent design, scoring/pricing formulas, image pipeline, security
3. **`03-APP-FLOW.md`** — every route and screen, ProductCard state table, modals, toasts, error states
4. **`04-UI-UX-BRIEF.md`** — tokens, CSS block for `globals.css`, exact Tailwind class strings, accessibility rules
5. **`05-BACKEND-SCHEMA.md`** — Zod schemas, API contract, SSE protocol, state machines, full `catalog.json` and other data files
6. **`06-IMPLEMENTATION-PLAN.md`** — phases 0–11 with commands, verification steps, test matrix, deployment and submission checklists, prompt sequence
7. **`README.md`** — the repo README (copy to the repo root)

## Agent Operating Rules

1. **Free-only.** Never add a paid service, SDK that requires billing, or a payment method. If a free quota is exhausted, degrade gracefully (see fallbacks in `02-TRD.md`). Do not use Gemini/Imagen image models (no free API tier).
2. **Approval gate.** `/api/image` must reject unless `approved === true` and `approvedDescription` is non-empty. The client may only dispatch `IMAGE_REQUESTED` from an approved card. No other code path may call the image API. This is tested.
3. **The LLM never produces data.** Tool results come from Qloo; the `TasteProfile` is assembled by code from `AgentMemory`; scores/prices/margins are computed by code. The LLM only (a) chooses tool calls, (b) classifies unmapped names into fixed vocabularies (flagged `estimated`), (c) writes names/descriptions from supplied facts.
4. **Qloo is isolated.** Only `lib/qloo/client.ts` may know Qloo URL parameters. The parameter names in `02-TRD.md` are unverified until Phase 2's probe; follow `docs/qloo-notes.md` once it exists. Use `urn:entity:videogame` (not `video_game`).
5. **Check schemas before writing handlers.** Every route validates input with the Zod schema in `05-BACKEND-SCHEMA.md` and returns the documented error format.
6. **Check the UI brief before writing any className.** Use the class strings in `04-UI-UX-BRIEF.md`. Tomato and amber are background colours only, never text on paper.
7. **Every screen handles loading, empty and error states** exactly as in `03-APP-FLOW.md`.
8. **No `any`.** Types live in `types/index.ts`; Zod schemas in `lib/schemas/`.
9. **Secrets stay on the server.** No `NEXT_PUBLIC_` prefix on keys. Never log keys or full user prompts in production.
10. **Copy rules:** say "affinity", "estimate", "AI concept image". Never "buys", "sells", "predicts", "guarantees". Do not use unsourced statistics.
11. **No brand or artist names in image prompts.** Strip the artist name, Qloo-returned brand names and a static trademark list before building the prompt; reject unsafe terms.
12. **Mind the Vercel Hobby limits.** `maxDuration = 60` on long routes; agent hard cap 45 s; SSE headers as specified.
13. **Run `npm run build` and `npm test` mentally (and for real) before finishing any phase.** Never move on with failing tests.
14. **Fixtures are dev-only and synthetic**, labelled "SAMPLE DATA — not Qloo output", and refused in production. The submitted demo uses live Qloo.
15. **Ask the user only for secrets or credentials** — and do so by telling them which `.env.local` lines to fill.

## Build Command Sequence

```
Phase 0  accounts & keys (Qloo, Groq, AI Studio, Cloudflare, GitHub, Vercel — no cards)
Phase 1  scaffold → LICENSE (MIT) → first Vercel deploy
Phase 2  probes: probe-qloo, smoke-llm, smoke-image   ← GATE: do not proceed if red
Phase 3  data files + schemas + validate:data
Phase 4  scoring / rules / pricing / drops (TDD)
Phase 5  qloo client, llm chain, agent loop, SSE route
Phase 6  collection, describe, replace, image, collabs, compare APIs
Phase 7  UI foundations, landing, studio shell, taste profile
Phase 8  collection UI + approval gate + image flow
Phase 9  collab radar, drop timeline, compare panel
Phase 10 line sheet / export
Phase 11 polish, test matrix, README, deploy checks, Devpost submit
```
Target submit: **Fri 30 Oct 2026, 18:00 IST.** Feature freeze: Fri noon.

## Definition of Done

- [ ] All routes in `03-APP-FLOW.md` exist and are navigable (`/`, `/studio`, `/line-sheet`, `/about`, 404)
- [ ] All endpoints in `05-BACKEND-SCHEMA.md` return documented shapes; invalid input returns `VALIDATION`
- [ ] Agent streams steps to the thinking panel; handles artist-not-found by switching to tags; scripted fallback works with LLM keys removed
- [ ] Collection has 5–8 products, ≥3 categories, 1 hero, ≥1 low-risk item; each product shows evidence chips and a Numbers drawer marked "Estimate"
- [ ] **Zero image requests before Approve** (verified in Network tab and by test); Approve → exactly one image request; Regenerate max 2; session cap 12; quota/cap states keep description + sketch
- [ ] Tweak chips + Edit + Undo work; editing after an image marks it "Outdated"
- [ ] "Not for us" replaces via Qloo exclusion with Undo
- [ ] Collab Radar shows real Qloo places with a city; compare panel shows generic vs MerchDesk
- [ ] `/line-sheet` prints one clean A4 page
- [ ] Mobile layout works at 375 px; Lighthouse mobile accessibility ≥ 90
- [ ] `npm run build` has zero type errors; `npm test` is green
- [ ] No secrets in git; `.env.example` present; no payment method on any account
- [ ] Deployed on Vercel; `/api/status` shows `qloo: true`, ≥1 LLM provider, `image: true`, `dataMode: "live"`
- [ ] Public GitHub repo with **MIT license visible in About**, README with live URL, Devpost submission saved and confirmed as submitted
