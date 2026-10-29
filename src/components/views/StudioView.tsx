'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, RotateCcw, Scale } from 'lucide-react'
import { Stepper, type StepId } from '@/components/studio/Stepper'
import { OptionsBar } from '@/components/studio/OptionsBar'
import { AgentThinkingPanel } from '@/components/studio/AgentThinkingPanel'
import { TasteProfileCard } from '@/components/studio/TasteProfileCard'
import { CollectionGrid } from '@/components/studio/CollectionGrid'
import { CollabRadar } from '@/components/studio/CollabRadar'
import { DropTimeline } from '@/components/studio/DropTimeline'
import { ComparePanel } from '@/components/studio/ComparePanel'
import { ExportBar } from '@/components/studio/ExportBar'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { useStudio } from '@/lib/state/StudioProvider'
import { useToast } from '@/components/ui/Toast'
import { views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'


const ERROR_COPY: Record<string, string> = {
  QLOO_NO_KEY: "MerchDesk can't reach its taste data right now.",
  QLOO_RATE_LIMIT: 'Taste data is busy — try again in a moment.',
  QLOO_UNAVAILABLE: 'Taste data is unavailable. Try again.',
  NETWORK: 'Connection problem — try again.',
}

export function StudioView() {
  const navigate = useAppNavigate()
  const studio = useStudio()
  const toast = useToast()
  const { state, hydrated } = studio
  const [panelCollapsed, setPanelCollapsed] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  // guard: direct navigation without input
  useEffect(() => {
    if (hydrated && !state.input) {
      toast.info('Start by telling us about your fans')
      navigate(views.home)
    }
  }, [hydrated])

  // dismiss replace-note event
  useEffect(() => {
    const handler = () => window.dispatchEvent(new CustomEvent('noop'))
    const clear = () => {
      // handled via reducer REPLACE_CLEAR through a tiny event bridge
    }
    window.addEventListener('merchdesk:clear-replace-note', clear)
    return () => window.removeEventListener('merchdesk:clear-replace-note', clear)
  }, [])

  if (!hydrated || !state.input) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-16">
        <p className="font-mono text-sm text-mute" aria-live="polite">Loading studio…</p>
      </main>
    )
  }

  const stage = state.stage
  const currentStep: StepId =
    stage === 'collection' ? 'collection' : stage === 'building' ? 'collection' : stage === 'profile_ready' ? 'taste' : 'fans'
  const reached = new Set<StepId>(['fans', ...(state.profile ? (['taste'] as StepId[]) : []), ...(state.products.length > 0 ? (['collection', 'partners', 'export'] as StepId[]) : [])])

  const agentDone = stage === 'profile_ready' || stage === 'building' || stage === 'collection'
  const agentMode =
    state.profile?.agentMode ?? (state.agentEvents.some((e) => e.type === 'note' && e.text?.includes('Fallback')) ? 'scripted_fallback' : null)

  const approvedCount = state.products.filter((p) => p.decision === 'approved').length

  return (
    <>
      <Stepper current={currentStep} reached={reached} />
      <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-8 space-y-14">
        {/* section 1 — options */}
        <section id="section-fans" aria-label="Your input">
          <OptionsBar />
        </section>

        {/* section 2 — taste */}
        <section id="section-taste" aria-label="Taste profile">
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5">
              <AgentThinkingPanel
                events={state.agentEvents}
                mode={agentMode}
                done={agentDone}
                collapsed={panelCollapsed && agentDone}
                onToggleCollapse={() => setPanelCollapsed((c) => !c)}
              />
              {state.lastError && state.stage === 'profiling' && (
                <div className="mt-4 bg-[#FFF1EE] border-2 border-tomato-deep rounded-md p-4" role="alert">
                  <p className="font-bold text-tomato-deep flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" aria-hidden /> Couldn't reach taste data
                  </p>
                  <p className="text-sm text-ink-2 mt-1">{ERROR_COPY[state.lastError.code] ?? state.lastError.message}</p>
                  <Button variant="secondary" className="mt-3" onClick={() => void studio.rerun()}>
                    <RotateCcw className="h-4 w-4" aria-hidden /> Try again
                  </Button>
                </div>
              )}
            </div>
            <div className="lg:col-span-7">
              <TasteProfileCard
                profile={state.profile}
                loading={stage === 'profiling' && !state.profile}
                onRemoveChip={studio.removeChip}
                onAddChip={studio.addChip}
                onBuild={() => void studio.buildCollection()}
              />
            </div>
          </div>
        </section>

        {/* section 3 — collection */}
        {(stage === 'building' || stage === 'collection') && (
          <section id="section-collection" aria-label="Your collection">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl uppercase">Your collection</h2>
                <span className="text-sm text-ink-2">
                  {approvedCount} of {state.products.length} approved
                </span>
                {state.collectionMeta && (
                  <Chip variant={state.collectionMeta.descriptionSource === 'llm' ? 'pathA' : 'pathB'} className="text-[10px]">
                    {state.collectionMeta.descriptionSource === 'llm' ? 'AI descriptions' : 'template descriptions'}
                  </Chip>
                )}
              </div>
              <Button variant="secondary" className="text-xs" onClick={() => setCompareOpen(true)}>
                <Scale className="h-4 w-4" aria-hidden /> Why not just ask ChatGPT?
              </Button>
            </div>
            <CollectionGrid
              loading={stage === 'building'}
              statusText={stage === 'building' ? 'Matching products… pricing… writing descriptions…' : undefined}
            />
          </section>
        )}

        {/* section 4 — partners & plan */}
        {stage === 'collection' && (
          <section id="section-partners" aria-label="Partners and plan" className="grid lg:grid-cols-2 gap-8 items-start">
            <CollabRadar />
            {state.dropPlan && <DropTimeline dropPlan={state.dropPlan} products={state.products} />}
          </section>
        )}

        {/* section 5 — export */}
        {stage === 'collection' && (
          <section id="section-export" aria-label="Export">
            <ExportBar />
          </section>
        )}
      </main>

      <ComparePanel open={compareOpen} onClose={() => setCompareOpen(false)} />
    </>
  )
}
