'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const fieldClasses =
  'w-full bg-paper-2 text-ink placeholder:text-mute font-sans text-base border-2 border-ink rounded-sm px-3 py-2.5 min-h-11 focus:outline-none focus:bg-paper focus:ring-4 focus:ring-cobalt/40 aria-[invalid=true]:border-tomato-deep aria-[invalid=true]:bg-[#FFF1EE] disabled:opacity-50'

export function FieldLabel({
  htmlFor,
  children,
  optional = false,
  errorId,
}: {
  htmlFor: string
  children: React.ReactNode
  optional?: boolean
  errorId?: string
}) {
  return (
    <label htmlFor={htmlFor} className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
      {children}
      {optional && <span className="text-mute normal-case tracking-normal"> (optional)</span>}
      {errorId ? null : null}
    </label>
  )
}

export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-tomato-deep font-medium flex items-center gap-1.5">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  optional?: boolean
  error?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, optional, error, id, className, ...props },
  ref
) {
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'field'
  const errorId = `${inputId}-error`
  return (
    <div className="w-full">
      {label && <FieldLabel htmlFor={inputId} optional={optional}>{label}</FieldLabel>}
      <input
        ref={ref}
        id={inputId}
        className={cn(fieldClasses, className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
})

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  optional?: boolean
  error?: string
  counter?: boolean
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, optional, error, counter, id, className, maxLength, value, ...props },
  ref
) {
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'field'
  const errorId = `${inputId}-error`
  const length = typeof value === 'string' ? value.length : 0
  return (
    <div className="w-full">
      {label && <FieldLabel htmlFor={inputId} optional={optional}>{label}</FieldLabel>}
      <textarea
        ref={ref}
        id={inputId}
        className={cn(fieldClasses, 'min-h-28 resize-y', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        maxLength={maxLength}
        value={value}
        {...props}
      />
      <div className="flex justify-between items-start">
        <FieldError id={errorId}>{error}</FieldError>
        {counter && maxLength && (
          <span
            className={cn(
              'text-xs text-mute ml-auto',
              length >= maxLength && 'text-tomato-deep'
            )}
            aria-hidden
          >
            {length}/{maxLength}
          </span>
        )}
      </div>
    </div>
  )
})

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  optional?: boolean
  error?: string
  options: Array<{ value: string; label: string }>
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, optional, error, options, id, className, ...props },
  ref
) {
  const inputId = id ?? props.name ?? label?.toLowerCase().replace(/\s+/g, '-') ?? 'field'
  const errorId = `${inputId}-error`
  return (
    <div className="w-full">
      {label && <FieldLabel htmlFor={inputId} optional={optional}>{label}</FieldLabel>}
      <select
        ref={ref}
        id={inputId}
        className={cn(fieldClasses, 'appearance-none bg-[url(\'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%3E%3Cpath%20d%3D%22M1%201l5%205%205-5%22%20stroke%3D%22%2314110F%22%20stroke-width%3D%222%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E\')] bg-[position:right_0.9rem_center] bg-no-repeat pr-10', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  )
})
