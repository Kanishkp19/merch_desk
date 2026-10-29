import { dataMode, maxImagesPerSession } from '@/lib/env'
import { configuredProviders } from '@/lib/llm/providers'
import { imageProviderAvailable } from '@/lib/image/provider'
import { jsonOk, handle } from '@/lib/http/errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
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
    })
  })
}
