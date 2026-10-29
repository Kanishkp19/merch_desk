# Pilot assumptions and unresolved items (29 October 2026)

Reversible choices made where the repository could not answer a business question. Each is labeled
with what would change the decision.

## Segment: independent musicians

Chosen over illustrators. The existing product is music-anchored end to end: artist autocomplete
(Qloo artist search), cassette-USB product, "December gig season" and Chennai music-season notes,
live-music venues (The Piano Man, Lamakaan) in the curated list, hero copy aimed at fans. A release
or gig gives musicians a concrete launch date. Changing segments later means re-weighting the tag
map and venue list, not rebuilding the flow. Audience size is recorded as evidence, never scored
as demand.

## Commercial model (experiment, not research)

- **MerchDesk planning fee (pilot): ₹2,500, flat, one launch.** Assumption to test: a creator with
  ₹15k–75k of inventory at risk will pay a small fixed fee for supplier coordination and honest
  math. It is shown in the economics workspace as an upfront cost, distinct from supplier payments.
- Supplier money flows creator → supplier directly. MerchDesk never touches inventory cash in this
  pilot, so there is no platform revenue to model yet.
- The ₹2,500 figure is an experiment with explicit assumptions (see `src/lib/economics/engine.ts`
  `PILOT_FEE_Paise`), not a researched market price. First pilot conversations may reprice it.

## Money representation

All money is integer paise in code (`src/lib/economics/*`); the UI formats via `formatPaise`. Rupee
inputs are converted at the boundary. Rounding happens only at display and scenario boundaries,
never inside running sums.

## Tax

GST rates updated 29 Oct 2026 from Notifications 9/2025 & 13/2025-Central Tax (Rate), effective
22 Sep 2025: apparel ≤₹2,500/piece → 5%, above → 18%; printed books (zines) remain exempt; other
goods 18%. Unresolved: HSN-specific classification per product and whether a creator crosses the
registration threshold (states vary on intra-state supply of goods). The workspace treats GST as a
**configurable, tax-inclusive-or-exclusive** input per launch with the rate pre-filled as
"indicative — confirm with a CA"; it never silently nets tax out of margin.

## Persistence and access

- Drafts (brief + launch, pre-submission): device-only sessionStorage, labelled "Stored on this
  device".
- Submitted quote requests: SQLite via Prisma (`db/custom.db`), because the request must survive
  the browser. DATABASE_URL fixed to a repo-relative path. This is pilot-grade storage; there is no
  backup/retention story yet.
- Access: creator retrieves status by unguessable reference (UUID-based, shown once + stored on
  device). Operator queue is gated by a shared `OPERATOR_KEY` (set in `.env.local`); this is a
  shared secret, not authentication. Acceptable for one operator in a pilot; replace before any
  second operator or public launch.

## Fulfilment, suppliers, payments

- No supplier integration and no verified lead times exist (docs/INDIA_PILOT.md: no venue or
  supplier contacted). Every lead time in the UI is shown as "requires supplier confirmation".
- Sample approval and production authorization are separate, explicit creator actions. Accepting a
  quote authorizes MerchDesk to request a sample only.
- No email is sent. "Submit" stores the request for the operator and gives the creator a reference;
  the UI says the founder picks it up manually. This is labelled everywhere the flow touches it.

## Demand numbers

Expected sales are the creator's own guess (with a suggested range anchored to run size, labelled
as untested). Scenarios are mechanical: conservative = 60% of expected, optimistic = 130%. They
bound the guess; they do not predict it.

## Unresolved items carried forward

1. Pilot price ₹2,500 — validate in the first 3 creator conversations.
2. GST classification/registration — confirm with a CA before the first invoice.
3. Supplier quotes — none obtained; all unit costs remain MerchDesk estimates until a written
   quote is recorded in the operator queue.
4. Qloo availability — live data unverified in this deployment; fixtures mode is labelled.
