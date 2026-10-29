/**
 * Qloo probe — verifies your key and the endpoint shapes before anything else.
 * Run: npm run probe:qloo   (needs QLOO_API_KEY; run with `node --env-file=.env.local` style loading
 * or `npx tsx --env-file=.env.local scripts/probe-qloo.ts`)
 */

async function main() {
  const key = process.env.QLOO_API_KEY
  const base = process.env.QLOO_BASE_URL ?? 'https://hackathon.api.qloo.com'
  if (!key) {
    console.error('✗ QLOO_API_KEY is not set. Add it to .env.local (see .env.example).')
    console.log('  Without a key the app runs on clearly-labelled sample data (fixtures mode).')
    process.exit(1)
  }

  const call = async (label: string, path: string, params: Record<string, string>) => {
    const url = new URL(path, base)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
    try {
      const res = await fetch(url, { headers: { 'X-Api-Key': key } })
      const body = await res.text()
      const preview = body.slice(0, 200).replace(/\n/g, ' ')
      console.log(`${res.ok ? '✓' : '✗'} ${res.status} ${label} → ${preview}`)
      return res.ok
    } catch (err) {
      console.error(`✗ ${label} → ${(err as Error).message}`)
      return false
    }
  }

  console.log(`Probing Qloo at ${base} …\n`)
  let pass = true
  pass = (await call('GET /search (artist)', '/search', { query: 'american football', types: 'urn:entity:artist', take: '3' })) && pass
  pass = (await call('GET /v2/tags', '/v2/tags', { 'filter.query': 'retro gaming', take: '3' })) && pass
  pass = (await call('GET /v2/insights (tag)', '/v2/insights', { 'filter.type': 'urn:tag', 'signal.interests.tags': 'urn:tag:emo', take: '3' })) && pass
  pass = (await call('GET /v2/insights (brand)', '/v2/insights', { 'filter.type': 'urn:entity:brand', take: '3' })) && pass
  console.log(pass ? '\nQloo probe passed.' : '\nQloo probe failed — check parameter shapes in lib/qloo/client.ts.')
  process.exit(pass ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
