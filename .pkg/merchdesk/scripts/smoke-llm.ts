/**
 * LLM smoke test — checks which providers answer, and that JSON mode works.
 * Run: npm run smoke:llm
 */
async function main() {
  const { chat } = await import('../src/lib/llm/providers')

  console.log('Probing LLM provider chain…\n')
  try {
    const res = await chat({
      messages: [
        { role: 'system', content: 'Reply with only JSON: {"ok": true}' },
        { role: 'user', content: 'Ping.' },
      ],
      json: true,
      maxTokens: 40,
    })
    console.log(`✓ provider=${res.provider} model=${res.model}`)
    console.log(`  reply: ${res.text.slice(0, 120)}`)
    const parsed = JSON.parse(res.text.trim().replace(/^```(?:json)?|```$/g, ''))
    if (parsed.ok !== true) throw new Error('unexpected JSON payload')
    console.log('\nLLM smoke test passed.')
  } catch (err) {
    console.error(`✗ LLM chain failed: ${(err as Error).message}`)
    console.log('  The app still runs with the scripted agent + template descriptions.')
    process.exit(1)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

export {}
