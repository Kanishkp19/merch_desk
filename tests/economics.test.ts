import { describe, expect, it } from 'vitest'
import { computeLaunchEconomics, formatPaise, rupeesToPaise } from '@/lib/economics/engine'
import type { LaunchEconomicsInput } from '@/lib/economics/schema'

const line = (over: Partial<LaunchEconomicsInput['lines'][number]> = {}) => ({
  productId: 'tote-bag',
  name: 'Tote bag',
  included: true,
  quantityOrdered: 50,
  sellPrice: rupeesToPaise(500),
  unitCost: { known: true, amount: rupeesToPaise(250) },
  setupCost: { known: true, amount: rupeesToPaise(800) },
  expectedSold: 40,
  gstRatePct: 18,
  artworkReady: true,
  ...over,
})

const input = (over: Partial<LaunchEconomicsInput> = {}): LaunchEconomicsInput => ({
  lines: [line()],
  pricesIncludeGst: true,
  sampling: { known: true, amount: rupeesToPaise(500) },
  inboundFreight: { known: true, amount: rupeesToPaise(300) },
  packagingPerUnit: { known: true, amount: rupeesToPaise(20) },
  customerShippingPerUnit: 0,
  outboundShippingPerUnit: { known: true, amount: rupeesToPaise(60) },
  paymentFeePct: 2,
  planningFee: { known: true, amount: rupeesToPaise(2500) },
  defectRatePct: 2,
  ...over,
})

describe('computeLaunchEconomics', () => {
  it('counts the full batch inventory purchase in upfront cash, even if few units sell', () => {
    const r = computeLaunchEconomics(input())
    // 50 × ₹250 + 800 setup + 500 sampling + 300 freight + 2500 fee
    expect(r.upfrontCash).toBe(rupeesToPaise(12500 + 800 + 500 + 300 + 2500))
    expect(r.upfrontCashComplete).toBe(true)
  })

  it('models low sales: unsold stock, capital tied up, and the honest cash outcome', () => {
    const r = computeLaunchEconomics(input())
    const c = r.perScenario.conservative
    // 40 expected × 0.6 = 24 sold
    expect(c.unitsSold).toBe(24)
    expect(c.unsoldUnits).toBe(26)
    expect(c.capitalTiedInUnsold).toBe(26 * rupeesToPaise(250))
    // batch expensed in full even though 26 units sit unsold
    expect(c.finalProfit).toBeLessThan(c.profitIfAllSell)
  })

  it('net revenue strips GST from an inclusive price and remits it separately', () => {
    const r = computeLaunchEconomics(input({ pricesIncludeGst: true }))
    const l = r.lines[0]
    // ₹500 incl. 18% GST → ex-GST ₹423.73, GST ₹76.27
    expect(l.netPricePerUnit).toBe(rupeesToPaise(500) - 7627)
    expect(l.gstPerUnit).toBe(7627)
    const excl = computeLaunchEconomics(input({ pricesIncludeGst: false }))
    expect(excl.lines[0].netPricePerUnit).toBe(rupeesToPaise(500))
    expect(excl.lines[0].gstPerUnit).toBe(9000)
  })

  it('computes contribution with payment fees, net shipping and defect allowance', () => {
    const r = computeLaunchEconomics(input({ pricesIncludeGst: false }))
    const l = r.lines[0]
    // net price 50000 − shipping (60+20) − 2% fee on 50000
    const expectedContributionPerUnit = 50000 - 8000 - 1000
    expect(l.contributionPerUnit).toBe(expectedContributionPerUnit)
    const b = r.perScenario.base
    // 40 sold × 41000 − 2% defect on 1250000 inventory
    expect(b.contribution).toBe(40 * expectedContributionPerUnit - 25000)
  })

  it('break-even recovers fixed costs, batch inventory AND the defect allowance in one ceil', () => {
    const r = computeLaunchEconomics(input({ pricesIncludeGst: false }))
    const b = r.perScenario.base
    // required = fixed 410000 + inventory 1250000 + 2% defect on inventory (25000) = 1685000
    expect(b.requiredCostsToRecover).toBe(410000 + 1250000 + 25000)
    // 1685000 / 41000 = 41.09… → 42 whole units, single ceil (never 41 + 1 from split rounding)
    expect(b.breakEvenUnits).toBe(42)
    // consistent with the profit calculation: contribution at break-even covers all modeled costs
    expect(42 * 41000 - 25000 - 410000 - 1250000).toBeGreaterThanOrEqual(0)
    expect(41 * 41000 - 25000 - 410000 - 1250000).toBeLessThan(0)
    expect(b.breakEvenReachableInBatch).toBe(true)
  })

  it('rounds fractional break-even once over all costs, not per cost bucket', () => {
    // contribution per unit here is ₹10 (unit cost is recovered via the inventory
    // bucket, not per-unit). Both required/weighted buckets are fractional, so the
    // old per-bucket ceil answered 1 + 1000 = 1001; the correct single ceil is 1000.
    const r = computeLaunchEconomics(
      input({
        pricesIncludeGst: false,
        paymentFeePct: 0,
        packagingPerUnit: { known: true, amount: 0 },
        outboundShippingPerUnit: { known: true, amount: 0 },
        sampling: { known: true, amount: 0 },
        inboundFreight: { known: true, amount: 0 },
        planningFee: { known: true, amount: 0 },
        defectRatePct: 0,
        lines: [line({ quantityOrdered: 1, sellPrice: rupeesToPaise(10), unitCost: { known: true, amount: 999005 }, setupCost: { known: true, amount: 25 }, expectedSold: 1 })],
      })
    )
    const b = r.perScenario.base
    // contribution per unit = 1000 paise; required = 25 fixed + 999005 inventory = 999030
    expect(b.requiredCostsToRecover).toBe(999030)
    // ceil(999030 / 1000) = 1000 — not 1001 from splitting the two buckets
    expect(b.breakEvenUnits).toBe(1000)
  })

  it('uses the same per-product defect rounding for scenario profit, profit-if-all-sell and break-even', () => {
    // Two identical products whose per-line defect allowance rounds UP each
    // (round(1010 × 0.15) = round(151.5) = 152) while an aggregate re-round
    // would round DOWN (round(2020 × 0.15) = 303). The exact totals below
    // distinguish the per-line sum (304) from the aggregate figure (303).
    const twoLines = input({
      pricesIncludeGst: false,
      paymentFeePct: 0,
      packagingPerUnit: { known: true, amount: 0 },
      outboundShippingPerUnit: { known: true, amount: 0 },
      sampling: { known: true, amount: 0 },
      inboundFreight: { known: true, amount: 0 },
      planningFee: { known: true, amount: 0 },
      defectRatePct: 15,
      lines: [
        line({ productId: 'a', name: 'A', quantityOrdered: 1, sellPrice: rupeesToPaise(500), unitCost: { known: true, amount: 1010 }, setupCost: { known: true, amount: 0 }, expectedSold: 1 }),
        line({ productId: 'b', name: 'B', quantityOrdered: 1, sellPrice: rupeesToPaise(500), unitCost: { known: true, amount: 1010 }, setupCost: { known: true, amount: 0 }, expectedSold: 1 }),
      ],
    })
    const r = computeLaunchEconomics(twoLines)
    const b = r.perScenario.base
    // inventory 1010 + 1010 = 2020; per-line defect 152 + 152 = 304 (not 303)
    expect(r.lines.map((l) => l.inventoryCash)).toEqual([1010, 1010])
    // scenario contribution: sold 1 × 50000 per line, minus 152 per line
    expect(b.contribution).toBe(2 * 50000 - 2 * 152)
    // final profit: contribution − 0 fixed − 2020 inventory
    expect(b.finalProfit).toBe(2 * 50000 - 2 * 152 - 2020)
    // profit-if-all-sell uses the same 304, not an aggregate 303
    expect(b.profitIfAllSell).toBe(2 * 50000 - 304 - 2020)
    // break-even covers fixed 0 + inventory 2020 + defect 304 in one ceil
    expect(b.requiredCostsToRecover).toBe(2020 + 304)
    expect(b.breakEvenUnits).toBe(1)
    expect(b.breakEvenReachableInBatch).toBe(true)
  })

  it('labels the combined break-even as approximate only when the mix spans multiple products', () => {
    const single = computeLaunchEconomics(input())
    expect(single.perScenario.base.breakEvenApproximate).toBe(false)

    const mixed = computeLaunchEconomics(
      input({
        lines: [
          line({ productId: 'tote', name: 'Tote', expectedSold: 30 }),
          line({ productId: 'tee', name: 'Tee', quantityOrdered: 36, sellPrice: rupeesToPaise(700), unitCost: { known: true, amount: rupeesToPaise(400) }, setupCost: { known: true, amount: 0 }, expectedSold: 10 }),
        ],
      })
    )
    expect(mixed.perScenario.base.breakEvenApproximate).toBe(true)
  })

  it('keeps mixed-product reachability honest when whole-unit allocations differ from the weighted average', () => {
    // weights 1/3 tote, 2/3 tee. The weighted average would allow a fractional
    // mix; reachability must hold against each product's real stock, in whole
    // units: 30 total units is the most the tote's stock of 10 can carry.
    const r = computeLaunchEconomics(
      input({
        pricesIncludeGst: false,
        lines: [
          line({ productId: 'tote', name: 'Tote', quantityOrdered: 10, sellPrice: rupeesToPaise(500), unitCost: { known: true, amount: rupeesToPaise(250) }, setupCost: { known: true, amount: 0 }, expectedSold: 10 }),
          line({ productId: 'tee', name: 'Tee', quantityOrdered: 100, sellPrice: rupeesToPaise(700), unitCost: { known: true, amount: rupeesToPaise(400) }, setupCost: { known: true, amount: 0 }, expectedSold: 20 }),
        ],
      })
    )
    const b = r.perScenario.base
    expect(r.salesMix.map((m) => m.weight)).toEqual([1 / 3, 2 / 3])
    expect(b.mixFeasibleUnits).toBe(30) // 10 stock ÷ (1/3 weight) — a whole-unit cap, not 30.0000…
    expect(b.breakEvenApproximate).toBe(true)
    expect(b.breakEvenUnits).not.toBeNull()
    expect(b.breakEvenReachableInBatch).toBe(b.breakEvenUnits! <= b.mixFeasibleUnits)
  })

  it('suppresses break-even with an explanation when fixed costs are unknown', () => {
    const r = computeLaunchEconomics(
      input({ sampling: { known: false, amount: 0 }, planningFee: { known: false, amount: 0 } })
    )
    const b = r.perScenario.base
    expect(b.breakEvenUnits).toBeNull()
    expect(b.breakEvenImpossibleReason).toMatch(/fixed costs are incomplete/i)
    expect(b.breakEvenImpossibleReason).toMatch(/sampling/)
    expect(b.breakEvenImpossibleReason).toMatch(/planning fee/)
    const details = r.unconfirmed.map((u) => u.detail).join(' | ')
    expect(details).toMatch(/Sample cost/)
    expect(details).toMatch(/planning fee/i)
  })

  it('suppresses break-even when the creator expects zero sales (no mix to weight with)', () => {
    const r = computeLaunchEconomics(input({ lines: [line({ expectedSold: 0 })] }))
    const b = r.perScenario.base
    expect(b.breakEvenUnits).toBeNull()
    expect(b.breakEvenImpossibleReason).toMatch(/zero sales/i)
  })

  it('flags break-even as unreachable when the assumed mix cannot sell enough within each product’s inventory', () => {
    // mix: 50% tote (stock 10), 50% tee (stock 40) → the mix can sell at most 20 total units
    const r = computeLaunchEconomics(
      input({
        pricesIncludeGst: false,
        lines: [
          line({ productId: 'tote', name: 'Tote', quantityOrdered: 10, sellPrice: rupeesToPaise(500), unitCost: { known: true, amount: rupeesToPaise(250) }, setupCost: { known: true, amount: rupeesToPaise(800) }, expectedSold: 20 }),
          line({ productId: 'tee', name: 'Tee', quantityOrdered: 40, sellPrice: rupeesToPaise(700), unitCost: { known: true, amount: rupeesToPaise(400) }, setupCost: { known: true, amount: rupeesToPaise(800) }, expectedSold: 20 }),
        ],
      })
    )
    const b = r.perScenario.base
    // tote contribution/unit: 50000−8000−1000=41000; tee: 70000−8000−1400=60600; weighted = 50800
    // required = 1600 fixed… (800+800 setup + 500 sampling + 300 freight + 2500 fee = 4900? compute exactly)
    expect(b.breakEvenUnits).not.toBeNull()
    expect(b.breakEvenUnits!).toBeGreaterThan(20)
    expect(b.mixFeasibleUnits).toBe(20) // 10 units ÷ 0.5 weight per tote
    expect(b.breakEvenReachableInBatch).toBe(false)
  })

  it('treats a zero-weight product as no constraint on the mix', () => {
    const r = computeLaunchEconomics(
      input({
        pricesIncludeGst: false,
        lines: [
          line({ productId: 'tote', name: 'Tote', quantityOrdered: 50, expectedSold: 40 }),
          line({ productId: 'tee', name: 'Tee', quantityOrdered: 1, sellPrice: rupeesToPaise(700), unitCost: { known: true, amount: rupeesToPaise(400) }, setupCost: { known: true, amount: 0 }, expectedSold: 0 }),
        ],
      })
    )
    // tee has zero expected sales → weight 0 → it does not cap the mix at 2 units
    expect(r.perScenario.base.breakEvenReachableInBatch).toBe(true)
  })

  it('returns no break-even and explains why when contribution per unit is zero or negative', () => {
    // price exactly covers fees+shipping → zero contribution
    const zero = computeLaunchEconomics(
      input({
        pricesIncludeGst: false,
        paymentFeePct: 0,
        lines: [line({ sellPrice: rupeesToPaise(80) })],
        packagingPerUnit: { known: true, amount: rupeesToPaise(20) },
        outboundShippingPerUnit: { known: true, amount: rupeesToPaise(60) },
        customerShippingPerUnit: 0,
      })
    )
    expect(zero.lines[0].contributionPerUnit).toBe(0)
    expect(zero.perScenario.base.breakEvenUnits).toBeNull()
    expect(zero.perScenario.base.breakEvenImpossibleReason).toMatch(/no finite break-even/i)

    const neg = computeLaunchEconomics(
      input({
        pricesIncludeGst: false,
        lines: [line({ sellPrice: rupeesToPaise(100) })],
        outboundShippingPerUnit: { known: true, amount: rupeesToPaise(150) },
        packagingPerUnit: { known: true, amount: rupeesToPaise(20) },
      })
    )
    expect(neg.lines[0].contributionPerUnit).toBeLessThan(0)
    expect(neg.perScenario.base.breakEvenUnits).toBeNull()
    expect(neg.perScenario.base.breakEvenImpossibleReason).toMatch(/loses money/i)
  })

  it('never treats unknown costs as zero: excludes them and lists unconfirmed items', () => {
    const r = computeLaunchEconomics(
      input({
        lines: [line({ unitCost: { known: false, amount: 0 } })],
        outboundShippingPerUnit: { known: false, amount: 0 },
      })
    )
    expect(r.upfrontCashComplete).toBe(false)
    expect(r.perScenario.base.breakEvenUnits).toBeNull()
    const details = r.unconfirmed.map((u) => u.detail).join(' | ')
    expect(details).toMatch(/Supplier unit cost/)
    expect(details).toMatch(/Outbound shipping/)
    // upfront cash still includes the known fixed costs
    expect(r.upfrontCash).toBe(rupeesToPaise(800 + 500 + 300 + 2500))
    // final profit excludes the unknown inventory spend — visibly incomplete, not zero
    expect(r.lines[0].inventoryCash).toBe(0)
  })

  it('applies scenario multipliers and caps sold units at the ordered quantity', () => {
    const r = computeLaunchEconomics(input({ lines: [line({ expectedSold: 50 })] }))
    expect(r.perScenario.conservative.unitsSold).toBe(30)
    expect(r.perScenario.base.unitsSold).toBe(50)
    expect(r.perScenario.optimistic.unitsSold).toBe(50) // 65 capped at 50 ordered
  })

  it('explains the sales mix behind a multi-product combined break-even', () => {
    const r = computeLaunchEconomics(
      input({
        lines: [
          line({ productId: 'tote-bag', name: 'Tote', expectedSold: 30 }),
          line({ productId: 'tee', name: 'Tee', quantityOrdered: 36, sellPrice: rupeesToPaise(700), unitCost: { known: true, amount: rupeesToPaise(400) }, setupCost: { known: true, amount: 0 }, expectedSold: 10 }),
        ],
      })
    )
    expect(r.salesMix).toHaveLength(2)
    expect(r.salesMix[0].weight).toBeCloseTo(0.75)
    expect(r.salesMix[1].weight).toBeCloseTo(0.25)
    expect(r.perScenario.base.breakEvenUnits).toBeGreaterThan(0)
  })

  it('rejects negative quantities and invalid percentages', () => {
    expect(() => computeLaunchEconomics(input({ lines: [line({ quantityOrdered: -1 })] }))).toThrow()
    expect(() => computeLaunchEconomics(input({ paymentFeePct: 150 }))).toThrow()
    expect(() => computeLaunchEconomics(input({ lines: [line({ sellPrice: 10.5 as unknown as number })] }))).toThrow()
  })
})

describe('formatPaise', () => {
  it('formats whole rupees and paise remainders in en-IN', () => {
    expect(formatPaise(250000)).toBe('₹2,500')
    expect(formatPaise(250050)).toBe('₹2,500.50')
  })

  it('rounds rupee conversion at the boundary only', () => {
    expect(rupeesToPaise(423.7288)).toBe(42373)
  })
})
