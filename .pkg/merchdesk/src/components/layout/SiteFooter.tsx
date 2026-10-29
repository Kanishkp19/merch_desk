import React from 'react'
import { PoweredByQloo } from './PoweredByQloo'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-paper-2">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-display uppercase text-sm">
            MerchDesk <span className="text-mute font-sans normal-case text-sm">· MIT license · built for the Qloo Agentic Hackathon</span>
          </p>
          <p className="text-xs text-mute max-w-md">
            Affinity, not purchases. Prices are estimates. Images are AI concepts.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4"
          >
            GitHub
          </a>
          <PoweredByQloo />
        </div>
      </div>
    </footer>
  )
}
