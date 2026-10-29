# MerchDesk — UI/UX Design System

## Assumptions

- Tailwind CSS **v4** (tokens declared in CSS with `@theme`, which generates utilities like `bg-paper`, `text-ink`, `shadow-hard`).
- Light "paper" theme only in v1. A dark mode is not specified (the zine look depends on paper + ink). 
- Fonts via `next/font/google`: **Archivo Black** (display), **Space Grotesk** (body), **JetBrains Mono** (labels/agent panel).
- Icons: `lucide-react`, 18 px default, `strokeWidth={2.25}` to match thick zine lines.
- Contrast ratios below are approximate hand calculations; re-check with a contrast tool in Phase 11.

---

## Design Philosophy

MerchDesk looks like something a band would photocopy and tape to a lamp-post: warm paper, black ink, hard offset shadows, tape strips and sticker accents, one loud accent colour at a time. It must still feel trustworthy — numbers are laid out cleanly, estimates and AI content are always labelled, and every recommendation shows its "why". Playful on the surface, rigorous underneath. The approval flow (words first, then image) is the emotional centre of the product: the user is in control, and nothing "magic" happens without their yes.

Three rules:
1. **Loud accents, calm text.** Accent colours are backgrounds/borders; body text is always ink on paper.
2. **Everything claimed is labelled.** "Estimate", "AI concept image", "Qloo affinity" badges are part of the design, not footnotes.
3. **One primary action per card state.** The accent button is the next best step.

---

## CSS Variables and Tokens (paste into `app/globals.css`)

```css
@import "tailwindcss";

@theme {
  /* colour */
  --color-paper: #F5F0E6;
  --color-paper-2: #EDE6D6;
  --color-paper-3: #E2D9C4;
  --color-ink: #14110F;
  --color-ink-2: #3A342D;
  --color-mute: #6B6458;
  --color-line: #14110F;
  --color-tomato: #FF4B2B;
  --color-tomato-deep: #C8321A;
  --color-acid: #D7F34A;
  --color-cobalt: #2B4BFF;
  --color-amber: #F5B83D;
  --color-leaf: #1F8A4C;

  /* fonts (set by next/font variables) */
  --font-display: var(--font-archivo), "Arial Black", Impact, sans-serif;
  --font-sans: var(--font-grotesk), ui-sans-serif, system-ui, sans-serif;
  --font-mono: var(--font-jbmono), ui-monospace, SFMono-Regular, Menlo, monospace;

  /* radius */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-pill: 999px;

  /* shadows: hard offset, zine style */
  --shadow-hard: 4px 4px 0 0 var(--color-ink);
  --shadow-hard-lg: 6px 6px 0 0 var(--color-ink);
  --shadow-hard-sm: 2px 2px 0 0 var(--color-ink);
  --shadow-soft: 0 6px 18px -8px rgb(20 17 15 / 0.35);
}

@layer base {
  html { background: var(--color-paper); color: var(--color-ink); }
  body { font-family: var(--font-sans); font-size: 16px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  ::selection { background: var(--color-acid); color: var(--color-ink); }
  :focus-visible { outline: 3px solid var(--color-cobalt); outline-offset: 2px; }
  .paper-grain { background-image: radial-gradient(rgb(20 17 15 / 0.04) 1px, transparent 1px); background-size: 4px 4px; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}

@media print {
  header, footer, .no-print { display: none !important; }
  html, body { background: #fff !important; }
  @page { size: A4; margin: 12mm; }
  .print-avoid-break { break-inside: avoid; }
}
```

`app/layout.tsx` font setup:
```ts
import { Archivo_Black, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
const archivo = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' })
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono', display: 'swap' })
// <body className={`${archivo.variable} ${grotesk.variable} ${jbmono.variable}`}>
```

---

## Colour Palette

| Token | Hex | Tailwind class | Usage rule |
|---|---|---|---|
| Paper | `#F5F0E6` | `bg-paper` | Page background |
| Paper 2 | `#EDE6D6` | `bg-paper-2` | Cards on paper, input fill |
| Paper 3 | `#E2D9C4` | `bg-paper-3` | Hover fills, skeleton base |
| Ink | `#14110F` | `text-ink`, `border-ink` | All body text, borders, shadows |
| Ink 2 | `#3A342D` | `text-ink-2` | Secondary text (≈ 10:1 on paper) |
| Mute | `#6B6458` | `text-mute` | Captions, placeholders (≈ 5.2:1 on paper) |
| Tomato | `#FF4B2B` | `bg-tomato` | **Background only** (primary accent buttons, HERO badge). Ink text on it ≈ 5.6:1. Never as text on paper (≈ 2.9:1) |
| Tomato deep | `#C8321A` | `text-tomato-deep`, `border-tomato-deep` | Error text, destructive (≈ 4.7:1 on paper) |
| Acid | `#D7F34A` | `bg-acid` | Highlights, "approved" ring, selection; ink text only |
| Cobalt | `#2B4BFF` | `text-cobalt`, `bg-cobalt` | Links, focus ring, Qloo evidence chips (≈ 5.2:1 on paper; white on cobalt ≈ 5.9:1) |
| Amber | `#F5B83D` | `bg-amber` | Warnings, "estimate" badges, Path B banner; ink text only |
| Leaf | `#1F8A4C` | `text-leaf`, `bg-leaf` | Success text/icons (white on leaf ≈ 4.6:1; leaf on paper ≈ 3.9:1 → icons/large text only) |
| Line | `#14110F` | `border-line` | 2 px borders on cards/buttons |

Palette data for product mockups (not UI chrome) lives in `data/palettes.json` (`05-BACKEND-SCHEMA.md`).

---

## Typography

| Role | Class string | Size / line / tracking | Use for |
|---|---|---|---|
| Display | `font-display text-5xl md:text-7xl leading-[0.95] tracking-tight uppercase` | 48–72 px | Landing H1 only |
| H1 | `font-display text-3xl md:text-4xl leading-tight uppercase` | 30–36 px | Page titles |
| H2 | `font-display text-2xl leading-tight uppercase` | 24 px | Section titles |
| H3 | `font-sans text-lg font-bold leading-snug` | 18 px | Card titles |
| Body | `font-sans text-base text-ink` | 16 / 24 | Default |
| Body small | `font-sans text-sm text-ink-2` | 14 / 20 | Descriptions, helper text |
| Caption | `font-sans text-xs text-mute` | 12 / 16 | Footnotes, typical range |
| Label | `font-mono text-xs uppercase tracking-widest text-ink-2` | 12 px, +0.1em | Field labels, badges, agent panel |
| Price | `font-display text-2xl` | 24 px | "Est. $32" |
| Code/agent | `font-mono text-[13px] leading-5` | 13 / 20 | Thinking panel rows |

Minimum body text size is 14 px (descriptions) and 12 px (captions only). Never set text below 12 px.

## Spacing, Radius, Shadow

- **Spacing scale (4 px base):** `1`=4, `2`=8, `3`=12, `4`=16, `5`=20, `6`=24, `8`=32, `10`=40, `12`=48, `16`=64, `20`=80. Section vertical rhythm `py-12 md:py-20`; card padding `p-4 md:p-5`; grid gaps `gap-4 md:gap-6`.
- **Container:** `mx-auto w-full max-w-6xl px-4 md:px-6`.
- **Radius:** inputs/buttons `rounded-sm` (4 px); cards `rounded-md` (8 px); chips `rounded-full`; images `rounded-sm`.
- **Borders:** structural borders are `border-2 border-ink`; dividers `border-t border-ink/20`.
- **Shadows:** `shadow-hard` for cards/buttons at rest, `shadow-hard-lg` on hover (translate −2 px/−2 px), `shadow-hard-sm` for chips, `shadow-soft` for drawers/popovers.

---

## Component Library

### Button (`components/ui/Button.tsx`)

Base: 
```
inline-flex items-center justify-center gap-2 font-display uppercase tracking-wide text-sm
min-h-11 px-4 py-2.5 border-2 border-ink rounded-sm shadow-hard
transition-[transform,box-shadow,background-color] duration-150
hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg
active:translate-x-0.5 active:translate-y-0.5 active:shadow-none
focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/50
disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none
```
| Variant | Add classes | Use |
|---|---|---|
| primary (accent) | `bg-tomato text-ink` | Next best step: **Approve & generate image**, **Build my merch line**, **Looks right → Build collection** |
| secondary | `bg-paper text-ink` | Edit, Regenerate, Keep |
| dark | `bg-ink text-paper` | Print / Save as PDF |
| ghost | `bg-transparent border-transparent shadow-none hover:bg-paper-3 hover:translate-x-0 hover:translate-y-0 hover:shadow-none` | Tertiary text actions |
| destructive | `bg-paper text-tomato-deep border-tomato-deep shadow-[4px_4px_0_0_var(--color-tomato-deep)]` | **Not for us** |
| icon-only | `h-11 w-11 p-0` (+ required `aria-label`) | Close ×, remove chip |
Loading state: replace children with `<Loader2 className="h-4 w-4 animate-spin" aria-hidden /> <span>Working…</span>`, set `aria-busy="true"` and `disabled`.
Touch target ≥ 44 px (`min-h-11`).

### Inputs (`Input`, `Textarea`, `Select`)
```
w-full bg-paper-2 text-ink placeholder:text-mute font-sans text-base
border-2 border-ink rounded-sm px-3 py-2.5 min-h-11
focus:outline-none focus:bg-paper focus:ring-4 focus:ring-cobalt/40
aria-[invalid=true]:border-tomato-deep aria-[invalid=true]:bg-[#FFF1EE]
disabled:opacity-50
```
- Label: `font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block`; optional fields add `<span class="text-mute normal-case tracking-normal"> (optional)</span>`.
- Error text: `mt-1.5 text-sm text-tomato-deep font-medium` with `id` referenced by `aria-describedby`; icon `AlertCircle`.
- Textarea: `min-h-28 resize-y`. Char counter: `text-xs text-mute text-right` turning `text-tomato-deep` at limit.
- Select: native `<select>` styled the same + chevron icon via background; keeps mobile pickers.
- Tag input ("Sounds like"): chips inside the field; Enter/comma adds; Backspace removes last; `role="list"`.

### Autocomplete (`ArtistAutocomplete`)
Combobox pattern: input `role="combobox" aria-expanded aria-controls aria-autocomplete="list"`; list `role="listbox"` `bg-paper border-2 border-ink shadow-hard mt-1 max-h-64 overflow-auto`; option `role="option" px-3 py-2 min-h-11 aria-selected:bg-acid`; keyboard: ↑ ↓ Enter Esc. Option shows small avatar (`imageUrl` if provided, else initials), name, type hint.

### Cards (`Card`)
- Default: `bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5`
- Interactive: add `hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition cursor-pointer`
- Selected/approved: add `ring-4 ring-acid` and show `Check` badge top-right
- Quota/cap/outdated variants: add `border-dashed` and `opacity-90` on the image stage only
- **ProductCard** anatomy: `Card` with `flex flex-col gap-3`, header row `flex items-center justify-between`, `ImageStage` below, then text blocks. `Tape` decoration (`absolute -top-3 left-6 rotate-[-4deg] h-6 w-20 bg-amber/80 border border-ink/30`) on `hero` cards only.

### Badges and Chips (`Chip`)
Base: `inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-1 font-mono text-xs uppercase tracking-wide shadow-hard-sm`
| Variant | Classes |
|---|---|
| Role HERO | `bg-tomato text-ink` |
| Role CORE | `bg-paper text-ink` |
| Role LIMITED | `bg-acid text-ink` |
| Category | `bg-paper-3 text-ink` |
| Qloo evidence (tag/brand/entity) | `bg-cobalt text-white border-cobalt shadow-none` + leading `←` |
| Estimated | `bg-amber text-ink border-dashed` |
| Path A | `bg-leaf text-white` |
| Path B | `bg-amber text-ink` |
| Tweak chip | `bg-paper text-ink normal-case tracking-normal font-sans font-medium hover:bg-acid` (button) |
| Taste chip (removable) | `bg-paper text-ink` + × `icon-only` 24 px target inside chip (44 px hit-area via padding) |
Estimated chips additionally carry `title`/tooltip "Estimated by AI — not returned by Qloo".

### Score Ring (`ScoreRing`)
SVG 44×44, track `stroke-ink/15`, value arc `stroke-ink`, 5 px stroke, centre number `font-display text-sm`. `role="img" aria-label="Fit score 82 out of 100"`.

### Image Stage (`ImageStage`)
`relative aspect-square w-full border-2 border-ink rounded-sm bg-paper overflow-hidden`
- **Sketch state:** `Silhouette` centered (fill = first palette colour, stroke ink 2.5 px), caption pill bottom-left `Concept sketch — no image yet` (`bg-paper/90 text-xs font-mono px-2 py-1 border border-ink`).
- **Generating:** `Skeleton` pulse + centered mono text `Generating… 7s`; at 40 s adds line `Taking longer than usual`.
- **Ready:** `<img>` `object-cover` fade-in 200 ms; caption pill `AI concept image — not a final design`; click opens ImageLightbox.
- **Failed:** `bg-[#FFF1EE]` + `AlertCircle` + message.
- **Quota/cap:** sketch + amber banner across bottom: message from `03-APP-FLOW.md`.
- **Outdated:** image `opacity-50` + `Outdated` chip top-left.
- `alt` text = `"AI concept image: " + first 100 chars of approved description`; sketch is `aria-hidden` with caption as text.

### Description block
`bg-paper rounded-sm border-2 border-ink/80 p-3 text-sm text-ink-2 leading-relaxed` with label `What it looks like` (Label style) and version chip `v2`. Editing state swaps in `Textarea` + counter + Save/Cancel.

### Navigation
- Header: `sticky top-0 z-40 bg-paper/95 backdrop-blur border-b-2 border-ink`, height 56 px; logo = `font-display text-xl` with acid underline block; links `font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4`.
- `PoweredByQloo`: `inline-flex items-center gap-2 font-mono text-xs border-2 border-ink px-2 py-1 bg-paper` + text "Powered by Qloo"; link `rel="noopener noreferrer" target="_blank"`.
- **Stepper:** sticky below header; each step `font-mono text-xs uppercase px-3 py-2 border-2 border-ink` — done `bg-acid`, current `bg-ink text-paper`, upcoming `bg-paper text-mute`; wraps into horizontally scrollable row on mobile.

### Agent Thinking Panel
`bg-ink text-paper rounded-md border-2 border-ink shadow-hard p-4 font-mono text-[13px] leading-5 max-h-80 overflow-auto`
- Rows: step `text-acid`, tool_call `text-paper` prefixed `→`, tool_result `text-paper/70` prefixed `✓`/`∅`, note `text-amber`.
- Header row: `AGENT` label + mode chip (`LLM agent` acid / `Fallback: fixed steps` amber).
- Cursor blink: `after:content-['▍'] animate-pulse` on the last running row.

### Modal / Drawer
- Backdrop: `fixed inset-0 bg-ink/50`
- Modal: `fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,32rem)] bg-paper border-2 border-ink shadow-hard-lg rounded-md p-5` with `role="dialog" aria-modal="true" aria-labelledby`
- Drawer: right side `fixed right-0 top-0 h-full w-[min(100vw,28rem)] bg-paper border-l-2 border-ink shadow-soft p-5 overflow-auto`; on `<768px` becomes bottom sheet `inset-x-0 bottom-0 max-h-[85vh] rounded-t-md border-t-2`.
- ComparePanel: same drawer, width `min(100vw,56rem)`.
- Esc closes; focus trap; scroll lock on `body`.

### Toast (`ToastHost`)
```
fixed bottom-4 right-4 md:right-6 z-50 flex flex-col gap-2 max-md:left-4 max-md:right-4
toast: bg-paper border-2 border-ink shadow-hard rounded-sm px-4 py-3 text-sm flex items-start gap-3 w-full md:w-96
```
Left accent bar 6 px: success `bg-leaf`, error `bg-tomato-deep`, info `bg-cobalt`. Container `role="status" aria-live="polite"` (errors use `role="alert"`). Action link (e.g. Undo) is a `ghost` button.

### Skeletons
```
Base:  animate-pulse bg-paper-3 rounded-sm
Chip skeleton:  h-8 w-24 rounded-full bg-paper-3 animate-pulse
Product card skeleton: Card with [h-5 w-24] row, [aspect-square w-full], [h-5 w-3/4], [h-4 w-full] ×3, [h-10 w-full]
```

### Empty state
```
flex flex-col items-center text-center py-12 px-4 border-2 border-dashed border-ink rounded-md bg-paper-2
icon in h-12 w-12 rounded-full bg-acid border-2 border-ink; title font-display uppercase text-lg; body text-sm text-ink-2 max-w-sm; CTA secondary button
```

### Silhouette (`components/mockups/Silhouette.tsx`)
Props: `kind: 'cap'|'top'|'socks'|'tote'|'flat'|'round'|'cassette'|'mug'|'bottle'|'bag'|'can'|'bandana'|'cards'`, `colors: string[]`. 13 simple flat SVGs on a `viewBox="0 0 200 200"`: body fill `colors[0]`, accent shape fill `colors[1]`, outline `#14110F` 3 px, no text. Used as the pre-approval sketch and the fallback when images are unavailable. Colours come from the selected palette's `hex` array.

### Sticker / Tape decorations
`Sticker`: `inline-block rotate-[-6deg] bg-acid border-2 border-ink px-3 py-1 font-display uppercase text-sm shadow-hard-sm` (e.g. "Free to try"). `Tape`: see ProductCard. Decorative only: `aria-hidden="true"`. Use at most 3 decorations per screen.

---

## Layout Specs

### Landing
- Hero: grid `md:grid-cols-[1.1fr_0.9fr] gap-8 items-start`; left = H1 + sub + example chips; right = `HeroInput` card rotated `md:rotate-[0.6deg]` (rotation removed on focus-within for readability).
- Explainer strip: 3 cards `grid md:grid-cols-3 gap-4`.

### Studio
- Container `max-w-6xl`; Stepper sticky `top-14`; sections spaced `space-y-14`.
- Taste section: `grid lg:grid-cols-12 gap-6` (panel `lg:col-span-5`, profile `lg:col-span-7`).
- Collection grid: `grid gap-6 md:grid-cols-2 xl:grid-cols-3`.
- Partners & Plan: `grid lg:grid-cols-2 gap-6`.

### Responsive breakpoints
| Breakpoint | Behaviour |
|---|---|
| < 640 px | Single column; Stepper scrolls horizontally; drawers become bottom sheets; buttons full-width inside cards |
| 640–767 px | Single column, wider cards |
| ≥ 768 px (`md`) | 2-column collection; side drawers; header links visible |
| ≥ 1024 px (`lg`) | Taste section 2 columns; Partners & Plan 2 columns |
| ≥ 1280 px (`xl`) | 3-column collection |
Mobile must work at **375 px** wide with no horizontal scroll and 44 px touch targets.

---

## Animation Specs

| Interaction | Animation | Duration | Easing |
|---|---|---|---|
| Button hover/press | translate ∓2 px + shadow swap | 150 ms | ease-out |
| Card enter (new/replacement) | opacity 0→1, translateY 8→0 | 250 ms | ease-out |
| Image reveal | opacity 0→1 | 200 ms | ease |
| Chip add/remove | scale 0.9↔1 + opacity | 150 ms | ease |
| Drawer open/close | translateX 24→0 + fade | 200 / 150 ms | ease-out / ease-in |
| Modal open | fade + scale 0.98→1 | 200 ms | ease-out |
| Toast in/out | translateY 8→0 + fade | 200 ms / 150 ms | ease-out |
| Agent row append | opacity 0→1 | 120 ms | linear |
| Score ring fill | stroke-dashoffset | 600 ms | ease-out |
All animations are disabled under `prefers-reduced-motion` (see CSS above). No parallax, no autoplay motion beyond skeleton pulse and the blinking cursor.

---

## Accessibility Rules (target WCAG 2.2 AA)

- Text contrast ≥ 4.5:1 (≥ 3:1 for large text/icons). Tomato and amber are **backgrounds with ink text only**.
- Focus: visible `outline 3px cobalt` on every interactive element; never removed.
- Keyboard: all actions reachable; Esc closes overlays; Autocomplete supports arrows/Enter/Esc; Stepper items are links.
- Landmarks: `<header>`, `<main id="main">`, `<footer>`; "Skip to content" link first in DOM.
- Headings: one `h1` per page, sequential levels.
- Live regions: Agent panel list `aria-live="polite"`; toasts `role="status"` / `role="alert"`; image-ready announced via toast.
- Images: generated images have descriptive `alt`; sketches are decorative with visible caption text.
- Forms: every input has a visible `<label>`; errors tied with `aria-describedby`; `aria-invalid` on failure.
- Don't rely on colour alone: role/status badges always include text; success/error icons accompany colour.
- Motion: reduced-motion respected.
- Touch targets ≥ 44×44 px.
- Language: `<html lang="en">`.

---

## Microcopy Guide

| Moment | Copy |
|---|---|
| Hero H1 | "Your fans deserve better than a black tee." |
| Primary CTA | "Build my merch line →" |
| Agent start | "Reading your fans' taste…" |
| Agent not found | "Not found in Qloo — trying genre and interest tags" |
| Profile footnote | "Affinity = how strongly this audience gravitates toward something. It is not purchase data." |
| Before image | "Here's what it would look like. Happy with it? Approve to generate an image." |
| Approve button | "Approve & generate image" |
| Generating | "Generating… 7s" |
| After image | "AI concept image — not a final design" |
| Quota | "Free image quota used for today — your description and sketch are kept." |
| Estimate | "Estimate — get supplier quotes before you order" |
| Compare button | "Why not just ask ChatGPT?" |
| Compliance | "Check food/alcohol labelling rules before selling." |
Tone: friendly, direct, a little cheeky; never hypey; never claims certainty about sales.

---

## Component → Spec Cross-reference

| Component (`components/…`) | Spec section here | Screen spec |
|---|---|---|
| `ui/Button`, `ui/Chip`, `ui/Card`, `ui/Input`, `ui/Select`, `ui/Textarea` | Component Library | all |
| `ui/Skeleton`, `ui/Modal`, `ui/Drawer`, `ui/Tooltip`, `ui/Toast`, `ui/ScoreRing`, `ui/Sticker`, `ui/Tape` | Component Library | `03-APP-FLOW.md` |
| `landing/*` | Inputs, Autocomplete, Layout → Landing | `/` |
| `studio/AgentThinkingPanel` | Agent Thinking Panel | `/studio` §2 |
| `studio/TasteProfileCard`, `TasteChips` | Badges and Chips | `/studio` §2 |
| `studio/ProductCard`, `ImageStage`, `DescriptionEditor`, `ApprovalBar`, `WhyPopover`, `NumbersDrawer` | Cards, Image Stage, Description block, Modal/Drawer | `/studio` §3 |
| `studio/CollabRadar`, `DropTimeline`, `ComparePanel`, `ExportBar` | Cards, Drawer, Button | `/studio` §4–5 |
| `mockups/Silhouette` | Silhouette | ProductCard |
| `print/LineSheet` | Typography, `@media print` | `/line-sheet` |
