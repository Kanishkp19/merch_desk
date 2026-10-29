'use client'

import React, { useEffect, useState } from 'react'
import { viewFromHash, type ViewName } from '@/lib/routes'
import { LandingView } from '@/components/views/LandingView'
import { BriefView } from '@/components/views/BriefView'
import { StudioView } from '@/components/views/StudioView'
import { LaunchView } from '@/components/views/LaunchView'
import { LaunchesView } from '@/components/views/LaunchesView'
import { LineSheetView } from '@/components/views/LineSheetView'
import { AboutView } from '@/components/views/AboutView'
import { OperatorView } from '@/components/views/OperatorView'

function viewComponent(view: ViewName) {
  switch (view) {
    case 'brief':
      return <BriefView />
    case 'studio':
      return <StudioView />
    case 'launch':
      return <LaunchView />
    case 'launches':
      return <LaunchesView />
    case 'example':
      return <LaunchView exampleMode />
    case 'line-sheet':
      return <LineSheetView />
    case 'about':
      return <AboutView />
    case 'operator':
      return <OperatorView />
    default:
      return <LandingView />
  }
}

export default function Home() {
  const [view, setView] = useState<ViewName>('home')

  useEffect(() => {
    const sync = () => {
      setView(viewFromHash(window.location.hash))
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  // scroll to top when switching views
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [view])

  return <>{viewComponent(view)}</>
}
