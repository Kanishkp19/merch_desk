# MerchDesk — Product Requirements Document

> Version: v1 (hackathon MVP) | Target: Qloo Agentic Hackathon | Deadline: **Sat 31 Oct 2026, 9:15 AM IST** | Doc date: Wed 28 Oct 2026

## Assumptions (read first)

- **Free-only.** Every service used must have a genuinely free tier with no payment method attached. No card is ever added to any account. If a free quota runs out, the app degrades gracefully; it never bills. (See `02-TRD.md → Free-tier compliance`.)
- **Web app, mobile-friendly.** No native app. Creators will often use a phone.
- **No accounts, no database in v1.** Judges must be able to try it end-to-end without signing up. State lives in the browser tab.
- **Qloo returns affinity, not sales.** Qloo tells us what an audience gravitates toward. It does not return purchase data or prices. All copy says "this audience shows strong affinity for…", never "your fans buy…". Prices and costs are MerchDesk's own estimates and are labelled as such.
- **Qloo key is issued manually** via the hackathon developer guide. Day-1 task is to confirm it works (see `06-IMPLEMENTATION-PLAN.md → Phase 2 gate`).
- **Currency is USD** in v1 (matches the hackathon's audience). INR toggle is v2.
- **The product is an agent**, not a fixed pipeline: an LLM drives Qloo tool calls and decides what to query next. Deterministic code handles scoring, pricing and drop planning so numbers are never LLM-invented.
- **Images are AI concept images**, generated only after the user has read and approved a written description of the product.

---

## App Overview

| Field | Value |
|---|---|
| **Name** | MerchDesk |
| **Tagline** | Merch your fans actually want. |
| **Category** | Agentic creator tool (Qloo-powered) |
| **Platform** | Web (mobile-responsive), hosted on Vercel Hobby |
| **License** | MIT (visible in the GitHub About section — hackathon requirement) |

**Elevator pitch**
An independent artist or creator describes who they are and who their fans are. A Qloo-powered agent researches the audience's real cultural taste (brands, games, shows, places), turns it into a scored collection of 5–8 makeable merch products with prices, margins and a drop plan, and describes each product in words first. The creator approves (or tweaks) each description, and only then does MerchDesk generate a concept image. Local brands and venues the fans already love are suggested as collab partners.

**Problem statement**
Independent musicians and creators pick merch from generic advice ("survey your fans", "see what other artists in your genre sell") and default to a logo on a black tee. A first print run ties up scarce cash, and nobody tells them *which* products fit *their* audience. A generic LLM answers from genre stereotypes. The creator needs product ideas grounded in what their specific audience actually loves, with the unit economics shown, before spending anything.

---

## User Personas

### Persona 1: Jess Marlowe
- **Role:** Lead singer and de facto manager of a Midwest emo band (Columbus, Ohio)
- **Context:** 27, 4,000 monthly listeners, plays 3 shows a month, merch is a single black tee
- **Primary goal:** Launch a small merch line before the next tour without wasting her limited cash
- **Pain points:** Doesn't know what else fans would buy; scared of ordering 100 hoodies nobody wants; no design budget
- **Quote:** "I know my fans love old video games and sour beer. How do I turn that into something I can actually sell?"

### Persona 2: Arjun Mehta
- **Role:** YouTuber running a retro-gaming channel (Pune, India)
- **Context:** 24, 18k subscribers, has never sold anything
- **Primary goal:** Find out what merch his audience would care about, and see it before committing
- **Pain points:** Doesn't trust generic "creator merch" lists; can't judge a product idea from a spec sheet; wants to *see* it
- **Quote:** "Show me what it looks like before I spend a rupee on a supplier."

### Persona 3: Priya Nair
- **Role:** Podcast host (food + true-crime), part-time
- **Context:** 31, loyal niche audience, no design skills
- **Primary goal:** One credible merch drop with a local collaborator
- **Pain points:** Doesn't know which local brands her listeners like; no idea how to price; doesn't know how many to order
- **Quote:** "Who in my city would actually want to put their name next to mine?"

---

## Core Features (MVP)

### F1 — Input and Resolve
**Description:** One input box accepts an artist/creator name (autocomplete resolved via Qloo search) or a free-text fan description, plus city, budget tier, creator type and optional "sounds like" names. The UI tells the user which path was used.
**Acceptance criteria**
- [ ] Typing ≥2 characters in the artist field shows up to 5 Qloo artist suggestions within 800 ms (cached) / 2 s (uncached)
- [ ] Submitting a free-text description with no artist works (Path B)
- [ ] City, budget (`small` | `medium` | `large`) and creator type (`musician` | `podcaster` | `youtuber` | `streamer` | `comic_artist` | `other`) are selectable; defaults are `medium` and `musician`; city is optional (an empty city is allowed, and Collab Radar then asks for one)
- [ ] Clicking an example chip fills the form and starts a run in one click
- [ ] Empty input shows "Tell us about your fans, or search an artist" and does not call any API
- [ ] The run shows a banner: "Path A: found *X* in Qloo" or "Path B: building from your description"

### F2 — Agentic Taste Profile
**Description:** An LLM agent calls Qloo tools (search, tags, taste analysis, related entities) and decides the order itself. A live "agent thinking" panel streams each step. The result is a Taste Profile (top tags, related brands, cross-domain interests) shown as editable chips. If the artist isn't in Qloo, the agent notices and switches route on its own.
**Acceptance criteria**
- [ ] Panel shows each tool call and a one-line result summary as it happens (SSE stream)
- [ ] Agent uses ≤8 tool calls and finishes within 45 s or the server returns what it has with a note
- [ ] If the artist search returns no confident match, the panel shows "Not found in Qloo — trying genre and interest tags" and the run continues (no error)
- [ ] The profile never contains an entity ID the agent did not receive from Qloo
- [ ] User can remove any chip, and add a chip via tag search; "Looks right → Build collection" is the only way to proceed
- [ ] If all LLM providers are rate-limited, a scripted fallback produces a profile and the UI shows "Fallback mode: fixed steps" (never a blank failure)
- [ ] If Qloo is unreachable or the key is missing, the user sees a clear message and a retry button

### F3 — Scored Collection with Evidence and Pricing
**Description:** Deterministic code scores a ~20-item catalog against the profile (`fit = 0.5×tag + 0.3×brand + 0.2×cross-domain`), applies business rules, and returns 5–8 products, each with a fit score, a "why" evidence trail, an estimated price, margin per unit and break-even quantity.
**Acceptance criteria**
- [ ] Collection has 5–8 products, ≥3 categories, ≥1 low-risk item, exactly 1 hero item (small budget may substitute the best-fit item)
- [ ] Every product shows 1–3 evidence chips, e.g. "← retro gaming (tag)", "← audience affinity: [brand]"
- [ ] Price, unit cost, margin per unit, first-run cost and break-even units are shown in a "Numbers" drawer, with an "Estimates — get supplier quotes" label
- [ ] The first-run total respects the chosen budget tier
- [ ] Items whose evidence came from LLM-classified (not Qloo-supplied) tags show an "estimated" marker
- [ ] No statement anywhere claims sales, revenue or purchase behaviour

### F4 — Describe, Approve, then Generate Image (the approval gate)
**Description:** Every product first appears as a written description of what it would look like (materials, colours, motifs, mood) beside a flat concept sketch. No image is generated yet. The user can approve, edit the words, or reject. Only on approval does MerchDesk generate an AI concept image from the approved text.
**Acceptance criteria**
- [ ] Each product card shows a 40–70-word visual description before any image request is made
- [ ] Zero image API calls occur until the user clicks **Approve & generate image** (verifiable in the browser network tab)
- [ ] Description is editable inline (max 600 chars) and via six tweak chips: "More minimal", "Bolder colours", "More vintage", "Darker palette", "Simpler design", "More playful"; a tweak returns a revised description and increments its version; **Undo** restores the previous version
- [ ] Editing a description after an image exists clears its approval and marks the old image "Outdated" until re-approved
- [ ] After approval the card shows a skeleton with an elapsed-seconds counter; typical image time ≤15 s; at 40 s it shows "Taking longer than usual"
- [ ] After the image appears: **Keep**, **Regenerate** (max 2 regenerations, 3 attempts total), **Download**
- [ ] A session cap of 12 images protects the free quota; at the cap the card explains and keeps the concept sketch
- [ ] If the image provider's free quota is exhausted the card says "Free image quota used for today — description and sketch are kept" and the product still works in the line sheet
- [ ] Every image is labelled "AI concept image — not a final design"
- [ ] Image prompts never contain the artist's name, Qloo-returned brand names, or text/logo requests (moderation, see `02-TRD.md → Image pipeline`)

### F5 — "Not for us" Refinement
**Description:** Rejecting a product re-queries Qloo with the entities behind that product excluded, re-scores, and swaps in a replacement. Approving a product can also feed its evidence entities back as positive signals.
**Acceptance criteria**
- [ ] **Not for us** removes the card with a 5-second **Undo** toast
- [ ] A replacement product appears with a note "Replaced *X* — related entities excluded"
- [ ] The replacement is never a previously shown or rejected catalog item
- [ ] Replacement uses Qloo exclusion (`filter.exclude.entities`) — visible in the thinking panel entry for the replace step
- [ ] If no eligible replacement exists, the slot shows "No more good matches for this budget" and the collection stays valid (≥5 products where possible)

### F6 — Collab Radar and Drop Plan
**Description:** Qloo place and brand insights filtered by the user's city suggest local breweries, cafés, shops and venues the fans already like, as co-branding partners. A Drop Plan arranges products into Core, Hero and Limited waves with suggested run sizes.
**Acceptance criteria**
- [ ] With a city set, Collab Radar shows 3–6 real Qloo-returned places/brands with a one-line partner idea each (LLM text restricted to supplied data)
- [ ] With no city, the section explains "Add a city to find local partners" and offers an input
- [ ] If the city has thin results, shows "Few matches in *City* — showing a nearby larger city" only if the user opts in; never silently swaps
- [ ] Drop Plan shows three waves with products, run sizes (never above 2× a product's minimum run) and the "order less than you think you'll sell" tip
- [ ] Consumable collab products (hot sauce, coffee, beer label) link to a Collab Radar partner type, and show a short compliance note ("check food/alcohol labelling rules")

### F7 — Qloo vs Generic comparison panel
**Description:** A side-by-side panel for the same input: "Generic AI (same model, no Qloo)" vs "MerchDesk (Qloo-grounded)", answering the judges' core question — *would this work the same without Qloo?*
**Acceptance criteria**
- [ ] Opens from a "Why not just ask ChatGPT?" button; generic list is generated lazily on first open (saves free quota) and cached per input
- [ ] Generic column lists 5–8 product names only, no evidence; MerchDesk column shows the same count with evidence chips
- [ ] Panel is labelled honestly: generic baseline uses the same LLM provider without any Qloo data
- [ ] Items that appear in both lists are marked "overlap"; items only in MerchDesk show the Qloo evidence that drove them

### F8 — One-page Line Sheet export
**Description:** A printable one-page line sheet (A4/Letter) with the collection, prices, supplier briefs, drop plan and approved images (or sketches). Uses the browser's print-to-PDF, so it costs nothing.
**Acceptance criteria**
- [ ] `/line-sheet` renders the current collection and shows **Print / Save as PDF**
- [ ] Print layout fits one page for ≤8 products, no cut-off cards
- [ ] Products without an approved image show their concept sketch and "Concept sketch"
- [ ] Footer states: estimates, AI concept images, "Audience insights powered by Qloo"
- [ ] If sessionStorage has no collection, shows "Nothing to print yet" with a link to `/`

---

## Nice-to-Have Features (v2)

| Feature | Why deferred |
|---|---|
| Fan Crate bundle (3-item themed bundle) | Extra scoring/UI complexity; core loop matters more |
| Shareable collection link | Needs storage or URL-state compression; images can't travel in a URL |
| Budget slider that live-rebuilds the collection | Nice, but tier select covers it |
| INR / multi-currency | Needs localized cost data |
| Creator-type-specific catalogs (podcast, comics) | Catalog authoring time |
| Saved projects / accounts | Needs DB and auth; contradicts zero-friction demo |
| Supplier quote request emails | Out of hackathon scope |
| Image-to-image refinement (edit generated image) | Free image tier is text-to-image only |

---

## User Stories

| # | As a… | I want to… | So that… | Priority |
|---|---|---|---|---|
| 1 | Jess | type my band name and city | the tool finds my fans' taste without me explaining everything | Must |
| 2 | Arjun | describe my audience in a sentence when my channel isn't in the database | I still get a real result | Must |
| 3 | Jess | watch the agent work step by step | I trust the results come from real data | Must |
| 4 | Jess | remove a tag that doesn't describe my fans | the collection reflects reality | Must |
| 5 | Arjun | read what each product would look like in words first | I can judge it before anything is generated | Must |
| 6 | Arjun | edit the description or tap "more minimal" | the image matches my taste | Must |
| 7 | Arjun | approve a description and then see an image of it | I can picture the product | Must |
| 8 | Priya | see price, cost, margin and break-even per product | I know what I'm risking | Must |
| 9 | Jess | tell the tool "not for us" and get a replacement | I'm not stuck with bad ideas | Should |
| 10 | Priya | see local breweries/cafés/shops my fans like | I can pitch a collab | Should |
| 11 | Jess | see Core / Hero / Limited drop waves with run sizes | I order small and create scarcity | Should |
| 12 | Arjun | compare MerchDesk against a generic AI answer | I know the Qloo data made a difference | Should |
| 13 | Priya | download a one-page line sheet | I can hand it to a printer | Should |
| 14 | Jess | regenerate an image up to twice | I'm not stuck with one unlucky result | Could |
| 15 | Arjun | download an approved image | I can show my community | Could |
| 16 | Any user | still get a usable result when free quotas run out | the app never just breaks | Must |

---

## Non-Goals (v1)

- **Selling or payments:** MerchDesk plans merch; it does not run a store or take money. Needs payments, tax and fulfilment.
- **Print-on-demand ordering:** no supplier integrations. Briefs are text for the creator to send.
- **Sales or revenue prediction:** Qloo gives affinity, not purchase data. Claiming prediction would be dishonest.
- **User accounts and saved projects:** keeps the demo friction-free and the stack free.
- **Final-quality design files:** images are concept visuals. Free text-to-image models can't reliably render text or logos.
- **Real artist likeness, logos or trademarks:** neither in prompts nor outputs (copyright and likeness risk).
- **Multi-language UI:** English only in v1.

---

## Success Metrics

| Metric | Target | Timeframe | How measured |
|---|---|---|---|
| End-to-end demo run (input → approved image → line sheet) | ≤ 90 seconds for one product | Fri 30 Oct, before submit | Stopwatch on 3 test inputs |
| Runs producing a valid 5–8 item collection | 100% of 4 test inputs (famous artist, small indie band, description-only, podcaster) | Fri 30 Oct | Manual test matrix in `06-IMPLEMENTATION-PLAN.md` |
| Zero-cost compliance | $0 spent, 0 payment methods attached | Whole build | Account audit before submit |
| Images generated before approval | 0 | Whole build | Network tab check + unit test on `/api/image` |
| Judge-ready submission | Live URL, public repo, MIT visible in About, description text | Fri 30 Oct 18:00 IST | Devpost checklist (`06-IMPLEMENTATION-PLAN.md → Phase 11`) |
| Lighthouse (mobile) accessibility score | ≥ 90 | Fri 30 Oct | Chrome Lighthouse on `/` and `/studio` |

---

## Copy and Claims Rules (applies to every UI string and the Devpost text)

1. Say **"affinity"**, never "buys" or "sells". Example: "This audience shows strong affinity for retro gaming."
2. Prices and costs are always labelled **"Estimate"**. Never present them as Qloo data.
3. Images are **"AI concept images"**.
4. Do not quote percentages about merch revenue unless a source link is shown. (The original research could not verify "70% of revenue" or "90% print black tees" — do not use them.)
5. The LLM may only name products from the catalog and tags/brands/places that Qloo returned. It must not invent brands, prices, sales numbers or claims about the artist.

---

## Judging-Criteria Mapping

| Criterion | How MerchDesk answers it |
|---|---|
| Technological Implementation | LLM agent with 5 Qloo-backed tools, exclusion-based refinement, location-filtered places, deterministic scoring with evidence trail, provider-fallback chain |
| Design | Zine/gig-poster look, describe→approve→image flow, thinking panel, printable line sheet (`04-UI-UX-BRIEF.md`) |
| Potential Impact | Real audience (independent creators), real money decision (first print run), margins and break-even shown |
| Quality of the Idea | Taste→product translation layer + local collab radar + approval-gated imagery + side-by-side proof against generic AI |

## Risks

| Risk | Mitigation |
|---|---|
| Qloo key delayed | Request today; build against synthetic fixtures labelled "SAMPLE DATA" for local dev only; demo must use live Qloo |
| Small artist missing from Qloo | Path B (description + tags) built and tested first |
| Free LLM quota or model availability changes | Provider chain (Groq → Gemini → Cloudflare) + scripted fallback + templated descriptions |
| Free image quota exhausted mid-judging | Approval-gated generation, session cap, SVG sketch fallback |
| Overclaiming | Copy rules above, reviewed in Phase 11 |
