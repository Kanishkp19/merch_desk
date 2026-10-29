/**
 * Routing helper — MerchDesk.
 *
 * The demo build (this sandbox) serves everything on `/` with hash-based views
 * (#studio, #launch, #about). The packaged zip build flips USE_HASH_ROUTING
 * to false and adds real Next.js routes that render the exact same view
 * components (see app/studio/page.tsx etc. in the zip).
 */
export const USE_HASH_ROUTING = true

export const views = {
  home: 'home',
  brief: 'brief',
  studio: 'studio',
  launch: 'launch',
  launches: 'launches',
  example: 'example',
  lineSheet: 'line-sheet',
  about: 'about',
  operator: 'operator',
} as const

export type ViewName = (typeof views)[keyof typeof views]

export function hrefFor(view: ViewName): string {
  if (view === views.home) return USE_HASH_ROUTING ? '/#' : '/'
  if (view === views.brief) return USE_HASH_ROUTING ? '/#brief' : '/brief'
  if (view === views.studio) return USE_HASH_ROUTING ? '/#studio' : '/studio'
  if (view === views.launch) return USE_HASH_ROUTING ? '/#launch' : '/launch'
  if (view === views.launches) return USE_HASH_ROUTING ? '/#launches' : '/launches'
  if (view === views.example) return USE_HASH_ROUTING ? '/#example' : '/example'
  if (view === views.lineSheet) return USE_HASH_ROUTING ? '/#line-sheet' : '/line-sheet'
  if (view === views.operator) return USE_HASH_ROUTING ? '/#operator' : '/operator'
  return USE_HASH_ROUTING ? '/#about' : '/about'
}

export const routes = {
  home: hrefFor(views.home),
  brief: hrefFor(views.brief),
  studio: hrefFor(views.studio),
  launch: hrefFor(views.launch),
  launches: hrefFor(views.launches),
  example: hrefFor(views.example),
  lineSheet: hrefFor(views.lineSheet),
  about: hrefFor(views.about),
  operator: hrefFor(views.operator),
}

export function viewFromHash(hash: string): ViewName {
  const h = hash.replace(/^#/, '')
  if (h === 'brief') return views.brief
  if (h === 'studio') return views.studio
  if (h === 'launch') return views.launch
  if (h === 'launches') return views.launches
  if (h === 'example') return views.example
  if (h === 'line-sheet') return views.lineSheet
  if (h === 'about') return views.about
  if (h === 'operator') return views.operator
  return views.home
}
