'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Headphones, Play, Search, Waves, X, type LucideIcon } from 'lucide-react'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { browse, searchHome, type SearchItem, type SearchKind } from '@/lib/search/home-search'

const KIND_ICON: Record<SearchKind, LucideIcon> = {
  page: ChevronRight,
  soundscape: Waves,
  guide: Headphones,
}

/**
 * Explore's search: pages, soundscapes and guided sessions
 * (lib/search/home-search.ts). Audio results play in place through the
 * handlers the shelves already use; pages navigate.
 *
 * Search is search now: the places live in the menu (the spiral). With
 * nothing typed it opens on Browse — every guided session, every
 * soundscape — and pages are still found by typing their name.
 */
export function SearchSheet({
  onClose,
  onPlaySoundscape,
  onPlayGuide,
  initialKind = null,
}: {
  /** Open straight onto one Browse list (the menu's Guided / Soundscapes). */
  initialKind?: 'guide' | 'soundscape' | null
  onClose: () => void
  onPlaySoundscape: (id: string) => void
  onPlayGuide: (id: string, name: string) => void
}) {
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'guide' | 'soundscape' | null>(initialKind)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    // After the sheet's own entrance, so iOS raises the keyboard reliably.
    const t = window.setTimeout(() => inputRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', onKey) }
  }, [onClose])

  const results = useMemo(
    () => (query.trim() ? searchHome(query) : kind ? browse(kind) : []),
    [query, kind],
  )

  const act = (item: SearchItem) => {
    if (item.kind === 'soundscape') onPlaySoundscape(item.id)
    else if (item.kind === 'guide') onPlayGuide(item.id, item.title)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm animate-fade-in"
    >
      <ScrollLock />
      <div className="h-[100dvh] flex flex-col md:max-w-[680px] md:mx-auto">
        <div className="safe-area-pt px-5 pt-3 pb-3 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2.5 rounded-2xl border border-white/[0.14] bg-white/[0.05] px-3.5">
            <Search className="w-4 h-4 text-white/50 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search Voxu"
              enterKeyHint="search"
              autoCapitalize="none"
              autoCorrect="off"
              aria-label="Search Voxu"
              className="flex-1 bg-transparent py-3 text-[16px] text-white placeholder:text-white/35 outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search" className="p-1 text-white/45">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button onClick={onClose} className="text-[14px] text-white/70 px-1 py-2">
            Cancel
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          {!query.trim() && !kind && (
            <>
              <p className="text-[10px] tracking-[0.24em] uppercase text-white/40 mt-2 mb-1.5">Browse</p>
              <ul className="divide-y divide-white/[0.07]">
                {([['guide', 'Guided sessions', 'Breathing, focus, sleep, confidence', Headphones], ['soundscape', 'Soundscapes', 'Ambient sound for any moment', Waves]] as const).map(([k, title, sub, Icon]) => (
                  <li key={k}>
                    <button onClick={() => setKind(k)} className="w-full text-left flex items-center gap-3 py-3 press-scale">
                      <span className="w-9 h-9 shrink-0 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white/75" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] text-white">{title}</span>
                        <span className="block text-[12px] text-white/45">{sub}</span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/40 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          {!query.trim() && kind && (
            <button onClick={() => setKind(null)} className="text-[12px] text-white/55 mt-2 mb-1 flex items-center gap-1">
              ‹ Browse
            </button>
          )}
          {query.trim() && results.length === 0 && (
            <p className="text-[14px] text-white/50 mt-6 text-center">Nothing matches &ldquo;{query.trim()}&rdquo;.</p>
          )}
          <ul className="divide-y divide-white/[0.07]">
            {results.map(item => {
              const Icon = KIND_ICON[item.kind]
              const body = (
                <>
                  <span className="w-9 h-9 shrink-0 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
                    {item.kind === 'page' ? (
                      <ChevronRight className="w-4 h-4 text-white/60" />
                    ) : (
                      <Icon className="w-4 h-4 text-white/75" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] text-white truncate">{item.title}</span>
                    <span className="block text-[12px] text-white/45 truncate">{item.subtitle}</span>
                  </span>
                  {item.kind !== 'page' && <Play className="w-4 h-4 text-white/50 shrink-0" />}
                </>
              )
              return (
                <li key={`${item.kind}-${item.id}`}>
                  {item.kind === 'page' && item.href ? (
                    <Link href={item.href} onClick={onClose} className="flex items-center gap-3 py-3 press-scale">
                      {body}
                    </Link>
                  ) : (
                    <button onClick={() => act(item)} className="w-full text-left flex items-center gap-3 py-3 press-scale">
                      {body}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
