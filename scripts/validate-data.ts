/**
 * Data validation — checks data/*.json against the vocabularies.
 * Run: npm run validate:data
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type CatalogItem = {
  id: string
  tags: string[]
  crossDomainTags: string[]
  silhouette: string
  unitCost: [number, number]
}

const data = (f: string) => JSON.parse(readFileSync(join(process.cwd(), 'src', 'data', f), 'utf8'))

const canonical: string[] = data('canonical-tags.json')
const catalog: CatalogItem[] = data('catalog.json')
const palettes = data('palettes.json') as { palettes: Array<{ id: string; hex: string[]; names: string[] }> }
const SILHOUETTES = ['cap', 'top', 'socks', 'tote', 'flat', 'round', 'cassette', 'mug', 'bottle', 'bag', 'can', 'bandana', 'cards']

let errors = 0
const fail = (msg: string) => {
  errors++
  console.error(`  ✗ ${msg}`)
}
const ok = (msg: string) => console.log(`  ✓ ${msg}`)

console.log('Validating MerchDesk data files…')

// catalog
const ids = new Set<string>()
if (catalog.length !== 20) fail(`catalog should have 20 items, has ${catalog.length}`)
else ok('catalog has 20 items')
for (const item of catalog) {
  if (ids.has(item.id)) fail(`duplicate id: ${item.id}`)
  ids.add(item.id)
  for (const t of [...item.tags, ...item.crossDomainTags]) {
    if (!canonical.includes(t)) fail(`${item.id}: tag "${t}" not in canonical-tags.json`)
  }
  if (!SILHOUETTES.includes(item.silhouette)) fail(`${item.id}: unknown silhouette "${item.silhouette}"`)
  if (item.unitCost[0] > item.unitCost[1]) fail(`${item.id}: unitCost lo > hi`)
}
ok('catalog tags map to canonical vocabulary')
ok('catalog silhouettes are known')

// palettes
const paletteIds = new Set(palettes.palettes.map((p) => p.id))
if (paletteIds.size !== 8) fail(`expected 8 palettes, found ${paletteIds.size}`)
else ok('8 palettes present')
for (const p of palettes.palettes) {
  if (p.hex.length !== p.names.length) fail(`palette ${p.id}: names/hex length mismatch`)
}

// brand tiers
const tiers = data('brand-tiers.json') as Record<string, { tier: string }>
const validTiers = new Set(['budget', 'mid', 'premium'])
for (const [name, row] of Object.entries(tiers)) {
  if (!validTiers.has(row.tier)) fail(`brand "${name}": unknown tier "${row.tier}"`)
}
ok(`${Object.keys(tiers).length} brand-tier rows valid`)

if (errors > 0) {
  console.error(`\n${errors} problem(s) found.`)
  process.exit(1)
}
console.log('\nAll data files valid.')
