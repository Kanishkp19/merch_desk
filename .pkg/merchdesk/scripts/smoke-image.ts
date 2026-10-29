/**
 * Image smoke test — generates one tiny concept image through the free chain.
 * Run: npm run smoke:image
 */
async function main() {
  console.log('Probing image provider chain…\n')
  try {
    const { generateImage } = await import('../src/lib/image/provider')
    const res = await generateImage(
      'Studio product photograph of a vinyl sticker on plain warm off-white backdrop, soft shadow, no text, no logos.'
    )
    const kb = Math.round(res.dataUrl.length / 1024)
    console.log(`✓ model=${res.model} → data URL (${kb} KB)`)
    console.log('\nImage smoke test passed.')
  } catch (err) {
    console.error(`✗ image chain failed: ${(err as Error).message}`)
    console.log('  Without an image provider, cards keep their concept sketches.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

export {}
