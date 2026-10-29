import React from 'react'
import { PoweredByQloo } from './PoweredByQloo'
import { AppLink } from '@/lib/navigate'
import { views } from '@/lib/routes'

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-2 border-ink bg-paper-2">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-display uppercase text-sm">
            MerchDesk <span className="text-mute font-sans normal-case text-sm">· India pilot · manually assisted launches</span>
          </p>
          <p className="text-xs text-mute max-w-md">
            Affinity, not purchases. Prices are estimates. Images are AI concepts. Suppliers are coordinated by a human during the pilot.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <AppLink view={views.launches} className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4">
            My launches
          </AppLink>
          <a
            href="/merchdesk.zip"
            download
            className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4"
          >
            Download source (.zip)
          </a>
          <AppLink view={views.operator} className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4">
            Operator
          </AppLink>
          <PoweredByQloo />
        </div>
      </div>
    </footer>
  )
}
