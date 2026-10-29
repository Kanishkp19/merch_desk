import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'

const load = createRequire(import.meta.url)
const { chromium } = load(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')

const root = process.cwd()
const benchmark = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/benchmark/run-2026-10-29/b01.json')))
const other = JSON.parse(fs.readFileSync(path.join(root, 'artifacts/benchmark/run-2026-10-29/b03.json')))
const image = `data:image/jpeg;base64,${fs.readFileSync(path.join(root, 'artifacts/e2e-mira-vale/concept-hero-crewneck.jpg')).toString('base64')}`
const output = path.join(root, 'artifacts/benchmark/browser')
fs.mkdirSync(output, { recursive: true })

async function journey(browser, name, viewport) {
  const context = await browser.newContext({ viewport, acceptDownloads: true })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/api/agent/profile', (route) => route.fulfill({ status: 200, contentType: 'text/event-stream', body: benchmark.events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join('') }))
  await page.route('**/api/collection', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: benchmark.collection }) }))
  let collabCalls = 0
  await page.route('**/api/collabs', (route) => {
    collabCalls++
    if (name === 'mobile' && collabCalls === 1) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'QLOO_UNAVAILABLE', message: 'Taste data is unavailable. Try again.' } }) })
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: benchmark.collabs }) })
  })
  await page.route('**/api/image', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { imageDataUrl: image, model: 'browser-fixture', attempt: 1 } }) }))
  await page.route('**/api/replace', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { product: other.collection.products.find((p) => !benchmark.collection.products.some((q) => q.id === p.id)) || null, profileDelta: { brands: [], crossDomain: [] }, note: 'Replacement' } }) }))

  await page.goto('http://localhost:3000')
  await page.keyboard.press('Tab')
  assert.equal((await page.locator(':focus').innerText()).toLowerCase(), 'skip to content')
  await page.getByRole('button', { name: /Build my merch line/ }).click()
  await page.getByText('Tell us about your fans, or search an artist').waitFor()
  await page.getByLabel('Or describe your fans').fill(benchmark.input.text)
  await page.getByLabel('City (for local collabs)').fill(benchmark.input.city)
  await page.getByRole('button', { name: /Build my merch line/ }).click()
  await page.getByRole('button', { name: /Looks right.*Build collection/ }).waitFor({ timeout: 30000 }).catch(async (error) => {
    console.error('Profile stage:', (await page.locator('body').innerText()).slice(0, 2400))
    await page.screenshot({ path: path.join(output, `${name}-profile-failure.png`), fullPage: true })
    throw error
  })
  await page.getByRole('button', { name: /Looks right.*Build collection/ }).click()
  await page.getByRole('region', { name: 'Your collection' }).getByRole('button', { name: /Approve & generate image/ }).first().waitFor({ timeout: 30000 })
  const collection = page.getByRole('region', { name: 'Your collection' })
  if (name === 'mobile') {
    const radar = page.getByRole('region', { name: 'Collab Radar' })
    await radar.getByText("Couldn't load partners.").waitFor()
    await radar.getByRole('button', { name: 'Try again' }).click()
  }
  await page.getByRole('region', { name: 'Collab Radar' }).getByText('Apple Inc', { exact: true }).waitFor({ timeout: 30000 })
  const first = collection.locator('[aria-label*=", fit "]').first()
  const firstLabel = await first.getAttribute('aria-label')
  await first.getByRole('button', { name: /Approve & generate image/ }).click()
  await first.getByAltText(/AI concept image:/).waitFor({ timeout: 30000 })
  const download = page.waitForEvent('download')
  await first.getByRole('button', { name: 'Download' }).click()
  const saved = await download
  const file = path.join(output, `${name}-${saved.suggestedFilename()}`)
  await saved.saveAs(file)
  assert.ok(fs.statSync(file).size > 1000)
  await page.reload()
  await page.getByRole('region', { name: 'Your collection' }).waitFor()
  await page.getByAltText(/AI concept image:/).first().waitFor({ timeout: 30000 })
  const restored = page.getByRole('region', { name: 'Your collection' }).locator(`[aria-label="${firstLabel}"]`)
  await restored.getByRole('button', { name: 'Edit' }).click()
  await restored.getByRole('textbox').last().fill('A refreshed description that makes the previous image obsolete.')
  await restored.getByRole('button', { name: 'Save' }).click()
  assert.equal(await page.getByRole('button', { name: /Download all approved images/ }).isDisabled(), true)
  const beforeReject = await collection.locator('[aria-label*=", fit "]').count()
  await collection.getByRole('button', { name: 'Not for us' }).first().click()
  await page.getByRole('button', { name: 'Undo' }).click()
  assert.equal(await collection.locator('[aria-label*=", fit "]').count(), beforeReject)
  await collection.getByRole('button', { name: 'Not for us' }).first().click()
  await page.waitForTimeout(5500)
  await collection.locator('[aria-label*=", fit "]').first().waitFor()
  assert.equal(await collection.locator('[aria-label*=", fit "]').count(), beforeReject)
  await page.getByRole('button', { name: /Open line sheet/ }).click()
  await page.getByRole('heading', { name: 'Line sheet' }).waitFor()
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2))
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  fs.writeFileSync(path.join(output, `${name}-line-sheet.pdf`), pdf)
  assert.ok(pdf.length > 1000)
  const pages = Number(execFileSync('pdfinfo', ['-'], { input: pdf, encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)?.[1])
  assert.equal(pages, 1)
  await page.screenshot({ path: path.join(output, `${name}-line-sheet.png`), fullPage: true })
  assert.deepEqual(errors, [])
  await context.close()
  return { name, downloadedBytes: fs.statSync(file).size, pdfBytes: pdf.length, pdfPages: pages, pageErrors: errors }
}

;(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
  try {
    const results = []
    results.push(await journey(browser, 'desktop', { width: 1440, height: 900 }))
    results.push(await journey(browser, 'mobile', { width: 390, height: 844 }))
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2))
    console.log(results)
  } finally {
    await browser.close()
  }
})().catch((error) => { console.error(error); process.exitCode = 1 })
