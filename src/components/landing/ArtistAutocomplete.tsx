'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { apiSearch, type SearchResult } from '@/lib/api-client'
import { Skeleton } from '@/components/ui/Skeleton'

export interface ArtistAutocompleteProps {
  value: string
  onChange: (value: string, artist?: { id: string; name: string }) => void
  onSelect?: (artist: { id: string; name: string }) => void
}

/** Combobox: input role="combobox" + listbox, keyboard navigable (↑ ↓ Enter Esc). */
export function ArtistAutocomplete({ value, onChange, onSelect }: ArtistAutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const inputId = 'artist-search'
  const listId = 'artist-search-listbox'

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.trim().length < 2 || value.includes(' ')) {
      // multi-word → treat as free description, close dropdown
      setOpen(false)
      setResults(null)
      return
    }
    if (value.trim().length === 2 || value.trim().length > 2) {
      debounceRef.current = setTimeout(async () => {
        setLoading(true)
        setError(false)
        try {
          const res = await apiSearch(value.trim(), 'entity', 'artist')
          setResults(res.results)
          setOpen(true)
          setActiveIndex(-1)
        } catch {
          setError(true)
          setResults([])
          setOpen(true)
        } finally {
          setLoading(false)
        }
      }, 300)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  const select = (r: SearchResult) => {
    onChange(r.name, { id: r.id, name: r.name })
    onSelect?.({ id: r.id, name: r.name })
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || !results) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(results.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(-1, i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      e.preventDefault()
      select(results[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label htmlFor={inputId} className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
        Artist or creator name <span className="text-mute normal-case tracking-normal">(optional)</span>
      </label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mute pointer-events-none" aria-hidden />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 && results?.[activeIndex] ? `${listId}-opt-${activeIndex}` : undefined}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results && results.length >= 0 && setOpen(true)}
          placeholder="Search an artist…"
          className="w-full bg-paper-2 text-ink placeholder:text-mute font-sans text-base border-2 border-ink rounded-sm pl-10 pr-3 py-2.5 min-h-11 focus:outline-none focus:bg-paper focus:ring-4 focus:ring-cobalt/40"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-mute" aria-hidden />
        )}
      </div>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label="Artist suggestions"
          className="absolute z-30 left-0 right-0 mt-1 bg-paper border-2 border-ink shadow-hard max-h-64 overflow-auto nice-scroll"
        >
          {loading && results === null && (
            <>
              <li className="px-3 py-3" aria-hidden><Skeleton className="h-5 w-3/4" /></li>
              <li className="px-3 py-3" aria-hidden><Skeleton className="h-5 w-2/3" /></li>
              <li className="px-3 py-3" aria-hidden><Skeleton className="h-5 w-1/2" /></li>
            </>
          )}
          {!loading && results && results.length === 0 && !error && (
            <li className="px-3 py-3 text-sm text-ink-2" role="option" aria-selected={false} aria-disabled>
              No artists found — describe your fans instead
            </li>
          )}
          {error && (
            <li className="px-3 py-3 text-sm text-ink-2" role="option" aria-selected={false} aria-disabled>
              Search unavailable — you can still describe your fans.
            </li>
          )}
          {results?.map((r, i) => (
            <li key={r.id} id={`${listId}-opt-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                onClick={() => select(r)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full text-left px-3 py-2.5 min-h-11 flex items-center gap-3 ${
                  i === activeIndex ? 'bg-acid' : 'hover:bg-paper-3'
                } transition-colors`}
              >
                <span
                  className="h-8 w-8 rounded-full border-2 border-ink bg-paper-3 flex items-center justify-center font-display text-xs shrink-0"
                  aria-hidden
                >
                  {r.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-ink truncate">{r.name}</span>
                  <span className="block text-xs text-mute">{r.hint ?? r.type}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
