# Pilot validation checklist (real world)

What the software **cannot** prove, and what to check outside it. Passing tests, clean builds and a
smooth demo demonstrate only that the code behaves as written — they are **not** evidence of
customer demand, supplier reliability, or willingness to pay. Those need conversations and paper
trails with real people.

## A. Supplier quotes (validates supplier reliability — software never can)

- [ ] Obtain **at least 2 written quotes** per product from real suppliers (WhatsApp/e-mail counts
      if it states price, MOQ, lead time and validity).
- [ ] Compare each written quote against the MerchDesk estimate shown to the creator. Record the
      gap; estimates are marked "unconfirmed" until a written quote is recorded.
- [ ] Confirm what is excluded (GST treatment, shipping, printing plates/setup, packaging) and
      record it in the quote's "excludes" field.
- [ ] Validate one lead-time claim: order one sample and measure quoted vs actual days.
- [ ] Confirm the supplier accepts the creator (not a company) as a customer, and what ID/KYC they
      need.

## B. Musician usability (validates the journey, not demand)

- [ ] Watch **3 musicians** complete brief → assortment → economics → submission unaided on a
      phone. Note where they hesitate, and any label they misread.
- [ ] Ask each to explain break-even, upfront cash and "capital tied in unsold stock" back to you
      in their own words. If they can't, the labels need work — not the user.
- [ ] Verify each creator saved their creator key and can re-open their request on another device
      using it (and that recovery via the operator works when they don't).
- [ ] Confirm every unknown cost was visible as "not confirmed" at decision time — no one decided
      against a silently zero-filled cost.

## C. Willingness to pay (validates the commercial assumption)

- [ ] After the walkthrough, state the ₹2,500 planning fee plainly and ask for a decision — not an
      opinion. Record yes / no / "at ₹X".
- [ ] Log every price reaction in `docs/ASSUMPTIONS.md` unresolved item #1; repricing is expected.
- [ ] Do **not** count compliments ("nice product") as demand signals. A paid pilot or a signed
      go-ahead is the only countable signal.
- [ ] Track time-to-first-written-quote per creator; if coordination cost exceeds the fee, the
      model needs rework regardless of what creators say.

## D. Honesty checks (must stay true at all times)

- [ ] No screen, export or message implies a supplier has accepted, a delivery date is guaranteed,
      or demand is forecast. Scenario numbers are the creator's own guess, bounded — never
      predictions.
- [ ] Sample approval, quote acceptance and production authorization remain separate recorded
      decisions; accepting a quote never starts production.
