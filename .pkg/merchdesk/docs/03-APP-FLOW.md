# MerchDesk — App Flow & Screen Specifications

## Assumptions

- Five routes only: `/`, `/studio`, `/line-sheet`, `/about`, plus `not-found`. No auth, no layouts beyond the root layout.
- All run state lives in `StudioProvider` (`lib/state/`). Text state is mirrored to `sessionStorage` under the key `merchdesk:v1`; images are **never** persisted.
- Components named here are specified in `04-UI-UX-BRIEF.md`. API calls are specified in `05-BACKEND-SCHEMA.md`. Feature IDs (F1–F8) come from `01-PRD.md`.
- Hydration rule: read `sessionStorage` in a `useEffect` after mount (never during render) to avoid hydration mismatch.

---

## Route Table

| Route | File | Auth | Layout | Purpose | PRD |
|---|---|---|---|---|---|
| `/` | `app/page.tsx` | No | Root | Landing + input form | F1 |
| `/studio` | `app/studio/page.tsx` | No | Root | Agent run, taste profile, collection, collabs, drop plan, compare, export | F2–F8 |
| `/line-sheet` | `app/line-sheet/page.tsx` | No | Root (header/footer hidden in print) | Printable one-page line sheet | F8 |
| `/about` | `app/about/page.tsx` | No | Root | How it works, data honesty, license, credits | — |
| `*` | `app/not-found.tsx` | No | Root | 404 | — |

## Navigation Flow

```
/ (Landing)
 ├─ [Example chip]  ──► fills form + starts run ──► /studio
 ├─ [Build my merch line] ──► /studio  (input stored in state; run starts)
 └─ [How it works] ──► /about

/studio
 ├─ Section 1  Options bar (edit input → "Re-run")
 ├─ Section 2  Taste profile  (agent thinking + chips)  ── [Looks right → Build collection]
 ├─ Section 3  Collection     (ProductCards: describe → approve → image)
 │               ├─ [Why not just ask ChatGPT?] → ComparePanel (slide-over)
 │               ├─ [Numbers] → NumbersDrawer
 │               └─ [Not for us] → replace flow
 ├─ Section 4  Collab Radar + Drop Plan
 └─ Section 5  Export ──► /line-sheet ──► window.print()

Header (all pages): logo → /, "How it works" → /about, "Powered by Qloo" mark (external link to qloo.com, opens new tab)
```

---

## Studio State (what the screens read)

```ts
interface StudioState {
  stage: 'idle'|'profiling'|'profile_ready'|'building'|'collection'
  input: StudioInput | null
  agentEvents: AgentEvent[]
  profile: TasteProfile | null
  products: ProductProposal[]
  dropPlan: DropPlan | null
  collabs: CollabSuggestion[] | null
  cityNote?: string
  generic: { name: string; reason: string }[] | null
  imagesGenerated: number            // session counter, cap from NEXT_PUBLIC_MAX_IMAGES_PER_SESSION
  rejectedIds: string[]              // catalog ids never to show again
  lastError: { code: string; message: string } | null
}
```
Reducer actions: `RUN_STARTED`, `AGENT_EVENT`, `PROFILE_READY`, `CHIP_REMOVED`, `CHIP_ADDED`, `COLLECTION_REQUESTED`, `COLLECTION_READY`, `EDIT_TEXT`, `TWEAK_OK`, `UNDO_TEXT`, `APPROVE`, `IMAGE_REQUESTED`, `IMAGE_OK`, `IMAGE_FAIL`, `IMAGE_QUOTA`, `SESSION_CAP`, `REGENERATE`, `REJECT`, `REPLACE_OK`, `REPLACE_NONE`, `UNDO_REJECT`, `COLLABS_READY`, `GENERIC_READY`, `ERROR`, `RESET`. State machine rules: `05-BACKEND-SCHEMA.md → State Machines`.

---

## Screen: `/` — Landing

**File:** `app/page.tsx` | **Auth:** No | **Layout:** Root

**Purpose:** Capture who the fans are and start a run in as few clicks as possible.

**Visible UI elements**
- `SiteHeader`: logo "MerchDesk" (left), links "How it works", `PoweredByQloo` mark (right)
- Hero: H1 "Your fans deserve better than a black tee." Sub: "Tell us who you are and who your fans are. A Qloo-powered agent finds what they love and turns it into merch you can actually make."
- `HeroInput` card (tape-decorated):
  - Field 1 `ArtistAutocomplete`: label "Artist or creator name (optional)", placeholder "Search an artist…"
  - Field 2 textarea: label "Or describe your fans", placeholder "Midwest emo band, fans love vintage video games and craft sour beers"
  - Field 3 text: label "Sounds like (optional, up to 3)", tag-input, placeholder "Add an artist and press Enter"
  - Field 4 text: label "City (for local collabs)", placeholder "Columbus, Ohio"
  - Field 5 select: label "Budget", options `Small run (≈ up to $700)`, `Medium (≈ up to $2,200)`, `Large (≈ up to $6,000)`; default Medium
  - Field 6 select: label "I make…", options Music, Podcast, YouTube, Streaming, Comics, Other; default Music
  - Primary button "Build my merch line →"
- `ExampleChips` (3 chips): "Midwest emo band · retro games + sour beer", "Retro-gaming YouTuber", "Food + true-crime podcast"
- 3-step explainer strip: "1 Taste research · 2 Describe & approve · 3 Image + plan"
- Honesty strip: "Audience affinity comes from Qloo. Prices are our estimates. Images are AI concepts."
- Status banner (conditional): if `GET /api/status` says `qloo=false`, show amber banner "Taste data isn't connected in this deployment."
- `SiteFooter`: MIT license link, GitHub link, "Audience insights powered by Qloo"

**Interactions**
- Typing ≥2 chars in artist field → debounce 300 ms → `GET /api/search?kind=entity&type=artist` → dropdown (≤5, keyboard navigable: ↑/↓/Enter/Esc). Selecting fills `input.artist`.
- Example chip → fills fields (text, creator type, optional city placeholder) and immediately submits.
- Submit → validate (`studioInputSchema`), `dispatch(RUN_STARTED)`, `router.push('/studio')`.

**Validation**
- Both artist and description empty → inline error under the textarea: "Tell us about your fans, or search an artist" (field gets `aria-invalid`).
- Description > 1000 chars → "Max 1,000 characters".
- "Sounds like" > 3 → input disabled with hint "Max 3".

**Data fetched:** `/api/status` once on mount; `/api/search` as the user types.
**Loading:** Autocomplete shows 3 skeleton rows. **Empty:** "No artists found — describe your fans instead" (link scrolls/focuses textarea). **Error:** dropdown shows "Search unavailable — you can still describe your fans."
**Mobile:** single column; `HeroInput` full width; example chips horizontally scrollable.

---

## Screen: `/studio` — Workspace

**File:** `app/studio/page.tsx` (client component) | **Auth:** No | **Layout:** Root

**Purpose:** Run the agent, confirm the taste profile, review/approve products, see collabs and drop plan, export.

**Guard:** if `state.input === null` after hydration (user opened `/studio` directly), redirect to `/` with toast "Start by telling us about your fans".

**Global elements**
- `Stepper` (sticky under header): `1 Fans · 2 Taste · 3 Collection · 4 Partners & Plan · 5 Export`; current step highlighted; steps become clickable anchors once reached.
- `ToastHost` (bottom-right desktop, bottom-center mobile).

### Section 1 — Options bar (`OptionsBar`)
- Shows summary pills: artist/description (truncated), city, budget, creator type, path badge ("Path A: found *X* in Qloo" green / "Path B: from your description" amber) after profiling.
- Buttons: "Edit" (opens inline edit, same fields as landing) → "Re-run" (dispatch `RESET` for profile/collection, restarts agent).
- Re-run when products exist asks for confirmation via `Modal`: "Re-running replaces your current collection and approved descriptions. Images already made will be lost." Buttons: "Cancel" / "Re-run".

### Section 2 — Taste profile (`AgentThinkingPanel` + `TasteProfileCard`)
Layout: two columns desktop (panel 5/12, profile 7/12); stacked on mobile (panel collapses to a 1-line "Agent finished in *N* steps — show" after `done`).

**AgentThinkingPanel** (mono font, terminal-style card)
- Header: "Agent" + mode badge "LLM agent" or "Fallback: fixed steps".
- Row types: `step` (spinner/check icon + label), `tool_call` (`→ qloo_search_entity("…")`), `tool_result` (`✓ Found …` / `∅ No match` in muted text), `note` (amber).
- Auto-scrolls to newest row unless the user scrolled up.
- `aria-live="polite"` on the list.

**TasteProfileCard**
- Title "What your fans gravitate toward"
- `TasteChips` groups: **Taste tags** (top 10), **Brands** (top 8), **Also into** (cross-domain, top 8, each chip has a type icon: gamepad/tv/film/book/mic), **Local-style inspirations** (places, top 5).
- Each chip: label + small weight dot (3 levels); `estimated` chips have a dashed border and tooltip "Estimated by AI from the name — not returned by Qloo".
- Chip remove (×) button; "＋ Add tag" opens a small autocomplete using `GET /api/search?kind=tag`.
- Footnote: "Affinity = how strongly this audience gravitates toward something. It is not purchase data."
- Primary button **"Looks right → Build collection"** (disabled while profiling; enabled in `profile_ready`).

**States**
- *Loading (profiling):* panel streams; profile card shows `Skeleton` chip groups.
- *Empty profile* (agent produced <3 tags): card shows "We found very little for this input. Add a few interests (e.g. 'retro gaming') and rebuild." with the Add-tag input focused. Build button disabled until ≥3 tags.
- *Error:* red card "Couldn't reach taste data" + code-specific message from `05-BACKEND-SCHEMA.md → Error Format` + **Try again** button (re-sends same input).
- *Fallback notice:* amber strip "Our free AI is resting — using fixed steps. Results are still from Qloo."

### Section 3 — Collection (`CollectionGrid` of `ProductCard`)
- Header: "Your collection" + counter "*n* of *m* approved" + button "Why not just ask ChatGPT?" (opens `ComparePanel`).
- Grid: 1 column mobile, 2 columns ≥768 px, 3 columns ≥1280 px.
- *Loading (building):* 6 card skeletons + status text "Matching products… Pricing… Writing descriptions…".
- *Empty:* only if scoring returns <1 item: "No products fit this budget. Try a larger budget." + button to edit options.
- *Error:* "Couldn't build the collection" + Try again.

#### `ProductCard` — layout (top to bottom)
1. **Header row:** role badge (`HERO` / `CORE` / `LIMITED`), category chip, `ScoreRing` (fit 0–100) with tooltip "Fit: how well this matches your audience's taste data".
2. **ImageStage** (`aspect-square`): shows concept `Silhouette` + label "Concept sketch — no image yet" in `proposed`/`approved-before-generation` states; skeleton + timer in `generating`; image + label "AI concept image — not a final design" in `ready`.
3. **Title** (product name) and one-liner.
4. **"What it looks like"** block: the description text (read-only until Edit pressed), version badge `v1`.
5. **Tweak chips row** (visible only while not generating): "More minimal", "Bolder colours", "More vintage", "Darker palette", "Simpler design", "More playful".
6. **Evidence row:** 1–3 chips, e.g. `← retro gaming (taste)` / `← audience affinity: Brand` / `← also into: Game Title`; clicking opens `WhyPopover` (breakdown: points per term).
7. **Price row:** "Est. $32" large, "typical $28–38" muted, "Margin $22 / unit", button "Numbers".
8. **ApprovalBar** (state-dependent buttons, below):

| Card state | Visible buttons | Notes |
|---|---|---|
| `proposed` (no image) | **Approve & generate image** (accent), Edit, Not for us | Approve disabled if description empty or >600 chars |
| editing | Save, Cancel (+ char counter *n*/600) | Save → state back to `proposed`, `version+1` |
| `approved`/`generating` | disabled "Generating… *Ns*" | Not-for-us still available |
| `ready` | **Keep ✓**, Regenerate (*2 left*), Download, Edit, Not for us | Download saves `merchdesk-<id>.jpg` |
| `failed` | Try again, Edit | Error line under image stage |
| `quota` | (no image buttons) Edit, Not for us | Banner: "Free image quota used for today — description and sketch are kept." |
| `cap` | same as quota | Banner: "You've reached this session's image limit (12)." |
| `outdated` image | **Approve & generate image**, Edit | Old image dimmed with "Outdated" tag |

- "Keep ✓" marks `kept` (visual only: green check; counts toward "approved" counter).

#### Approval flow (step by step, PRD F4)
1. Card appears with description + sketch. **No image request has been made.**
2. User reads. Option A: tap a tweak chip → button shows spinner → `POST /api/describe` → description replaced, `version` +1, history pushed, toast "Description updated · Undo".
3. Option B: **Edit** → textarea (autofocus, 600 max) → Save.
4. **Approve & generate image** → `APPROVE` then `IMAGE_REQUESTED` → `POST /api/image { approved: true, approvedDescription, attempt }`.
5. On `IMAGE_OK`: image fades in (200 ms), buttons switch to `ready` set, `imagesGenerated += 1`.
6. **Regenerate** → `REGENERATE` (attempt+1, max 3 attempts) → same request with next composition.
7. Editing text on a `ready` card sets `image.outdated = true` and `decision='pending'`.

#### Reject flow ("Not for us", PRD F5)
1. Click → card collapses with 5 s toast "Removed *Name* · Undo". `rejectedIds` updated.
2. After toast timeout (or immediately if Undo not pressed within 5 s) → `POST /api/replace`.
3. Placeholder skeleton card appears in the slot labelled "Finding a replacement…".
4. `REPLACE_OK` → new card animates in with a small note "Replaced *X* — related entities excluded"; the agent thinking panel (collapsed) gets a new row "replace: excluded N entities".
5. `REPLACE_NONE` → slot shows "No more good matches for this budget" (dashed card, dismiss ×).
6. **Undo** within 5 s cancels the request and restores the card.

### NumbersDrawer (right drawer, bottom sheet on mobile)
- Title "Numbers — *Product name*" + banner "Estimates — get supplier quotes before you order."
- Table rows: Price, Unit cost, Margin per unit, Setup cost, Minimum run, First-run cost, Break-even units (or "Not reached within the minimum run"), Typical retail range.
- Supplier brief block (copy button), `complianceNote` if any.
- Close: ×, Esc, backdrop click.

### WhyPopover
- Lists up to 3 evidence rows: label, source (Qloo tag / Qloo brand / Qloo entity / "AI-estimated"), points (+n of 100). Footnote "Affinity data from Qloo".

### Section 4 — Partners & Plan
**CollabRadar**
- Header "Collab Radar — local partners your fans already like"
- With city: fires `POST /api/collabs` automatically when the collection is ready. Cards (3–6): name, type icon (place/brand), area, 2 tag chips, one-line partner idea, linked product chip (e.g. "→ Beer label collab").
- No city: input "Add a city to find local partners" + button "Find partners".
- Loading: 3 skeleton cards. Empty: "Few matches in *City*." with optional button "Try a larger nearby city" (opens city input — never switches silently). Error: "Couldn't load partners — Try again".
**DropTimeline**
- Horizontal (desktop) / vertical (mobile) 3 waves: **Wave 1 · Core (Week 0)**, **Wave 2 · Hero pre-order (Week 2)**, **Wave 3 · Limited (Week 5)**. Each lists products with run sizes, note.
- Tip card: "Order less than you think you'll sell — a sell-out creates demand."
- Consumable collab items show their `complianceNote`.

### Section 5 — Export (`ExportBar`)
- Buttons: **"Open line sheet"** → `/line-sheet`; **"Download all approved images"** (disabled if none; downloads each as separate files).
- Note: "Concept images are AI-generated and not final designs."

### ComparePanel (slide-over, right on desktop, full-screen on mobile)
- Trigger: "Why not just ask ChatGPT?" on the Collection header.
- Header: "Same input, two answers". Left column **Generic AI** (no Qloo): list of names + one-line reasons. Right column **MerchDesk**: collection names + evidence chips.
- Overlap markers: matching names get an "overlap" badge; others in MerchDesk show their top evidence chip.
- Loading: left column skeleton while `POST /api/compare` runs (first open only). Error: left column "Couldn't generate the generic list" (right column still works).
- Footer: "The generic list uses the same AI with no Qloo data."

---

## Screen: `/line-sheet` — Printable line sheet

**File:** `app/line-sheet/page.tsx` | **Auth:** No | **Layout:** Root; header/footer/buttons hidden via `@media print`.
**Purpose:** One-page handout for printers or posting online (PRD F8).

**UI elements:** page title (artist/creator or "Your merch line"), subtitle "Concept line sheet · date", products table/grid (image or sketch, name, est. price, min run, supplier type + brief), Drop Plan strip, margins summary (first-run total, per-item margin), footer disclaimers: "Prices are estimates. Concept images are AI-generated. Audience insights powered by Qloo."
**Toolbar (screen only):** "Print / Save as PDF" (`window.print()`), "Back to studio".
**Data:** from `StudioProvider`/`sessionStorage` (images only if still in memory; otherwise sketches).
**Empty:** "Nothing to print yet" + "Start at the beginning" link to `/`.
**Print CSS:** `@page { size: A4; margin: 12mm }`; grid 2 columns ×4 rows for ≤8 products; `break-inside: avoid` on cards.

---

## Screen: `/about`

**File:** `app/about/page.tsx` | **Auth:** No
**Sections:** How it works (4 steps), "What Qloo does here" (affinity, not purchases), "What's estimated" (prices/margins), "What's AI" (descriptions, concept images), Free-tier note ("Runs on free services; limits may apply"), License (MIT, link to repo), Credits. Static content only.

---

## Screen: `not-found`
H1 "404 — This page isn't on the merch table", button "Back home".

---

## Modals, Drawers and Popovers

| Name | File | Trigger | Content | Close |
|---|---|---|---|---|
| ConfirmRerun | `ui/Modal.tsx` | Re-run with existing products | Warning text + Cancel/Re-run | Esc, backdrop, Cancel |
| NumbersDrawer | `studio/NumbersDrawer.tsx` | "Numbers" on card | Price/cost table + supplier brief | ×, Esc, backdrop |
| ImageLightbox | `ui/Modal.tsx` | Click generated image | Full-size image + Download + caption | ×, Esc |
| ComparePanel | `studio/ComparePanel.tsx` | Compare button | Two-column comparison | ×, Esc |
| WhyPopover | `studio/WhyPopover.tsx` | Evidence chip / score ring | Evidence breakdown | Esc, outside click |

Focus rules: opening focuses the dialog's first heading/close button; focus is trapped inside Modal/Drawer; closing returns focus to the trigger.

## Toast Triggers

| Event | Type | Message | Duration |
|---|---|---|---|
| Opened `/studio` without input | info | "Start by telling us about your fans" | 4 s |
| Tweak applied | success | "Description updated · Undo" | 5 s |
| Undo text | info | "Restored previous version" | 3 s |
| Image ready | success | "Image ready — *Product*" | 3 s |
| Image failed | error | "Image generation failed — try again" | manual |
| Image quota | info | "Free image quota used for today" | 6 s |
| Session cap | info | "Image limit for this session reached" | 6 s |
| Product removed | info | "Removed *Name* · Undo" | 5 s |
| Replacement found | success | "Replaced with *Name*" | 3 s |
| Network error | error | "Connection problem — try again" | manual |
| Rate limited | error | "Slow down a little — try again in *N* s" | 5 s |
| Copy supplier brief | success | "Copied" | 2 s |

Toast style rules: `04-UI-UX-BRIEF.md → Toast`.

## Global Error States

| Situation | Where | UI |
|---|---|---|
| Network down | any fetch | Toast "Connection problem — try again"; buttons re-enabled |
| `RATE_LIMITED` (429) | any API | Toast with retry seconds; relevant button disabled until timer ends |
| `QLOO_*` | profiling, collabs, replace | Inline error card with Try again |
| `LLM_UNAVAILABLE` | any LLM step | Silent downgrade to scripted/template; amber strip once per run |
| `MODERATION_BLOCKED` | image | Card error: "That description can't be turned into an image. Edit it and try again." |
| Unhandled exception | any route | `app/error.tsx`: "Something went wrong", Reload button; state preserved in sessionStorage |
| 404 | unknown URL | `not-found.tsx` |

## Copy Constraints (enforced in review)
Use "affinity", "estimate", "AI concept image". Never "buys", "sells", "predicts", "guaranteed". See `01-PRD.md → Copy and Claims Rules`.
