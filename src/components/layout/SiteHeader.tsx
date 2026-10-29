'use client'

import React from 'react'
import { AppLink } from '@/lib/navigate'
import { views } from '@/lib/routes'
import { PoweredByQloo } from './PoweredByQloo'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b-2 border-ink">
      <div className="mx-auto w-full max-w-6xl px-4 md:px-6 h-14 flex items-center justify-between gap-4">
        <AppLink view={views.home} className="font-display text-xl leading-none group" ariaLabel="MerchDesk home">
          <span className="relative inline-block">
            MerchDesk
            <span className="absolute left-0 -bottom-0.5 h-2 w-full bg-acid -z-10 group-hover:w-2 transition-all" aria-hidden />
          </span>
        </AppLink>
        <nav className="flex items-center gap-3 md:gap-5" aria-label="Main">
          <AppLink view={views.launches} className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4">
            My launches
          </AppLink>
          <AppLink view={views.about} className="font-mono text-xs uppercase tracking-widest hover:underline underline-offset-4">
            How it works
          </AppLink>
          <PoweredByQloo />
        </nav>
      </div>
    </header>
  )
}
