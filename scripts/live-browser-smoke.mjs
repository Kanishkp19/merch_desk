import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const load = createRequire(import.meta.url)
const { chromium } = load(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core')
const base = process.env.MERCHDESK_BASE_URL || 'http://localhost:3000'
const city = process.env.MERCHDESK_CITY === 'Mumbai' ? 'Mumbai' : 'Bengaluru'
const output = path.resolve(`artifacts/live-browser-smoke/${city.toLowerCase()}`)
fs.mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await page.goto(base)
  await page.getByLabel('Or describe your fans').fill(city === 'Mumbai'
    ? 'Mumbai indie comics artist; readers collect zines, risograph prints and enamel pins.'
    : 'Bengaluru ambient electronic producer; fans collect analog photos, gig posters and enjoy filter coffee.')
  if (city === 'Bengaluru') {
    await page.getByLabel('Add a similar artist').fill('Tycho')
    await page.getByLabel('Add a similar artist').press('Enter')
  }
  await page.getByLabel('City (India pilot)').selectOption(city)
  await page.getByRole('button', { name: /Build my merch line/ }).click()
  await page.getByRole('button', { name: /Looks right.*Build collection/ }).waitFor({ timeout: 120000 })
  const tags = await page.getByRole('region', { name: 'Taste profile' }).last().innerText()
  assert.match(tags, city === 'Mumbai' ? /comics/i : /electronic/i)
  assert.match(tags, city === 'Mumbai' ? /zines/i : /photography/i)
  assert.doesNotMatch(tags, /pickled vegetables/i)

  const collabResponse = page.waitForResponse((response) => response.url().includes('/api/collabs'), { timeout: 120000 })
  await page.getByRole('button', { name: /Looks right.*Build collection/ }).click()
  const collection = page.getByRole('region', { name: 'Your collection' })
  await collection.getByRole('button', { name: /Approve & generate image/ }).first().waitFor({ timeout: 120000 })
  const collab = await collabResponse
  assert.equal(collab.status(), 200)
  const partners = (await collab.json()).data
  assert.ok(partners.collabs.some((partner) => partner.name === (city === 'Mumbai' ? 'Kitab Khana' : 'db studioLab')))
  assert.ok(partners.collabs.every((partner) => partner.type === 'place' && partner.sourceUrl))
  assert.match(await collection.innerText(), /₹/)

  const imageResponse = page.waitForResponse((response) => response.url().includes('/api/image'), { timeout: 120000 })
  await collection.getByRole('button', { name: /Approve & generate image/ }).first().click()
  const generated = await imageResponse
  assert.equal(generated.status(), 200)
  const image = (await generated.json()).data
  assert.match(image.imageDataUrl, /^data:image\/(png|jpeg|webp);base64,/)
  const mime = image.imageDataUrl.slice(5, image.imageDataUrl.indexOf(';'))
  const imageFile = `concept.${mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'}`
  fs.writeFileSync(path.join(output, imageFile), Buffer.from(image.imageDataUrl.split(',')[1], 'base64'))
  await collection.getByAltText(/AI concept image:/).first().waitFor({ timeout: 30000 })

  await page.getByRole('button', { name: /Open line sheet/ }).click()
  await page.getByRole('heading', { name: 'Line sheet' }).waitFor()
  const pdf = await page.pdf({ format: 'A4', printBackground: true })
  const pages = Number(execFileSync('pdfinfo', ['-'], { input: pdf, encoding: 'utf8' }).match(/^Pages:\s+(\d+)/m)?.[1])
  assert.equal(pages, 1)
  assert.deepEqual(pageErrors, [])
  const summary = {
    city,
    profileTags: tags.match(/TASTE TAGS[\s\S]*?BRANDS/i)?.[0].slice(0, 500),
    partners: partners.collabs.map((p) => ({ name: p.name, type: p.type })),
    cityNote: partners.cityNote,
    image: { model: image.model, mime, file: imageFile, bytes: fs.statSync(path.join(output, imageFile)).size },
    pdfPages: pages,
    pageErrors,
  }
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(summary, null, 2))
  console.log(summary)
  await context.close()
} finally {
  await browser.close()
}
