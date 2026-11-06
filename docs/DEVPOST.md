# Devpost submission copy

Repository: https://github.com/Kanishkp19/merch_desk

Live demo URL: **paste the actual deployed Render URL into Devpost after testing**.
This file is preparation copy; it is not evidence that a submission was made.

## Project name

MerchDesk

## Tagline

A Qloo-powered agent that turns audience taste into a musician's first merch drop.

## Inspiration

Independent musicians often know their fans but have little help translating
that knowledge into a merch assortment. Generic product lists leave them to
guess what fits their audience and how much money they could tie up in stock.
We built MerchDesk to connect cultural taste research with a concrete launch plan,
starting with an India pilot.

## What it does

Describe your fans, add reference artists, and select a city. MerchDesk researches
the audience's cultural affinities with Qloo, then recommends products with
visible supporting evidence. Review and edit a product description before
generating its concept image. Compare the result with a generic LLM suggestion,
replace a product, and export a line sheet.

Move a focused assortment into a 1–3 product launch. Adjust quantities, costs and
your own sales assumptions to compare upfront cash, break-even and unsold stock.
Export the brief or submit a quote request for manual coordination. Supplier
acceptance, production and payments are not automated.

## How we built it and why Qloo matters

An LLM agent selects tools for Qloo entity search, tag search, taste analysis and
cross-domain insights. Tool memory tracks returned entities and tags so later
calls can use grounded identifiers. A scripted fallback can continue research
when the text provider is unavailable.

Qloo's cultural affinities feed a deterministic scoring layer that matches the
profile to a catalog of makeable products. Each recommendation carries evidence
for inspection. Product replacement attempts another Qloo query excluding
rejected taste signals before selecting a new catalog item. The generic
comparison uses an LLM without the Qloo profile, making the difference visible
for the same brief; it is an illustration, not a measured superiority claim.

Qloo supplies cultural affinity, not purchasing intent or a sales forecast.
Economics are calculated in TypeScript from explicit planning assumptions.
India venue suggestions are separately sourced research leads, not claimed Qloo
affinities or confirmed partnerships. AI images are concepts, not production proofs.

Built with Next.js, React, TypeScript, Tailwind CSS, Zod, Prisma/SQLite, Qloo,
Groq and Cloudflare Workers AI. Source code is MIT licensed.

## Challenges

Taste data does not map directly to manufacturing decisions. We needed to keep
Qloo evidence, stated interests and planning assumptions distinguishable, handle
sparse matches honestly, and make API failures recoverable. We also separated
creator approval of an image description from generation, and quote acceptance
from production authorization.

## Accomplishments and what we learned

The working journey connects research, evidence-backed product selection,
approval-based image generation, exports and launch economics. Building it made
the distinction between cultural affinity and demand explicit: taste can guide
a proposal, while actual sales, sourcing and willingness to pay require validation.

## What's next

Validate the workflow with independent musicians and obtain written supplier
quotes. Expand catalog coverage using that feedback and improve relevance on
sparse briefs. Add durable hosted storage before using the free demo for real
quote operations.

## Judge walkthrough

1. Describe a Bengaluru ambient electronic producer whose fans enjoy analog
   photography, gig posters and filter coffee; add Tycho as a reference artist.
2. Inspect the taste profile and its Qloo evidence, then build the collection.
3. Review a recommendation's explanation and compare with generic AI suggestions.
4. Approve one description, generate its concept image, and export the line sheet.
5. Build a small launch and change quantities to inspect the economics.

Demo note: the free host may need about a minute to wake. Submitted demo quote
requests reset when the server restarts; export the brief for your own copy.
