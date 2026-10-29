import { ApiError } from '@/lib/http/errors'
import { env } from '@/lib/env'

/**
 * Free image generation chain: z-ai sdk (this environment) → Cloudflare
 * Workers AI FLUX.1 [schnell] (free plan). Returns a data URL — images are
 * never stored server-side.
 */

const IMAGE_TIMEOUT_MS = 45_000

interface ImageResult {
  dataUrl: string
  model: string
}

// ------------------------------------------------------------- z-ai (sdk)
interface ZaiImageInstance { images: { generations: { create: (args: unknown) => Promise<unknown> } } }
let zaiImage: ZaiImageInstance | null = null
let zaiImageTried = false

async function getImageZai(): Promise<typeof zaiImage> {
  if (zaiImage) return zaiImage
  if (zaiImageTried) return null
  zaiImageTried = true
  try {
    const mod = (await import('z-ai-web-dev-sdk')) as unknown as { default?: { create: () => Promise<unknown> } }
    if (mod?.default?.create) {
      const instance = (await mod.default.create()) as {
        images?: { generations?: { create: (args: unknown) => Promise<unknown> } }
      }
      if (instance?.images?.generations?.create) {
        zaiImage = instance as ZaiImageInstance
      }
    }
  } catch {
    /* not available */
  }
  return zaiImage
}

async function generateWithZai(prompt: string): Promise<ImageResult> {
  const zai = await getImageZai()
  if (!zai) throw new Error('z-ai image unavailable')
  const res = (await zai.images.generations.create({
    prompt,
    size: '1024x1024',
  })) as { data?: Array<{ base64?: string }> }
  const base64 = res?.data?.[0]?.base64
  if (!base64) throw new Error('empty image response')
  return { dataUrl: `data:image/png;base64,${base64}`, model: 'zai-image' }
}

// -------------------------------------------------- Cloudflare FLUX schnell
async function generateWithCloudflare(prompt: string): Promise<ImageResult> {
  const e = env()
  if (!e.CF_ACCOUNT_ID || !e.CF_API_TOKEN) throw new Error('cloudflare image not configured')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS)
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${e.CF_ACCOUNT_ID}/ai/run/${e.CF_IMAGE_MODEL}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${e.CF_API_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, steps: 6 }),
        signal: controller.signal,
      }
    )
    if (res.status === 429) {
      throw new ApiError('IMAGE_QUOTA', 'Free image quota used up for today. Your description and sketch are kept.')
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { errors?: Array<{ code?: number; message?: string }> } | null
      const msg = body?.errors?.[0]?.message ?? `image api ${res.status}`
      if (/quota|limit|exceeded/i.test(msg)) {
        throw new ApiError('IMAGE_QUOTA', 'Free image quota used up for today. Your description and sketch are kept.')
      }
      throw new Error(msg)
    }
    const body = (await res.json()) as {
      result?: { image?: string }
      success?: boolean
      errors?: unknown[]
    }
    const b64 = body?.result?.image
    if (!b64) throw new Error('no image in response')
    return { dataUrl: `data:image/jpeg;base64,${b64}`, model: e.CF_IMAGE_MODEL }
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof Error && err.name === 'AbortError') throw new Error('image timeout')
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/** Generate one concept image. Throws ApiError with proper codes on failure. */
export async function generateImage(prompt: string): Promise<ImageResult> {
  const errors: string[] = []

  // z-ai first (free in this environment)
  try {
    return await generateWithZai(prompt)
  } catch (err) {
    if (err instanceof ApiError) throw err
    errors.push(`zai: ${err instanceof Error ? err.message : 'failed'}`)
  }

  // Cloudflare FLUX fallback
  try {
    return await generateWithCloudflare(prompt)
  } catch (err) {
    if (err instanceof ApiError) throw err
    errors.push(`cloudflare: ${err instanceof Error ? err.message : 'failed'}`)
  }

  throw new ApiError('IMAGE_FAILED', `Image generation failed. Try again. (${errors.join('; ')})`)
}

export async function imageProviderAvailable(): Promise<boolean> {
  if (await getImageZai()) return true
  const e = env()
  return Boolean(e.CF_ACCOUNT_ID && e.CF_API_TOKEN)
}
