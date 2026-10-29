'use client'

import React, { useState } from 'react'
import { Pencil, RotateCcw } from 'lucide-react'
import type { StudioInput } from '@/types'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { HeroInput } from '@/components/landing/HeroInput'
import { useStudio } from '@/lib/state/StudioProvider'

export function OptionsBar() {
  const studio = useStudio()
  const { input, profile, products, stage } = studio.state
  const [editing, setEditing] = useState(false)
  const [confirmRerun, setConfirmRerun] = useState(false)

  if (!input) return null

  const pathBadge =
    profile?.path === 'A_artist_found' ? (
      <Chip variant="pathA" title={`Found ${profile.artist?.name} in Qloo`}>
        Path A: found {profile.artist?.name ?? 'artist'} in Qloo
      </Chip>
    ) : profile ? (
      <Chip variant="pathB">Path B: from your description</Chip>
    ) : null

  return (
    <section aria-label="Your input" className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Chip variant="default" className="max-w-64 sm:max-w-xs" title={input.text}>
          <span className="truncate">{input.artist?.name ?? input.text}</span>
        </Chip>
        {input.city && <Chip variant="category">{input.city}</Chip>}
        <Chip variant="category">{input.budget} budget</Chip>
        <Chip variant="category">{input.creatorType.replace('_', ' ')}</Chip>
        {pathBadge}
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" aria-hidden /> Edit
          </Button>
          <Button
            variant="secondary"
            className="min-h-9 px-3 text-xs"
            onClick={() => (products.length > 0 ? setConfirmRerun(true) : studio.rerun())}
            disabled={stage === 'profiling' || stage === 'building'}
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Re-run
          </Button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit your input" wide>
        <p className="text-sm text-ink-2 mb-4">Re-running replaces your current collection and approved descriptions.</p>
        <HeroInput
          compact
          defaults={input}
          onSubmit={(newInput: StudioInput) => {
            setEditing(false)
            void studio.startRun(newInput)
          }}
        />
      </Modal>

      <Modal open={confirmRerun} onClose={() => setConfirmRerun(false)} title="Re-run the research?">
        <p className="text-sm text-ink-2 mb-5">
          Re-running replaces your current collection and approved descriptions. Images already made will be lost.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={() => setConfirmRerun(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setConfirmRerun(false)
              void studio.rerun()
            }}
          >
            Re-run
          </Button>
        </div>
      </Modal>
    </section>
  )
}
