'use client'

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { AgentEvent, StudioInput, TasteProfile } from '@/types'
import {
  initialStudioState,
  loadPersistedState,
  persistState,
  studioReducer,
  type StudioState,
} from './studio-reducer'
import {
  ApiClientError,
  apiAgentProfile,
  apiCollabs,
  apiCollection,
  apiCompare,
  apiDescribe,
  apiImage,
  apiGetStatus,
  apiReplace,
} from '@/lib/api-client'
import { useToast } from '@/components/ui/Toast'

export interface StudioApi {
  state: StudioState
  hydrated: boolean
  replaceLoading: boolean
  startRun: (input: StudioInput) => Promise<void>
  rerun: () => Promise<void>
  removeChip: (index: number) => void
  addChip: (tag: { name: string; qlooTagId?: string }) => void
  buildCollection: () => Promise<void>
  tweakProduct: (productId: string, instruction: string) => Promise<void>
  editProductText: (productId: string, text: string) => void
  undoText: (productId: string) => void
  approveAndGenerate: (productId: string) => Promise<void>
  regenerateImage: (productId: string) => Promise<void>
  keepProduct: (productId: string) => void
  rejectProduct: (productId: string) => void
  undoReject: (productId: string) => void
  loadCollabs: (city: string) => Promise<void>
  loadCompare: () => Promise<void>
  resetAll: () => void
  setMaxImages: (max: number) => void
}

const StudioContext = createContext<StudioApi | null>(null)

export function useStudio(): StudioApi {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used inside StudioProvider')
  return ctx
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(studioReducer, initialStudioState)
  const [hydrated, setHydrated] = useState(false)
  const [replaceLoading, setReplaceLoading] = useState(false)
  const toast = useToast()
  const stateRef = useRef(state)
  stateRef.current = state

  // ---- hydration (after mount, never during render) ----
  useEffect(() => {
    const persisted = loadPersistedState()
    if (persisted && persisted.stage !== 'idle' && persisted.input) {
      dispatch({ type: 'HYDRATED', state: persisted })
    }
    setHydrated(true)
    apiGetStatus()
      .then((s) => dispatch({ type: 'SET_MAX_IMAGES', max: s.maxImagesPerSession }))
      .catch(() => undefined)
  }, [])

  // ---- persistence (text-only mirror; images stay in memory) ----
  useEffect(() => {
    if (!hydrated) return
    if (state.stage === 'idle') return
    persistState(state)
  }, [state, hydrated])

  // ================================================================ run
  const runAgent = useCallback(
    async (input: StudioInput) => {
      dispatch({ type: 'RUN_STARTED', input })
      try {
        await apiAgentProfile(input, (event: AgentEvent) => {
          dispatch({ type: 'AGENT_EVENT', event })
          if (event.type === 'profile') {
            dispatch({ type: 'PROFILE_READY', profile: event.profile })
          }
          if (event.type === 'error') {
            dispatch({ type: 'ERROR', error: { code: event.code, message: event.message } })
          }
        })
        // if no profile arrived (edge), surface error
        if (!stateRef.current.profile && stateRef.current.stage === 'profiling') {
          dispatch({ type: 'ERROR', error: { code: 'INTERNAL', message: 'The agent finished without a profile. Try again.' } })
        }
      } catch (err) {
        if (err instanceof ApiClientError) {
          dispatch({ type: 'ERROR', error: { code: err.code, message: err.message } })
        } else {
          dispatch({ type: 'ERROR', error: { code: 'NETWORK', message: 'Connection problem — try again' } })
          toast.error('Connection problem — try again')
        }
      }
    },
    [toast]
  )

  const startRun = useCallback(
    async (input: StudioInput) => {
      await runAgent(input)
    },
    [runAgent]
  )

  const rerun = useCallback(async () => {
    const input = stateRef.current.input
    if (!input) return
    dispatch({ type: 'RESET_PROFILE' })
    await runAgent(input)
  }, [runAgent])

  // ========================================================== profile chips
  const removeChip = useCallback((index: number) => dispatch({ type: 'CHIP_REMOVED', index }), [])
  const addChip = useCallback((tag: { name: string; qlooTagId?: string }) => dispatch({ type: 'CHIP_ADDED', tag }), [])

  // ========================================================== collection
  const buildCollection = useCallback(async () => {
    const { input, profile } = stateRef.current
    if (!input || !profile) return
    dispatch({ type: 'COLLECTION_REQUESTED' })
    try {
      const res = await apiCollection(input, profile)
      dispatch({ type: 'COLLECTION_READY', products: res.products, dropPlan: res.dropPlan, meta: res.meta })
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Connection problem — try again'
      dispatch({ type: 'ERROR', error: { code: err instanceof ApiClientError ? err.code : 'NETWORK', message } })
      if (!(err instanceof ApiClientError)) toast.error('Connection problem — try again')
    }
  }, [toast])

  // ========================================================== descriptions
  const tweakProduct = useCallback(
    async (productId: string, instruction: string) => {
      const product = stateRef.current.products.find((p) => p.id === productId)
      const profile = stateRef.current.profile
      if (!product || !profile) return
      try {
        const res = await apiDescribe({
          productId,
          currentDescription: product.description.text,
          instruction,
          paletteId: profile.paletteId,
          profileTags: profile.tags.slice(0, 8).map((t) => t.canonical ?? t.name),
        })
        dispatch({ type: 'TWEAK_OK', productId, text: res.description, source: res.source === 'llm' ? 'llm' : 'template' })
        toast.success('Description updated', {
          label: 'Undo',
          onClick: () => dispatch({ type: 'UNDO_TEXT', productId }),
        })
      } catch {
        toast.error('Could not revise the description — try again')
      }
    },
    [toast]
  )

  const editProductText = useCallback((productId: string, text: string) => {
    dispatch({ type: 'EDIT_TEXT', productId, text, source: 'user' })
  }, [])

  const undoText = useCallback((productId: string) => {
    dispatch({ type: 'UNDO_TEXT', productId })
  }, [])

  // ========================================================== image (the gate)
  const requestImage = useCallback(
    async (productId: string, attempt: number) => {
      const product = stateRef.current.products.find((p) => p.id === productId)
      const profile = stateRef.current.profile
      if (!product || !profile) return
      dispatch({ type: 'IMAGE_REQUESTED', productId })
      try {
        const res = await apiImage({
          productId,
          approved: true,
          approvedDescription: product.description.text,
          paletteId: profile.paletteId,
          attempt: Math.min(3, Math.max(1, attempt)),
          artistName: profile.artist?.name ?? stateRef.current.input?.artist?.name,
          brandNames: profile.brands.map((b) => b.name),
        })
        dispatch({ type: 'IMAGE_OK', productId, dataUrl: res.imageDataUrl })
        toast.success(`Image ready — ${product.name}`)
      } catch (err) {
        if (err instanceof ApiClientError) {
          if (err.code === 'IMAGE_QUOTA') {
            dispatch({ type: 'IMAGE_QUOTA', productId })
            toast.info('Free image quota used for today')
          } else if (err.code === 'RATE_LIMITED') {
            dispatch({ type: 'IMAGE_FAIL', productId, error: err.message })
            toast.error(err.message)
          } else if (err.code === 'MODERATION_BLOCKED') {
            dispatch({ type: 'IMAGE_FAIL', productId, error: err.message })
            toast.error(err.message)
          } else {
            dispatch({ type: 'IMAGE_FAIL', productId, error: 'Image generation failed — try again' })
            toast.error('Image generation failed — try again')
          }
        } else {
          dispatch({ type: 'IMAGE_FAIL', productId, error: 'Connection problem — try again' })
          toast.error('Connection problem — try again')
        }
      }
    },
    [toast]
  )

  const approveAndGenerate = useCallback(
    async (productId: string) => {
      const product = stateRef.current.products.find((p) => p.id === productId)
      if (!product) return
      // session cap check — client-side guard for the free quota
      if (stateRef.current.imagesGenerated >= stateRef.current.maxImages) {
        dispatch({ type: 'SESSION_CAP', productId })
        toast.info(`You've reached this session's image limit (${stateRef.current.maxImages}).`)
        return
      }
      if (!product.description.text || product.description.text.length > 600) return
      dispatch({ type: 'APPROVE', productId })
      await requestImage(productId, product.image.attempts + 1)
    },
    [requestImage]
  )

  const regenerateImage = useCallback(
    async (productId: string) => {
      const product = stateRef.current.products.find((p) => p.id === productId)
      if (!product) return
      if (product.image.attempts >= 3) return
      if (stateRef.current.imagesGenerated >= stateRef.current.maxImages) {
        dispatch({ type: 'SESSION_CAP', productId })
        toast.info(`You've reached this session's image limit (${stateRef.current.maxImages}).`)
        return
      }
      dispatch({ type: 'REGENERATE', productId })
      await requestImage(productId, product.image.attempts + 1)
    },
    [requestImage]
  )

  const keepProduct = useCallback((productId: string) => {
    dispatch({ type: 'KEEP', productId })
  }, [])

  // ========================================================== reject/replace
  const rejectProduct = useCallback(
    (productId: string) => {
      const product = stateRef.current.products.find((p) => p.id === productId)
      if (!product) return
      const excludedEntityIds = [
        ...(product.evidence.filter((e) => e.entityId).map((e) => e.entityId as string)),
      ]
      const currentIds = stateRef.current.products.map((p) => p.id)
      const input = stateRef.current.input
      const profile = stateRef.current.profile
      const budget = input?.budget ?? 'medium'

      dispatch({ type: 'REJECT', productId })

      let undone = false
      toast.info(
        `Removed ${product.name}`,
        {
          label: 'Undo',
          onClick: () => {
            undone = true
            dispatch({ type: 'UNDO_REJECT', productId })
            // re-insert the product at its old position
            dispatch({ type: 'REPLACE_OK', product })
            dispatch({ type: 'REPLACE_CLEAR' })
          },
        },
        5000
      )

      window.setTimeout(
        async () => {
          if (undone || !input || !profile) return
          setReplaceLoading(true)
          try {
            const res = await apiReplace({
              input,
              profile,
              currentProductIds: currentIds,
              rejectedProductId: productId,
              excludeEntityIds: excludedEntityIds.slice(0, 30),
              positiveEntityIds: [],
              budget,
              creatorType: input.creatorType,
            })
            if (res.product) {
              dispatch({ type: 'REPLACE_OK', product: res.product })
              dispatch({
                type: 'AGENT_EVENT',
                event: { type: 'note', text: `replace: excluded ${excludedEntityIds.length} entities — swapped in ${res.product.name}` },
              })
              toast.success(`Replaced with ${res.product.name}`)
            } else {
              dispatch({ type: 'REPLACE_NONE' })
            }
          } catch {
            dispatch({ type: 'REPLACE_NONE' })
          } finally {
            setReplaceLoading(false)
          }
        },
        5000
      )
    },
    [toast]
  )

  const undoReject = useCallback((productId: string) => {
    dispatch({ type: 'UNDO_REJECT', productId })
  }, [])

  // ========================================================== collabs
  const loadCollabs = useCallback(
    async (city: string) => {
      const { profile, products } = stateRef.current
      if (!profile) return
      try {
        const res = await apiCollabs({ profile, city, productIds: products.map((p) => p.id) })
        dispatch({ type: 'COLLABS_READY', collabs: res.collabs, cityNote: res.cityNote })
      } catch (err) {
        const message = err instanceof ApiClientError ? err.message : 'Connection problem — try again'
        dispatch({ type: 'ERROR', error: { code: 'COLLABS', message } })
      }
    },
    []
  )

  // ========================================================== compare
  const loadCompare = useCallback(async () => {
    const { generic, genericLoading, input } = stateRef.current
    if (generic || genericLoading || !input) return
    dispatch({ type: 'GENERIC_LOADING', loading: true })
    try {
      const res = await apiCompare({ input, count: stateRef.current.products.length || 6 })
      dispatch({ type: 'GENERIC_READY', generic: res.generic })
    } catch {
      dispatch({ type: 'GENERIC_LOADING', loading: false })
    }
  }, [])

  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET' })
    try {
      sessionStorage.removeItem('merchdesk:v1')
    } catch {
      /* ignore */
    }
  }, [])

  const setMaxImages = useCallback((max: number) => dispatch({ type: 'SET_MAX_IMAGES', max }), [])

  const value = useMemo<StudioApi>(
    () => ({
      state,
      hydrated,
      replaceLoading,
      startRun,
      rerun,
      removeChip,
      addChip,
      buildCollection,
      tweakProduct,
      editProductText,
      undoText,
      approveAndGenerate,
      regenerateImage,
      keepProduct,
      rejectProduct,
      undoReject,
      loadCollabs,
      loadCompare,
      resetAll,
      setMaxImages,
    }),
    [
      state,
      hydrated,
      replaceLoading,
      startRun,
      rerun,
      removeChip,
      addChip,
      buildCollection,
      tweakProduct,
      editProductText,
      undoText,
      approveAndGenerate,
      regenerateImage,
      keepProduct,
      rejectProduct,
      undoReject,
      loadCollabs,
      loadCompare,
      resetAll,
      setMaxImages,
    ]
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}
