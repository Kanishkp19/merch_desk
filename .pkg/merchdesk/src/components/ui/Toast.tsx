'use client'

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  action?: ToastAction
  duration: number | 'manual'
}

interface ToastApi {
  success: (message: string, action?: ToastAction) => void
  error: (message: string) => void
  info: (message: string, action?: ToastAction, duration?: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-5 w-5 text-leaf shrink-0" aria-hidden />,
  error: <XCircle className="h-5 w-5 text-tomato-deep shrink-0" aria-hidden />,
  info: <Info className="h-5 w-5 text-cobalt shrink-0" aria-hidden />,
}

const ACCENT: Record<ToastKind, string> = {
  success: 'bg-leaf',
  error: 'bg-tomato-deep',
  info: 'bg-cobalt',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (kind: ToastKind, message: string, action?: ToastAction, duration: number | 'manual' = kind === 'error' ? 'manual' : 4000) => {
      const id = ++seq.current
      setToasts((t) => [...t.slice(-3), { id, kind, message, action, duration }])
      if (duration !== 'manual') {
        window.setTimeout(() => dismiss(id), duration)
      }
    },
    [dismiss]
  )

  const api = useMemo<ToastApi>(
    () => ({
      success: (message, action) => push('success', message, action, 3000),
      error: (message) => push('error', message),
      info: (message, action, duration) => push('info', message, action, duration ?? 5000),
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed bottom-4 right-4 md:right-6 z-[60] flex flex-col gap-2 max-md:left-4"
        role="status"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'bg-paper border-2 border-ink shadow-hard rounded-sm text-sm flex items-start gap-3 w-full md:w-96 p-0 overflow-hidden',
              'animate-[toast-in_200ms_ease-out]'
            )}
            role={t.kind === 'error' ? 'alert' : undefined}
          >
            <span className={cn('w-1.5 self-stretch shrink-0', ACCENT[t.kind])} aria-hidden />
            <div className="flex items-start gap-3 py-3 pr-2 flex-1">
              {ICONS[t.kind]}
              <span className="flex-1 text-ink-2 font-medium leading-snug">{t.message}</span>
              {t.action && (
                <button
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                  className="font-display uppercase text-xs tracking-wide underline underline-offset-4 hover:bg-acid px-2 py-1 -m-1 rounded-sm"
                >
                  {t.action.label}
                </button>
              )}
              {t.duration === 'manual' && (
                <button
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  className="text-mute hover:text-ink px-1"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <style>{`@keyframes toast-in { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }`}</style>
    </ToastContext.Provider>
  )
}
