# MerchDesk end-to-end run: Mira Vale

Run date: 29 October 2026. Live local app at `http://localhost:3000`. API flow exercised from search/status through profile, collection, partners, comparison, and approved image generation. The browser UI was not automated.

## Supplied creator data

- Name: Mira Vale (fictional creator)
- Genre/niche: ambient electronic and downtempo music for late-night city walks
- Similar sounds: Tycho, Bonobo
- City: Bengaluru
- Audience interests: atmospheric live shows, analog photography, independent coffee shops, design objects, sustainable fashion
- Creator type: musician; budget: medium

## Audience research output

- Mode: live Qloo; 8 Qloo calls; llm_agent; path B_description.
- Top returned tags: Ambient Electronic, Downtempo, Photography studio, ambience, digital ambience, ambient noise, Downtempo, ambient noises.
- Inferred price tier: budget; palette: chrome-y2k.
- Returned brand affinities (LLM-estimated classification): The SETI Institute, Mozilla Corporation, Brave Software, Product Hunt, Izotope, Blue Sky, Signal, Airtable, Singularity University, Stripe.
- Cross-domain findings: The Smack, Watchlist, The Best Horror of the Year, Volume Ten, The Cannibal's Guide to Ethical Living, Twisted Romance, Vol. 1.
- Inspiration places: 0.
- These are predicted taste affinities and venue candidates, not identified individual people or verified customers.

## Product collection

- Description source: llm. Total estimated first-run cost: 1832 in the app’s displayed currency units.
- Fit score is the app’s own 0–100 score, not a measured sales forecast.

### Heavyweight Crewneck — hero

- ID: `hero-crewneck`; category: apparel; fit: 0/100.
- One-liner: Lush fleece with hypnotic electronic accents
- Description: This thick, twelve-ounce fleece crewneck features a soft black base with a subtle silver herringbone texture. A small, abstract electronic waveform motif in baby blue and magenta is embroidered on the chest, creating a hypnotic focal point. The oversized fit and premium feel evoke high-end streetwear, while the muted palette ensures timeless versatility for seasonal layering.
- Price: 58; estimated first-run cost: 568; minimum run: 24.
- Evidence: none.

### Embroidered Patch Set — core

- ID: `patch-set`; category: objects; fit: 12/100.
- One-liner: Punk-inspired hip-hop textures on iron-on patches
- Description: Two square patches display rugged, high-density embroidery on a black canvas base. One features a jagged silver soundwave, while the other shows a magenta and baby blue geometric hiphop symbol. The merrowed edges provide a durable, workwear aesthetic, and the tactile thread creates a distinct, punk-inspired texture that complements jackets and denim with industrial grit.
- Price: 8; estimated first-run cost: 140; minimum run: 50.
- Evidence: cross_domain=horror.

### Printed Bandana — core

- ID: `bandana`; category: apparel; fit: 25/100.
- One-liner: Hypnotic electronic patterns in vibrant festival colors
- Description: A square cotton bandana displays a seamless, all-over print of concentric silver and baby blue circles. Interspersed with sharp magenta lines, the design mimics a hypnotic electronic rhythm. The black background grounds the vibrant palette, creating a striking visual impact suitable for festival wear or street style, blending vintage folk shapes with modern digital energy.
- Price: 12; estimated first-run cost: 156; minimum run: 36.
- Evidence: tag=hiphop.

### Cassette-Style USB — core

- ID: `cassette-usb`; category: objects; fit: 25/100.
- One-liner: Retro cassette drive with neon electronic motifs
- Description: This USB drive mimics a vintage cassette shape with a matte black plastic shell. The front label features a glowing silver and baby blue frequency wave, accented by a single magenta dot. The design evokes a hypnotic, analog-digital fusion, offering a nostalgic collectible that bridges classic hiphop media with modern electronic music storage in a sleek, tactile form.
- Price: 18; estimated first-run cost: 280; minimum run: 50.
- Evidence: tag=electronic.

### Heavyweight Tee — limited

- ID: `heavyweight-tee`; category: apparel; fit: 12/100.
- One-liner: Streetwear staple with hypnotic screen-printed waves
- Description: A sturdy, mid-weight cotton tee in deep black features a bold, two-color screen print on the chest. The design consists of overlapping silver and magenta soundwaves, creating a hypnotic, electronic visual effect. A small baby blue geometric detail appears on the back collar, adding subtle hiphop-inspired styling to the minimalist streetwear silhouette for everyday durability.
- Price: 28; estimated first-run cost: 318; minimum run: 36.
- Evidence: cross_domain=horror.

### Playing Card Deck — core

- ID: `playing-cards`; category: objects; fit: 12/100.
- One-liner: Hypnotic card art with neon electronic themes
- Description: This poker-sized deck features a custom back design of swirling silver and baby blue lines on a black background, evoking hypnotic electronic frequencies. The four face cards replace traditional figures with abstract magenta and silver hiphop-inspired geometric shapes. The tuck box matches the deck’s vibrant, futuristic aesthetic, making it a collectible art piece for card enthusiasts and music fans.
- Price: 12; estimated first-run cost: 265; minimum run: 50.
- Evidence: brand=publishing, brand=publishing.

### Art Print Poster — core

- ID: `poster-print`; category: print; fit: 12/100.
- One-liner: Hypnotic electronic art on matte paper
- Description: This large-format poster displays a monochromatic black background with a central, hypnotic burst of silver and baby blue light rays. A single magenta accent line cuts through the composition, adding dynamic tension. The matte finish enhances the depth of the colors, creating a cinematic, vintage-inspired visual that captures the essence of electronic music in a minimalist, gallery-ready format.
- Price: 10; estimated first-run cost: 105; minimum run: 50.
- Evidence: brand=publishing, brand=publishing.

## Generated image

- Approved image: `concept-hero-crewneck.jpg` (1024×1024 JPEG, 502,358 bytes).
- Product: Heavyweight Crewneck; image provider: @cf/black-forest-labs/flux-1-schnell.
- Visual assessment: a clear black crewneck mockup with a small blue/magenta wave motif. The tiny neck label contains lettering despite the prompt requesting no text.

## Local partner candidates

- Sheraton Grand Bangalore Hotel at Brigade Gateway: Co-release with Sheraton Grand Bangalore Hotel at Brigade Gateway — their crowd already leans toward Air conditioned. (linked products: none)
- Mantri Square Mall: Co-release with Mantri Square Mall — their crowd already leans toward Wheelchair accessible restroom. (linked products: none)
- Tharuni PG for Gents: Co-release with Tharuni PG for Gents — their crowd already leans toward Guest house. (linked products: none)
- Rotti Walla: Co-branded heavyweight-tees featuring authentic Rotti patterns, sold alongside their Indian meals. (linked products: none)
- Ideal Recreational Club: Co-release with Ideal Recreational Club — their crowd already leans toward Club. (linked products: none)
- eLitmus Evaluation Private Limited: Co-release with eLitmus Evaluation Private Limited — their crowd already leans toward Training centre. (linked products: none)

## Drop plan

- Week 0 (core): patch-set, bandana, cassette-usb, playing-cards, poster-print.
- Week 2 (hero): hero-crewneck.
- Week 5 (limited): heavyweight-tee.

## Checks and assessment

- Home and status: HTTP 200; live Qloo, Groq text provider, image provider available.
- Artist search: Tycho returned as a Qloo artist.
- Profile: HTTP 200; collection: HTTP 200; partners: HTTP 200; image: HTTP 200.
- Image approval guard: HTTP 422 when `approved` was false; this is expected.
- Generic comparison: HTTP 503, LLM_UNAVAILABLE; Groq reported a transient 429. No retry was made.
- Quality: the hero crewneck scored 0/100 with no evidence. Several product concepts cite hiphop or horror despite an ambient electronic brief.
- Confirmed mapping cause: substring matching maps “Photography studio” to hiphop because “Photography” contains “rap”.
- Quality: partner results include a hotel, mall, men’s PG, and evaluation firm. None linked to a product; they are weak recommendations for this brief.
- Conclusion: the workflow functions through image creation, but the research-to-recommendation quality needs correction before these outputs should guide a real merchandise launch.

## Raw outputs

- `input.json`, `profile.json`, `collection.json`, `collabs.json`, `compare.json`, `image-result.json`, `image-gate.json`.
