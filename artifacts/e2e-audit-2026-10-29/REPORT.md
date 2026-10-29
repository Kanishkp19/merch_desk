# MerchDesk end-to-end test and gap analysis

**Run:** 29 October 2026, local development server at `http://localhost:3000`.
**Verdict:** The main workflow works in the tested browser paths, but the printable export and TypeScript release check fail. Live recommendations need quality work before relying on them for a launch.

## What was tested

| Area | Result | Evidence |
| --- | --- | --- |
| Landing validation and keyboard skip link | Pass | Desktop/mobile Playwright journey |
| Profile → collection → approval → concept image | Pass with saved API fixtures | Desktop/mobile Playwright journey |
| Partner error and retry, rejection and undo/replacement | Pass with saved API fixtures | Desktop/mobile Playwright journey |
| Image download, refresh recovery, stale-image export guard | Pass with saved API fixtures | Desktop/mobile Playwright journey; 502,358-byte download on each viewport |
| Line sheet navigation and A4 PDF generation | Partial | PDF generated on both viewports, but each has 2 pages |
| Live status, artist search, profile, collection, partners, comparison, image | Pass at HTTP/API level | Live Qloo mode; Tycho search returned 4 results; profile used 6 Qloo calls; comparison returned 6 items via Groq; approved image returned via Cloudflare Flux |
| Image approval guard | Pass | Unapproved request returned HTTP 422 |
| Selected unit tests | Pass | 7 files, 46 tests |
| TypeScript check | Fail | `tsc --noEmit`: 50 diagnostics |

The browser journey ran at 1440×900 and 390×844 in headless Chrome. It stubs profile, collection, partner, image, and replacement endpoints; its UI pass does not establish that those external calls succeed together in a live browser session. A separate fresh live API sequence used the b01 ambient-electronic brief. The development server was already running. No production build, other browsers, accessibility audit, or real print-dialog test was run.

## Gaps, ordered by priority

1. **High — Export breaks the one-page promise.** Both A4 PDFs contain **2 pages**. The second page contains product cards, so this is substantive overflow rather than a blank extra page. The print layout needs to fit or explicitly support a multi-page line sheet. Evidence: `browser/desktop-line-sheet.pdf`, `browser/mobile-line-sheet.pdf`; `pdfinfo` and page-two text extraction.
2. **High — Release type check fails.** TypeScript reports **50 diagnostics**. Main clusters: case-colliding UI files/imports (`Button`/`button`, `Input`/`input`, `Card`/`card`, `Toast`/`toast`), missing exports/types, and missing `socket.io` example dependencies and Prisma client generation. This blocks a clean type-checked release. A production build was not attempted after this failed gate.
3. **Medium — Live taste and recommendation relevance is weak for the tested brief.** The Tycho-inspired ambient-electronic input produced top tags including **Pickled Vegetables**, **Three Star**, and **Identifies as women-owned**. The 7 products scored **20–33/100** for fit. This is a quality assessment of one live run, not a measured overall failure rate. Evidence: `live/b01.json`.
4. **Medium — “Local collabs” lacks local venue results in this run.** The San Francisco request returned Apple, DJI, GoPro, Polaroid, Tesla, and The North Face, with no local venue. These are plausible brand candidates in some contexts but do not fulfill the local-partner emphasis for this brief. Evidence: `live/b01.json`.
5. **Medium — End-to-end automation has an integration blind spot.** The browser journey verifies UI state transitions with saved responses; the live API sequence verifies provider calls without the browser. Add a small live browser smoke test in a controlled environment, or explicitly treat those as separate gates.

## Recommended next steps

Fix the print overflow and TypeScript diagnostics first. Then tune profile relevance and partner ranking against the existing 12-brief benchmark, using explicit acceptance criteria for fit evidence and local partner suitability. Re-run a live browser smoke test after those changes.

## Artifacts

- `browser/results.json`: desktop/mobile browser results, with no page errors.
- `browser/*-line-sheet.pdf` and `browser/*-line-sheet.png`: export evidence.
- `browser/*-merchdesk-hero-crewneck.jpg`: fixture-backed download evidence.
- `live/b01.json`: fresh live status, profile, collection, and partners.
- `live/endpoints.json`: live comparison and approved-image result summaries. The image payload was not retained.

No application source files were edited for this audit. The repository already had uncommitted source changes before testing.
