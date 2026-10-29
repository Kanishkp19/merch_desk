/**
 * Loose ambient declaration for the optional z-ai-web-dev-sdk provider.
 * The LLM/image provider chains import it dynamically and skip it
 * gracefully when it is not installed — this declaration keeps TypeScript
 * happy in environments where the package is absent.
 */
declare module 'z-ai-web-dev-sdk' {
  interface ZAIInstance {
    chat: {
      completions: {
        create: (opts: { messages: Array<{ role: string; content: string }>; thinking?: { type: string } }) => Promise<{
          choices?: Array<{ message?: { content?: string } }>
        }>
      }
    }
    images: {
      generations: {
        create: (opts: { prompt: string; size?: string }) => Promise<{
          data?: Array<{ base64?: string }>
        }>
      }
    }
  }
  const ZAI: { create: () => Promise<ZAIInstance> }
  export default ZAI
}
