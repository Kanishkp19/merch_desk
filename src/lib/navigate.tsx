'use client'

import React, { useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { USE_HASH_ROUTING, hrefFor, views, type ViewName } from './routes'

/**
 * Programmatic navigation that works in BOTH builds:
 *  - hash mode (single-route demo): mutates location.hash → fires hashchange
 *  - path mode (zip build): next/router soft navigation
 */
export function useAppNavigate() {
  const router = useRouter()
  return useCallback(
    (view: ViewName) => {
      if (USE_HASH_ROUTING) {
        if (typeof window === 'undefined') return
        if (window.location.pathname !== '/') {
          window.location.href = hrefFor(view)
        } else {
          window.location.hash = view === views.home ? '' : view
          if (view === views.home) window.scrollTo({ top: 0 })
        }
      } else {
        router.push(hrefFor(view))
      }
    },
    [router]
  )
}

/** Semantic link that soft-navigates in both builds. */
export function AppLink({
  view,
  children,
  className,
  ariaLabel,
  onNavigate,
}: {
  view: ViewName
  children: React.ReactNode
  className?: string
  ariaLabel?: string
  onNavigate?: () => void
}) {
  const navigate = useAppNavigate()
  if (USE_HASH_ROUTING) {
    return (
      <a
        href={hrefFor(view)}
        aria-label={ariaLabel}
        className={className}
        onClick={(e) => {
          e.preventDefault()
          onNavigate?.()
          navigate(view)
        }}
      >
        {children}
      </a>
    )
  }
  return (
    <Link href={hrefFor(view)} aria-label={ariaLabel} className={className} onClick={() => onNavigate?.()}>
      {children}
    </Link>
  )
}
