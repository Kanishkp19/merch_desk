import React from 'react'

/** Qloo credit mark — external link, new tab. */
export function PoweredByQloo({ className = '' }: { className?: string }) {
  return (
    <a
      href="https://qloo.com"
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 font-mono text-xs border-2 border-ink px-2 py-1 bg-paper hover:bg-acid transition-colors ${className}`}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
        <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="7" cy="7" r="1.8" fill="currentColor" />
      </svg>
      Powered by Qloo
    </a>
  )
}
