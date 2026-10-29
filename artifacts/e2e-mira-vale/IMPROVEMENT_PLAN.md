# MerchDesk improvement plan

Prepared 29 October 2026 from the live Mira Vale run and targeted source inspection.

Goal: produce useful, explainable merchandise concepts and credible collaboration candidates, with dependable generation, editing, and export. A successful request alone does not establish recommendation quality. This plan is proposed work; implementation has not started.

## Evidence and limits

Observed in the live run:
- Ambient electronic research returned software brands and horror books whose relevance was not explained.
- “Photography studio” became hiphop; the featured crewneck scored 0 with no evidence.
- Six local partner candidates had no product links, and several were poor business fits.
- The generic comparison failed after a Groq 429. The approved image succeeded but included tiny neck-label lettering.
- The unapproved image request correctly returned 422.

Source inspection also identified:
- Tag mapping uses unrestricted substring matching; “rap” matches inside “Photography.”
- Selection forces a hero without a minimum evidence requirement.
- Entity normalization can assign rank-derived weights, including a weight of 1 for a single result; these must not be presented as calibrated confidence. Zero numeric affinity also currently falls through to rank weighting.
- The comparison prompt asks for stereotyped advice, weakening its value as an evaluation baseline.
- Image results live in memory, and session image limits have client-side guards. Refresh recovery and server enforcement require verification.
- Replacement selection takes the first remaining scored candidate without applying its budget argument. The comparison cache key omits the requested count.

The browser UI, exports, refresh recovery, concurrency, and deployment behavior have not yet been exercised. Unexpected Qloo results are not automatically wrong; the missing relevance explanation and seed selection must be investigated before excluding them.

## 1. Establish a repeatable quality benchmark — P0

Work:
- Preserve the existing run as the before example, including inputs, outputs, provider names, and failures.
- Create 12 representative briefs covering known musicians, unknown creators with reference artists, non-music creators, different cities and budgets, sparse inputs, and conflicting interests.
- Label expected genre interpretation, plausible product categories, unsuitable partner categories, and acceptable insufficient-data outcomes. Reserve four briefs for evaluation after tuning.
- Score relevance, evidence, originality, budget fit, partner usefulness, and visual fidelity separately on a written 1–5 rubric.
- Record elapsed time, provider calls, fallbacks, and estimated generation cost without storing credentials.

Acceptance:
- Each subsequent change can be compared with saved input/output evidence.
- Reviewers judge the concepts without being told which version produced them. More products or higher internal fit scores do not count as improvement by themselves.

## 2. Repair genre mapping and audience research — P0

Primary areas: `src/lib/score/tag-map.ts`, `src/data/tag-aliases.json`, `src/lib/qloo/normalize.ts`, `src/lib/agent/tools.ts`, `src/lib/agent/memory.ts`, agent prompts and scripted research.

Work:
- Replace unrestricted substring matching with normalized word/phrase matching; preserve intentional plurals and aliases.
- Cover known false positives such as photography/rap and words containing short aliases such as tea or ale. Deduplicate genre variants without discarding useful distinctions.
- Separate the creator name, explicit genre, lifestyle interests, reference artists, location, and budget in the input model and research instructions.
- Resolve reference artists into validated entity seeds when appropriate; preserve the distinction between the creator and their reference artists. Investigate why the Mira Vale run retained zero entity seeds despite two named references.
- Keep user-provided interests, Qloo search matches, Qloo affinities, rank-derived weights, and model estimates distinguishable throughout the profile and UI.
- Preserve valid zero affinity; handle absent or unsupported fields explicitly. Verify external response semantics against version-appropriate documentation before changing interpretation.
- Select relevant seed tags rather than relying on the first entries. Return a partial-profile notice or a focused clarification when evidence is thin.

Acceptance:
- Photography never produces hiphop; valid rap and hip-hop inputs still do.
- Missing and zero scores remain distinguishable. Rank-derived weights are labeled as such.
- Reference artist success, ambiguity, and no-match paths have focused tests.
- The revised Mira Vale profile explains its affinities and does not invent a known artist identity.

## 3. Make collection selection evidence-driven — P0

Primary areas: `src/lib/score/score.ts`, `rules.ts`, `collection.ts`, `pricing.ts`, `describe.ts`, and catalog data.

Work:
- Require useful supporting evidence before promoting a hero or presenting an item as a personalized match. Permit fewer recommendations or clearly labeled exploratory concepts when evidence is insufficient.
- Calibrate selection thresholds against the benchmark; do not simply inflate fit scores.
- Apply budget, minimum-run, duplication, and category constraints consistently to initial selection and replacements. Preserve the intended replacement role or explicitly explain a changed role.
- Verify catalog coverage for the target niches, including ambient music and non-musician creators; add catalog items only where evaluation demonstrates a gap.
- Generate descriptions from approved profile signals and actual product materials. Validate length, schema, palette consistency, and unsupported genre references.
- Explain each product with specific evidence and distinguish creative interpretation from observed affinity.
- Display currency and assumptions explicitly. Treat costs, retail prices, margins, and break-even calculations as estimates; validate totals and avoid claiming sales demand from affinity alone.

Acceptance:
- No zero-evidence item is promoted as a proven audience fit.
- Every recommended item has a traceable rationale or an explicit exploratory label.
- Initial collections and replacements satisfy the same applicable budget constraints.
- The ambient brief no longer acquires unsupported hiphop copy from the mapping bug.

## 4. Make partner discovery actionable — P1

Primary areas: `src/app/api/collabs/route.ts`, Qloo normalization/client, partner types, and `CollabRadar.tsx`.

Work:
- Preserve available location, category, and source identifiers; distinguish locality from venue type.
- Evaluate category suitability, audience relevance, location confidence, and a feasible collaboration format. Amenities such as air conditioning must not become audience interests.
- Rank the complete candidate pool before taking results so place results do not automatically crowd out brands.
- Match collaboration ideas to products actually in the collection. A general partnership can remain unlinked if its relevance is explained.
- Return fewer or no candidates when the evidence is weak. Show names and source links when supplied; never invent contact details or claim willingness to collaborate.
- Describe this feature as partner discovery. Individual fan identification would require a separate product scope and authorized data source.

Acceptance:
- Every displayed candidate has an understandable location and collaboration rationale.
- Unrelated accommodation or training businesses are not recommended solely because they are nearby.
- Sparse-city results fail honestly instead of filling the list with weak candidates.

## 5. Recover from provider failures and make comparisons fair — P1

Primary areas: `src/lib/llm/providers.ts`, HTTP/SSE helpers, agent loop, image provider, status and comparison routes.

Work:
- Preserve structured provider failure types, honor retry timing, and use bounded retries within a total request deadline.
- Test the already-supported fallback chain with the configured providers. Availability should distinguish configured credentials from demonstrated request success.
- Reduce repeated calls with bounded caches whose keys include every result-affecting input; fix comparison count handling and evict expired entries.
- Give optional features independent error/retry states so comparison failure cannot discard a successful collection.
- Handle malformed model output, stream interruption, timeouts, and exhausted quotas explicitly. Enforce generation limits on the server and prevent duplicate generation on repeated submissions.
- Replace the intentionally weak comparison prompt with a competent generic baseline using equivalent creator input and product constraints. Explain which information each side receives.

Acceptance:
- Simulated 429, timeout, malformed output, and unavailable-provider cases terminate predictably without losing completed work.
- A successful fallback identifies its provider; total failure gives an actionable message.
- Comparison quality is assessed fairly, and requested output count is respected across cached requests.

## 6. Improve image fidelity and preserve approved work — P1

Primary areas: `src/lib/image/*`, studio state/reducer, image stage, product cards, and export components.

Work:
- Align the image prompt with the approved product, material, palette, and motif; explicitly suppress neck labels and incidental lettering.
- Keep description versions linked to their image requests. Discard late results that belong to an obsolete description or run.
- Evaluate a small visual review set for product identity, palette, material, unwanted text, and composition. Add automated text detection only if its measured benefit justifies the cost; prompting alone cannot guarantee zero lettering.
- Retain a usable sketch and approved description on image failure, with a bounded regeneration option.
- Implement appropriate image persistence and recovery for refresh/export, including storage limits and cleanup.

Acceptance:
- The image shown and exported belongs to the current approved description.
- Refresh behavior is predictable and does not silently lose approved images.
- The crewneck example and other sampled product types pass visual review; failures remain visibly recoverable.

## 7. Verify the actual browser journey — P1

Work:
- Exercise landing input → artist/reference selection → profile edits → collection → description edit → approval → image → keep/reject/replace → partner discovery → export.
- Check mobile and desktop layouts, keyboard operation, form errors, loading states, empty results, and recovery after refresh or navigation.
- Test stale responses and double clicks, failed regeneration, replacement undo, and export with missing or outdated images.
- Inspect downloaded images and the printed line sheet for complete descriptions, correct pricing assumptions, current images, and usable pagination.

Acceptance:
- Each main journey completes in a real browser; expected failure states preserve the user's completed work.
- Downloads open correctly, the line sheet is readable, and no obsolete image is exported as current.

## 8. Release gate and ongoing improvement — P2

Run focused checks after each implementation slice, then a bounded live replay after the relevant phases. Run the full suite only if explicitly requested. Keep application changes small and preserve existing uncommitted work.

Proposed release targets:
- All confirmed regressions above have targeted passing checks; no known critical journey failure remains.
- At least 10 of the 12 benchmark briefs average 4/5 or better for recommendation relevance and evidence. These are proposed targets, not current measured performance.
- Every promoted product has evidence; every displayed partner has a plausible rationale; insufficient evidence is clearly reported.
- All controlled provider-failure scenarios preserve completed work and end within the configured deadline.
- Browser approval, replacement, persistence, and export journeys pass on desktop and mobile.
- Report latency and provider cost distributions from repeated representative runs, then set budgets from those measurements rather than promising unmeasured timings.

After this gate, collect optional product keep/reject reasons and image approval feedback. Use later user evidence to improve ranking and catalog coverage. Sales conversion needs real launch data; it cannot be established by this test.

Suggested order: benchmark → mapping and research → product selection → partner discovery → reliability and fair comparison → images/persistence → browser/export verification → release evaluation. Start with the photography mapping regression because it directly contaminates every downstream recommendation.
