export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 py-20 flex flex-col items-center text-center">
      <p className="font-display text-7xl uppercase leading-none mb-4">404</p>
      <h1 className="font-display text-2xl uppercase mb-3">This page isn't on the merch table</h1>
      <p className="text-sm text-ink-2 max-w-sm mb-6">
        The page you were looking for sold out, broke up, or never pressed in the first place.
      </p>
      <a
        href="/"
        className="inline-flex items-center justify-center font-display uppercase tracking-wide text-sm min-h-11 px-4 py-2.5 border-2 border-ink rounded-sm shadow-hard bg-tomato text-ink hover:-translate-y-0.5 hover:shadow-hard-lg transition"
      >
        Back home
      </a>
    </main>
  )
}
