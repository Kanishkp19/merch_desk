/**
 * Routing helper — MerchDesk.
 *
 * The demo build (this sandbox) serves everything on `/` with hash-based views
 * (#studio, #line-sheet, #about). The packaged zip build flips USE_HASH_ROUTING
 * to false and adds real Next.js routes that render the exact same view
 * components (see app/studio/page.tsx etc. in the zip).
 */
export const USE_HASH_ROUTING = false

export const views = {
  home: 'home',
  studio: 'studio',
  lineSheet: 'line-sheet',
  about: 'about',
} as const

export type ViewName = (typeof views)[keyof typeof views]

export function hrefFor(view: ViewName): string {
  if (view === views.home) return USE_HASH_ROUTING ? '/#' : '/'
  if (view === views.studio) return USE_HASH_ROUTING ? '/#studio' : '/studio'
  if (view === views.lineSheet) return USE_HASH_ROUTING ? '/#line-sheet' : '/line-sheet'
  return USE_HASH_ROUTING ? '/#about' : '/about'
}

export const routes = {
  home: hrefFor(views.home),
  studio: hrefFor(views.studio),
  lineSheet: hrefFor(views.lineSheet),
  about: hrefFor(views.about),
}

export function viewFromHash(hash: string): ViewName {
  const h = hash.replace(/^#/, '')
  if (h === 'studio') return views.studio
  if (h === 'line-sheet') return views.lineSheet
  if (h === 'about') return views.about
  return views.home
}
