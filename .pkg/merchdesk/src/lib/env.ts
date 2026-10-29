/**
 * Server-side environment parsing (zod). Never import from client code.
 * Missing keys degrade gracefully — the app is designed to run free.
 */
import { z } from 'zod'

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1')
  .default(true)

const envSchema = z.object({
  QLOO_API_KEY: z.string().optional(),
  QLOO_BASE_URL: z.string().url().default('https://hackathon.api.qloo.com'),

  LLM_PROVIDERS: z.string().default('zai,groq,gemini,cloudflare'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash-lite'),

  CF_ACCOUNT_ID: z.string().optional(),
  CF_API_TOKEN: z.string().optional(),
  CF_LLM_MODEL: z.string().default('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
  CF_IMAGE_MODEL: z.string().default('@cf/black-forest-labs/flux-1-schnell'),

  NEXT_PUBLIC_MAX_IMAGES_PER_SESSION: z.coerce.number().int().min(1).max(50).default(12),
  MERCHDESK_DATA_MODE: z.enum(['live', 'fixtures', 'auto']).default('auto'),
  RATE_LIMIT_ENABLED: bool,
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  VERCEL_ENV: z.string().optional(),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function env(): Env {
  if (cached) return cached
  const parsed = envSchema.safeParse(process.env)
  if (parsed.success) {
    cached = parsed.data
  } else {
    // fall back to defaults on parse failure — never crash the demo over env
    cached = envSchema.parse({})
  }
  return cached
}

export type DataMode = 'live' | 'fixtures'

/**
 * Data mode resolution:
 *  - explicit `live` / `fixtures` is honoured
 *  - `auto` (default) → live when a Qloo key is present, fixtures otherwise
 */
export function dataMode(): DataMode {
  const e = env()
  if (e.MERCHDESK_DATA_MODE === 'live') return 'live'
  if (e.MERCHDESK_DATA_MODE === 'fixtures') return 'fixtures'
  return e.QLOO_API_KEY ? 'live' : 'fixtures'
}

export function llmProviderOrder(): string[] {
  return env()
    .LLM_PROVIDERS.split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
}

export function configuredLlmProviders(): string[] {
  const e = env()
  const order = llmProviderOrder()
  const available: string[] = []
  for (const p of order) {
    if (p === 'groq' && e.GROQ_API_KEY) available.push('groq')
    if (p === 'gemini' && e.GEMINI_API_KEY) available.push('gemini')
    if (p === 'cloudflare' && e.CF_ACCOUNT_ID && e.CF_API_TOKEN) available.push('cloudflare')
    if (p === 'zai') available.push('zai') // available in this environment; skipped automatically if not
  }
  return available
}

export function maxImagesPerSession(): number {
  return env().NEXT_PUBLIC_MAX_IMAGES_PER_SESSION
}

export function imageProviderConfigured(): boolean {
  const e = env()
  return Boolean(e.CF_ACCOUNT_ID && e.CF_API_TOKEN) || configuredLlmProviders().includes('zai')
}
