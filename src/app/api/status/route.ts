import { dataMode, maxImagesPerSession } from '@/lib/env'
import { configuredProviders } from '@/lib/llm/providers'
import { imageProviderAvailable } from '@/lib/image/provider'
import { jsonOk, handle } from '@/lib/http/errors'
import { imageSession } from '@/lib/image/quota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = imageSession(req)
  return handle(async () => {
    const providers = await configuredProviders()
    const image = await imageProviderAvailable()
    return jsonOk({
      qloo: dataMode() === 'live',
      dataMode: dataMode(),
      llmProviders: providers,
      image,
      maxImagesPerSession: maxImagesPerSession(),
      fixturesNotice: dataMode() === 'fixtures' ? 'SAMPLE DATA — not Qloo output' : undefined,
    }, session.cookie ? { headers: { 'Set-Cookie': session.cookie } } : undefined)
  })
}
