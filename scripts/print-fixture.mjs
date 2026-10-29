import fs from 'node:fs'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const load = createRequire(import.meta.url)
const { chromium } = load(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const fixture = JSON.parse(fs.readFileSync('artifacts/benchmark/run-2026-10-29/b04.json'))
const state = {
  v: 1, runId: 'print-fixture', stage: 'collection', input: fixture.input,
  agentEvents: [], profile: fixture.profile, products: fixture.collection.products,
  dropPlan: fixture.collection.dropPlan, collabs: [], generic: null,
  imagesGenerated: 0, rejectedIds: [], collectionMeta: fixture.collection.meta,
}
const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport })
    await context.addInitScript((data) => sessionStorage.setItem('merchdesk:v1', JSON.stringify(data)), state)
    const page = await context.newPage()
    await page.goto('http://localhost:3000/#line-sheet')
    await page.getByRole('heading', { name: 'Line sheet' }).waitFor()
    await page.getByText('8 products').waitFor()
    const pdf = await page.pdf({ format: 'A4', printBackground: true })
    const pages = Number(execFileSync('pdfinfo', ['-'], { input: pdf, encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)?.[1])
    assert.equal(pages, 1, `${viewport.width}px viewport should fit 8 products on one page`)
    console.log(`${viewport.width}px: ${pages} page, 8 products`)
    await context.close()
  }
} finally {
  await browser.close()
}
