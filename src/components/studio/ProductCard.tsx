'use client'

import React, { useState } from 'react'
import { Check, Download, Pencil, Undo2 } from 'lucide-react'
import type { ProductProposal } from '@/types'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/Button'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { Tape } from '@/components/ui/Sticker'
import { Modal } from '@/components/ui/Modal'
import { ImageStage } from './ImageStage'
import { EvidenceChips, WhyPopover } from './WhyPopover'
import { formatInr } from '@/lib/score/pricing'
import { useStudio } from '@/lib/state/StudioProvider'
import { cn } from '@/lib/cn'
import { imageFileExtension } from '@/lib/image/format'

const TWEAKS: Array<{ id: string; label: string }> = [
  { id: 'more_minimal', label: 'More minimal' },
  { id: 'bolder_colours', label: 'Bolder colours' },
  { id: 'more_vintage', label: 'More vintage' },
  { id: 'darker_palette', label: 'Darker palette' },
  { id: 'simpler_design', label: 'Simpler design' },
  { id: 'more_playful', label: 'More playful' },
]

export interface ProductCardProps {
  product: ProductProposal
  paletteId: string
  replacementNote?: boolean
  onNumbers: (product: ProductProposal) => void
}

export function ProductCard({ product, paletteId, replacementNote, onNumbers }: ProductCardProps) {
  const studio = useStudio()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [whyOpen, setWhyOpen] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  const [tweaking, setTweaking] = useState<string | null>(null)

  const isHero = product.role === 'hero'
  const generating = product.image.status === 'generating'
  const ready = product.image.status === 'ready' && !product.image.outdated
  const regenLeft = Math.max(0, 3 - product.image.attempts)

  const startEdit = () => {
    setDraft(product.description.text)
    setEditing(true)
  }

  const saveEdit = () => {
    const text = draft.trim()
    if (text.length >= 10 && text.length <= 600) {
      studio.editProductText(product.id, text)
    }
    setEditing(false)
  }

  const download = () => {
    if (!product.image.dataUrl) return
    const a = document.createElement('a')
    a.href = product.image.dataUrl
    a.download = `merchdesk-${product.id}.${imageFileExtension(product.image.dataUrl)}`
    a.click()
  }

  return (
    <Card
      className={cn('flex flex-col gap-3 relative animate-[card-in_250ms_ease-out]', isHero && 'bg-paper')}
      aria-label={`${product.name}, fit ${product.fitScore} of 100`}
    >
      {isHero && <Tape />}

      {/* header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Chip variant={product.role === 'hero' ? 'hero' : product.role === 'limited' ? 'limited' : 'core'}>
            {product.role}
          </Chip>
          <Chip variant="category">{product.category}</Chip>
        </div>
        <button
          onClick={() => setWhyOpen(true)}
          aria-label={`Why ${product.name} was picked — fit score ${product.fitScore} of 100`}
          className="hover:scale-105 transition-transform"
        >
          <ScoreRing score={product.fitScore} />
        </button>
      </div>

      {replacementNote && (
        <p className="text-xs font-medium text-ink-2 bg-acid/50 border border-ink rounded-sm px-2 py-1">
          Replaced — related entities excluded
        </p>
      )}

      <ImageStage
        image={product.image}
        silhouette={product.silhouette}
        paletteId={paletteId}
        productName={product.name}
        approvedDescription={product.description.text}
        onOpenLightbox={() => setLightbox(true)}
      />

      <div>
        <h3 className="font-sans text-lg font-bold leading-snug">{product.name}</h3>
        <p className="text-sm text-ink-2">{product.oneLiner}</p>
      </div>

      {/* description block */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-2">What it looks like</span>
          <span className="flex items-center gap-2">
            {product.description.history.length > 0 && !editing && (
              <button
                onClick={() => studio.undoText(product.id)}
                className="inline-flex items-center gap-1 font-mono text-xs text-ink-2 hover:text-ink underline underline-offset-2"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo
              </button>
            )}
            <span className="font-mono text-xs border border-ink rounded-full px-2 py-0.5 bg-paper" aria-label={`Description version ${product.description.version}`}>
              v{product.description.version}
            </span>
          </span>
        </div>

        {editing ? (
          <div>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={600}
              rows={5}
              aria-label={`Edit description for ${product.name}`}
              className="w-full bg-paper text-ink font-sans text-sm border-2 border-ink rounded-sm p-3 focus:outline-none focus:ring-4 focus:ring-cobalt/40 resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={cn('text-xs text-mute', draft.length >= 600 && 'text-tomato-deep')}>
                {draft.length}/600
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" className="min-h-9 px-3 text-xs" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button variant="dark" className="min-h-9 px-4 text-xs" onClick={saveEdit} disabled={draft.trim().length < 10}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="bg-paper rounded-sm border-2 border-ink/80 p-3 text-sm text-ink-2 leading-relaxed">
            {product.description.text}
          </p>
        )}
      </div>

      {/* tweak chips */}
      {!editing && !generating && product.image.status !== 'quota' && product.image.status !== 'cap' && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick description tweaks">
          {TWEAKS.map((t) => (
            <button
              key={t.id}
              onClick={async () => {
                setTweaking(t.id)
                await studio.tweakProduct(product.id, t.id)
                setTweaking(null)
              }}
              disabled={tweaking !== null}
              className={cn(
                'inline-flex items-center rounded-full border-2 border-ink bg-paper px-2.5 py-1 font-sans text-xs font-medium shadow-hard-sm hover:bg-acid transition',
                tweaking === t.id && 'opacity-60'
              )}
            >
              {tweaking === t.id && (
                <span className="inline-block h-3 w-3 mr-1 rounded-full border-2 border-ink border-t-transparent animate-spin" aria-hidden />
              )}
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* evidence row */}
      <div className="flex flex-wrap gap-1.5" aria-label="Evidence">
        <EvidenceChips evidence={product.evidence} />
      </div>

      {/* price row */}
      <div className="flex items-end justify-between gap-2 mt-auto pt-1">
        <div>
          <p className="font-display text-2xl leading-none">
            Est. {formatInr(product.pricing.price)}
          </p>
          <p className="text-xs text-mute mt-1">
            incl. GST {formatInr(product.pricing.priceInclGst)} · margin{' '}
            {formatInr(product.pricing.marginPerUnit)}/unit
          </p>
        </div>
        <Button variant="secondary" className="min-h-9 px-3 text-xs" onClick={() => onNumbers(product)}>
          Numbers
        </Button>
      </div>

      {/* approval bar */}
      <div className="flex flex-wrap gap-2" aria-label="Actions">
        {product.image.status === 'quota' || product.image.status === 'cap' ? (
          <>
            <Button variant="secondary" className="flex-1 text-xs" onClick={startEdit}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Button>
            <Button variant="destructive" className="text-xs" onClick={() => studio.rejectProduct(product.id)}>
              Not for us
            </Button>
          </>
        ) : generating ? (
          <Button variant="secondary" className="flex-1 text-xs" disabled aria-busy>
            <span className="inline-block h-4 w-4 rounded-full border-2 border-ink border-t-transparent animate-spin" aria-hidden />
            Generating…
          </Button>
        ) : ready && product.decision === 'approved' && product.image.attempts > 0 && !product.image.outdated ? (
          <>
            <Button variant="secondary" className="text-xs" onClick={() => studio.keepProduct(product.id)}>
              <Check className="h-4 w-4 text-leaf" aria-hidden /> Keep ✓
            </Button>
            <Button
              variant="secondary"
              className="text-xs"
              disabled={regenLeft === 0}
              onClick={() => studio.regenerateImage(product.id)}
            >
              Regenerate{regenLeft > 0 ? ` (${regenLeft} left)` : ''}
            </Button>
            <Button variant="secondary" className="text-xs" onClick={download}>
              <Download className="h-4 w-4" aria-hidden /> Download
            </Button>
            <Button variant="secondary" className="text-xs" onClick={startEdit}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Button>
            <Button variant="destructive" className="text-xs" onClick={() => studio.rejectProduct(product.id)}>
              Not for us
            </Button>
          </>
        ) : product.image.status === 'failed' ? (
          <>
            <Button variant="primary" className="flex-1 text-xs" onClick={() => studio.approveAndGenerate(product.id)}>
              Try again
            </Button>
            <Button variant="secondary" className="text-xs" onClick={startEdit}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Button>
          </>
        ) : product.image.outdated ? (
          <>
            <Button variant="primary" className="flex-1 text-xs" onClick={() => studio.approveAndGenerate(product.id)}>
              Approve & generate image
            </Button>
            <Button variant="secondary" className="text-xs" onClick={startEdit}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="primary"
              className="flex-1 text-xs"
              disabled={product.description.text.length < 10}
              onClick={() => studio.approveAndGenerate(product.id)}
            >
              Approve & generate image
            </Button>
            <Button variant="secondary" className="text-xs" onClick={startEdit}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Button>
            <Button variant="destructive" className="text-xs" onClick={() => studio.rejectProduct(product.id)}>
              Not for us
            </Button>
          </>
        )}
      </div>

      {/* why popover */}
      <Modal open={whyOpen} onClose={() => setWhyOpen(false)} title={`Why ${product.name}?`}>
        <WhyPopover evidence={product.evidence} fitScore={product.fitScore} />
      </Modal>

      {/* image lightbox */}
      <Modal open={lightbox} onClose={() => setLightbox(false)} title={product.name} wide>
        {product.image.dataUrl && (
          <div>            <img src={product.image.dataUrl} alt={`AI concept image: ${product.description.text.slice(0, 100)}`} className="w-full border-2 border-ink rounded-sm" />
            <p className="mt-2 text-xs text-mute">AI concept image — not a final design. Generated from the description you approved.</p>
            <Button variant="dark" className="mt-3 w-full" onClick={download}>
              <Download className="h-4 w-4" aria-hidden /> Download image
            </Button>
          </div>
        )}
      </Modal>
    </Card>
  )
}
