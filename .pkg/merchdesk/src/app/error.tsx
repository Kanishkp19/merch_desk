'use client'

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 md:px-6 py-20 flex flex-col items-center text-center">
      <p className="font-display text-5xl uppercase leading-none mb-4">Something went wrong</p>
      <p className="text-sm text-ink-2 max-w-sm mb-6">
        An unexpected error interrupted the show. Your run is kept in this tab — try again.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center font-display uppercase tracking-wide text-sm min-h-11 px-4 py-2.5 border-2 border-ink rounded-sm shadow-hard bg-tomato text-ink hover:-translate-y-0.5 hover:shadow-hard-lg transition"
      >
        Reload
      </button>
    </main>
  )
}
