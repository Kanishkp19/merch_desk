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

  it('break-even recovers fixed costs plus batch inventory under the sales mix', () => {
    const r = computeLaunchEconomics(input({ pricesIncludeGst: false }))
    const b = r.perScenario.base
    expect(b.breakEvenUnits).toBe(Math.ceil((410000 + 1250000) / 41000))
    expect(b.breakEvenReachableInBatch).toBe(true)
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
