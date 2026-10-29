# India pilot: Bengaluru and Mumbai

**29 October 2026 update — widened from 2 to 7 cities.** The pilot now covers Bengaluru, Mumbai, Delhi NCR, Pune, Hyderabad, Chennai and Kolkata. Each new city has two curated venues whose official pages were verified on this date ([Kunzum Books](https://kunzum.com/), [The Piano Man](https://www.thepianoman.in/), [Pagdandi](https://pagdandi.org/), [Goethe-Institut/Max Mueller Bhavan Pune](https://www.goethe.de/ins/in/en/spr/kur.html), [Lamakaan](https://digital.lamakaan.com/), [Roastery Coffee House](https://roasterycoffee.co.in/cafe-locations-2), [Higginbothams](https://www.higginbothams.co.in/), [The Music Academy Madras](https://musicacademymadras.in/), [Starmark](https://www.starmark.in/), [Kolkata Centre for Creativity](https://www.kolkatacentreforcreativity.org/)). A venue link only establishes location and format — no outreach, availability or willingness to partner is verified.

Other widening changes: Indian cultural wording (Bollywood/regional cinema, gully rap, carnatic/sufi/bhangra, street food, desi pop) now maps onto the existing canonical tags; retail prices carry an **indicative GST figure by category** (5%/12% apparel by price, 0% printed zines, 18% other goods — confirm HSN-specific rates with a CA before invoicing); the drop plan adds a month-based season note (festive season, monsoon, December gig season).

## Pricing evidence (29 October 2026)

All app prices remain **illustrative INR estimates**, not supplier quotations. They exclude tax treatment, delivery, design revisions and platform fees unless a supplier confirms otherwise. Retail prices and margins have not been validated by sales data.

| Product | Public price anchor | Match to pilot specification |
| --- | --- | --- |
| Printed tee | [Printo bulk round-neck tee](https://printo.in/apparel): about ₹430 each at 30 pieces; [bulk listing](https://printo.in/categories/bulk-printing-service): about ₹385 at 100 | Not the same heavyweight blank, artwork, print placement or 36-piece run. Pilot cost floor raised to ₹380. |
| Canvas tote | [Printo bulk tote](https://printo.in/categories/tote-bag/customizable-products/bulk-tote-bags): about ₹218 each at 100 | Pilot run is 36; fabric and print may differ. Pilot cost floor raised to ₹200. |
| Sticker pack | [Printo custom stickers](https://printo.in/categories/stickers-and-labels): listings around ₹13–₹16 per sticker at small quantities | Pilot pack has three designs. Cost range raised to ₹40–₹75 per pack; exact die cut specification needs a quote. |
| Zine/booklet | [Printo bulk booklets](https://printo.in/categories/bulk-printing-service): about ₹93 each at 400 | Pilot run is 50, with unspecified paper and pages. Cost range raised to ₹110–₹200; quote required. |
| Poster | [Printo bulk posters](https://printo.in/categories/bulk-printing-service): about ₹36 each at 25 | Pilot range ₹40–₹90 at 50 remains a planning estimate; paper and size need confirmation. |
| Cap | [Printo embroidered caps](https://printo.in/categories/caps): about ₹204 each at 50 | Pilot corduroy cap has a 24-piece run; the ₹250–₹400 estimate is a planning allowance. |
| Mug | [Printo bulk mugs](https://printo.in/categories/bulk-printing-service): about ₹240 each at 50 | Pilot enamel-coated steel mug differs from the listing. ₹240–₹380 is a placeholder pending a matching quote. |

The other pilot products have no sufficiently comparable public specification and remain unvalidated placeholders. Before taking orders, obtain written quotes for each selected item in both cities, including minimum run, materials, print method, setup, tax, shipping and lead time.

## Venue outreach status

The [curated venue list](../src/lib/partners/india.ts) links official pages. A listed venue is only a possible outreach target. No partnership, audience overlap, stock availability or event slot has been verified. No venue has been contacted.

Suggested first message after a creator chooses a venue:

> Subject: Small creator merch collaboration idea for [venue]
>
> Hello [venue team], I'm [creator] in [city]. My audience is interested in [specific interest]. I have a small [product or event] idea that might fit your [bookshop, coffee or music] programming. Could I send a one-page concept and discuss whether you accept guest launches or merch tables? No obligation. Thank you, [name and contact].

## Quality acceptance before launch

- Review at least 12 India-specific briefs covering both cities and at least four creator niches. Log top products, explicit evidence, first-run totals and sourced venue ideas. (The city coverage is now 7 — add briefs for the new cities before treating them as validated.)
- Any product recommendation should have a fit score of at least 30 and an evidence link; thin briefs should return no confident recommendation.
- A venue idea must be in the selected city, have an official source link and match at least one stated interest. Treat every idea as unconfirmed.
- Verify one live browser journey in each city and the one-page A4 line sheet; review generated images for invented text before external use.

## Review outcome

The 12 India briefs passed a controlled, explicit-interest scoring gate across both cities. This checks deterministic rules and curated venues, not Qloo availability or overall real-world taste quality. Live browser journeys in both Bengaluru and Mumbai completed through a one-page A4 PDF. A separate live Mumbai API run fell back when Qloo/LLM research was unavailable; its explicit brief tags still produced a collection. The initial live Mumbai comics run included weak generic recommendations and broad venue matches; the pilot now uses a 30-point fit floor, evidence-led hero selection and venue anchor interests. The live result has not been re-run after those ranking changes.

The first Mumbai tote image was blank. A revised prompt produced a comic-panel tote concept at `artifacts/india-pilot/comic-tote.jpg`, but the model still invented tiny label lettering. The UI and line sheet now tell creators to inspect text before printing. These images remain visual concepts, not production artwork.
