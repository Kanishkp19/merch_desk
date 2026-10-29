import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const run = resolve(process.argv[2] ?? 'artifacts/benchmark/run-2026-10-29')
const out = resolve(process.argv[3] ?? 'artifacts/benchmark/review-packet')
const aliases = ['R07', 'R02', 'R11', 'R04', 'R09', 'R01', 'R12', 'R05', 'R10', 'R03', 'R08', 'R06']
await mkdir(out, { recursive: true })
const rows = ['case,relevance,evidence,originality,budget_fit,partner_usefulness,visual_fidelity,reason']

for (let i = 1; i <= 12; i++) {
  const id = `b${String(i).padStart(2, '0')}`
  const data = JSON.parse(await readFile(resolve(run, `${id}.json`), 'utf8'))
  const alias = aliases[i - 1]
  const products = (data.collection?.products ?? []).map((p: { name: string; role: string; description: { text: string }; evidence: Array<{ label: string }>; pricing: { firstRunCost: number } }) =>
    `- **${p.name}** (${p.role}; est. first run $${p.pricing.firstRunCost}): ${p.description.text}\n  Evidence: ${p.evidence.map((e) => e.label).join(', ') || 'none'}`)
  const partners = (data.collabs?.collabs ?? []).map((c: { name: string; area?: string; partnerIdea: string }) => `- ${c.name}${c.area ? `, ${c.area}` : ''}: ${c.partnerIdea}`)
  const packet = `# Case ${alias}\n\nBrief: ${data.input.text}\n\nCreator: ${data.input.creatorType}; city: ${data.input.city}; budget: ${data.input.budget}; references: ${data.input.soundsLike.join(', ') || 'none'}\n\n## Products\n\n${products.join('\n') || 'None'}\n\n## Partners\n\n${partners.join('\n') || (data.collabsError ? 'Partner search failed.' : 'None')}\n`
  await writeFile(resolve(out, `${alias}.md`), packet)
  rows.push(`${alias},,,,,,,`)
}
await writeFile(resolve(out, 'scores.csv'), rows.join('\n') + '\n')
