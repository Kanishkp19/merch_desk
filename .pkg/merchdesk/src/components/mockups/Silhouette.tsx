'use client'

import React from 'react'
import type { SilhouetteKind } from '@/types'

export interface SilhouetteProps {
  kind: SilhouetteKind
  colors: string[]
  className?: string
}

const OUTLINE = '#14110F'
const SW = 3

/**
 * 13 flat SVG product sketches (viewBox 200×200) — the pre-approval visual
 * and the fallback when images are unavailable. No text, no AI.
 */
export function Silhouette({ kind, colors, className }: SilhouetteProps) {
  const body = colors[0] ?? '#E2D9C4'
  const accent = colors[1] ?? '#B5651D'
  const common = { stroke: OUTLINE, strokeWidth: SW, strokeLinejoin: 'round' as const }

  const shapes: Record<SilhouetteKind, React.ReactNode> = {
    cap: (
      <>
        <path d="M42 118 C42 76 76 52 116 52 C156 52 182 78 184 112 L184 118 Z" fill={body} {...common} />
        <path d="M184 112 C188 112 192 114 192 120 L192 124 L116 124 L116 112 Z" fill={accent} {...common} />
        <circle cx="118" cy="52" r="7" fill={accent} {...common} />
        <path d="M60 118 C64 92 86 74 114 70" fill="none" stroke={OUTLINE} strokeWidth={2} strokeDasharray="5 6" />
      </>
    ),
    top: (
      <>
        <path d="M70 52 L48 64 L56 92 L70 86 L70 156 C70 160 74 162 78 162 L126 162 C130 162 134 160 134 156 L134 86 L148 92 L156 64 L134 52 L118 48 C118 58 108 64 102 64 C96 64 86 58 86 48 Z" fill={body} {...common} />
        <rect x="88" y="92" width="28" height="34" fill={accent} opacity="0.9" {...common} strokeWidth={2} />
      </>
    ),
    socks: (
      <>
        <path d="M76 40 L108 40 L108 108 C108 118 116 124 128 128 L148 136 C158 140 158 156 144 160 L96 160 C84 160 76 152 76 140 Z" fill={body} {...common} />
        <path d="M76 40 L108 40 L108 58 L76 58 Z" fill={accent} {...common} strokeWidth={2} />
        <path d="M96 160 L144 160 C152 158 156 152 156 146" fill="none" stroke={OUTLINE} strokeWidth={2} strokeDasharray="4 5" />
      </>
    ),
    tote: (
      <>
        <path d="M52 84 L148 84 L142 158 C142 164 138 168 132 168 L68 168 C62 168 58 164 58 158 Z" fill={body} {...common} />
        <path d="M82 84 C82 60 88 48 100 48 C112 48 118 60 118 84" fill="none" stroke={OUTLINE} strokeWidth={SW} />
        <rect x="70" y="106" width="60" height="34" fill={accent} opacity="0.9" {...common} strokeWidth={2} />
      </>
    ),
    flat: (
      <>
        <rect x="40" y="52" width="120" height="96" rx="4" fill={body} {...common} />
        <rect x="56" y="68" width="88" height="52" fill={accent} opacity="0.85" {...common} strokeWidth={2} />
        <circle cx="100" cy="138" r="4" fill={OUTLINE} />
      </>
    ),
    round: (
      <>
        <circle cx="100" cy="104" r="56" fill={body} {...common} />
        <circle cx="100" cy="104" r="30" fill={accent} opacity="0.9" {...common} strokeWidth={2} />
        <path d="M82 44 L118 44" stroke={OUTLINE} strokeWidth={SW} />
      </>
    ),
    cassette: (
      <>
        <rect x="36" y="64" width="128" height="80" rx="6" fill={body} {...common} />
        <rect x="52" y="80" width="40" height="26" fill="#F5F0E6" {...common} strokeWidth={2} />
        <rect x="108" y="80" width="40" height="26" fill="#F5F0E6" {...common} strokeWidth={2} />
        <circle cx="68" cy="124" r="8" fill={accent} {...common} strokeWidth={2} />
        <circle cx="132" cy="124" r="8" fill={accent} {...common} strokeWidth={2} />
      </>
    ),
    mug: (
      <>
        <path d="M60 68 L132 68 L132 148 C132 156 126 160 118 160 L74 160 C66 160 60 156 60 148 Z" fill={body} {...common} />
        <path d="M132 84 C150 84 156 94 156 106 C156 118 150 128 132 128" fill="none" stroke={OUTLINE} strokeWidth={SW} />
        <rect x="72" y="92" width="48" height="30" fill={accent} opacity="0.9" {...common} strokeWidth={2} />
      </>
    ),
    bottle: (
      <>
        <path d="M88 36 L112 36 L112 60 C112 70 122 76 122 88 L122 152 C122 160 116 164 108 164 L92 164 C84 164 78 160 78 152 L78 88 C78 76 88 70 88 60 Z" fill={body} {...common} />
        <rect x="86" y="28" width="28" height="12" fill={accent} {...common} strokeWidth={2} />
        <rect x="86" y="96" width="28" height="44" fill={accent} opacity="0.85" {...common} strokeWidth={2} />
      </>
    ),
    bag: (
      <>
        <path d="M56 72 L144 72 L150 158 C150 164 146 168 140 168 L60 168 C54 168 50 164 50 158 Z" fill={body} {...common} />
        <path d="M78 72 L78 54 C78 44 88 38 100 38 C112 38 122 44 122 54 L122 72" fill="none" stroke={OUTLINE} strokeWidth={SW} />
        <rect x="64" y="92" width="72" height="30" fill={accent} opacity="0.85" {...common} strokeWidth={2} />
        <path d="M78 96 L118 118 M118 96 L78 118" stroke={OUTLINE} strokeWidth={2} />
      </>
    ),
    can: (
      <>
        <path d="M68 56 L132 56 L132 148 C132 156 126 160 118 160 L82 160 C74 160 68 156 68 148 Z" fill={body} {...common} />
        <ellipse cx="100" cy="56" rx="32" ry="8" fill={accent} {...common} strokeWidth={2} />
        <rect x="80" y="84" width="40" height="48" fill={accent} opacity="0.8" {...common} strokeWidth={2} />
      </>
    ),
    bandana: (
      <>
        <path d="M40 60 C70 90 130 90 160 60 C168 100 160 140 100 156 C40 140 32 100 40 60 Z" fill={body} {...common} />
        <path d="M56 78 C76 98 124 98 144 78" fill="none" stroke={OUTLINE} strokeWidth={2} strokeDasharray="6 5" />
        <circle cx="100" cy="116" r="14" fill={accent} {...common} strokeWidth={2} />
      </>
    ),
    cards: (
      <>
        <rect x="58" y="52" width="72" height="100" rx="6" fill={accent} opacity="0.9" transform="rotate(-8 94 102)" {...common} strokeWidth={2} />
        <rect x="74" y="48" width="72" height="100" rx="6" fill={body} transform="rotate(6 110 98)" {...common} />
        <path d="M96 74 L124 98 M124 74 L96 98" stroke={OUTLINE} strokeWidth={2} />
        <circle cx="110" cy="122" r="8" fill={accent} {...common} strokeWidth={2} />
      </>
    ),
  }

  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden focusable="false">
      {shapes[kind] ?? shapes.flat}
    </svg>
  )
}
