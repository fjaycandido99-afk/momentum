'use client'

/* ============================================================================
   Journal History — full archive of past entries surfaced as a scrollable
   timeline grouped by month. Each card shows the date, mood, content
   preview, and the AI "Battle Report" reflection inline. Tap any card to
   open that day in the main journal (date-picker jumps to the entry).

   Why a dedicated page: in the main journal, past entries are buried
   behind the date-picker chevrons — users can only walk back one day at
   a time. This page is the deep archive — scan a month, find the one
   you remember, jump straight to it.

   Auto-bookmarked reflections (see /api/daily-guide/journal POST) ALSO
   show up on /saved as a "Reflection" collection, so users have two
   doors into the same content: chronological (here) and curated (saved).
   ============================================================================ */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Sparkles, BookOpen, Search } from 'lucide-react'

interface JournalEntry {
  date: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_learned?: string | null
  journal_intention?: string | null
  journal_freetext?: string | null
  journal_mood?: string | null
  journal_dream?: string | null
  journal_ai_reflection?: string | null
  journal_tags?: string[]
}

const MOOD_GLYPH: Record<string, string> = {
  awful: '😞', low: '🙁', sad: '😢', anxious: '😰', angry: '😠',
  okay: '😐', good: '🙂', great: '😄',
}

function formatDayLong(dateStr: string): string {
  // YYYY-MM-DD parsed as LOCAL to avoid the off-by-one tz shift.
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function monthKey(dateStr: string): string {
  const [y, m] = dateStr.split('T')[0].split('-').map(Number)
  if (!y || !m) return ''
  const dt = new Date(y, m - 1, 1)
  return dt.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function previewOf(entry: JournalEntry): string {
  return (
    entry.journal_win
    || entry.journal_freetext
    || entry.journal_intention
    || entry.journal_gratitude
    || entry.journal_dream
    || ''
  ).trim()
}

export default function JournalHistoryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // Fetch the last 365 days. The journal API supports start/end
        // and returns all entries with reflection + tags included.
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 365)
        const res = await fetch(
          `/api/daily-guide/journal?startDate=${start.toISOString()}&endDate=${end.toISOString()}`,
        )
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        if (cancelled) return
        const items: JournalEntry[] = (data.entries || []).filter(
          (e: JournalEntry) =>
            previewOf(e) || e.journal_ai_reflection || e.journal_mood,
        )
        // Reverse-chronological (most recent first).
        items.sort((a, b) => (a.date < b.date ? 1 : -1))
        setEntries(items)
      } catch (err) {
        console.error('[journal/history] load failed:', err)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  // Search filter — matches preview text + reflection + tags.
  const filtered = useMemo(() => {
    if (!query.trim()) return entries
    const q = query.toLowerCase()
    return entries.filter(e => {
      const text = [
        previewOf(e),
        e.journal_ai_reflection || '',
        ...(e.journal_tags || []),
      ].join(' ').toLowerCase()
      return text.includes(q)
    })
  }, [entries, query])

  // Group by month so the timeline reads as discrete chapters.
  const grouped = useMemo(() => {
    const out: { label: string; items: JournalEntry[] }[] = []
    for (const e of filtered) {
      const label = monthKey(e.date)
      const last = out[out.length - 1]
      if (last && last.label === label) last.items.push(e)
      else out.push({ label, items: [e] })
    }
    return out
  }, [filtered])

  const openEntry = (dateStr: string) => {
    // Pass the date to /journal so its picker can jump there.
    const ymd = dateStr.split('T')[0]
    router.push(`/journal?date=${ymd}`)
  }

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 px-6 pt-12 pb-3 bg-black">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/journal"
            aria-label="Back to journal"
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/75" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Your history</h1>
        </div>
        <p className="text-xs text-white/55 mb-4">
          Every entry from the last year. Tap any to open that day.
        </p>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search entries, reflections, tags…"
            className="w-full pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/50 bg-white/[0.04] border border-white/15 rounded-xl focus:outline-none focus:ring-1 focus:ring-white/40"
          />
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && entries.length === 0 && (
        <div className="text-center py-20 px-6">
          <BookOpen className="w-10 h-10 text-white/30 mx-auto mb-3" strokeWidth={1.4} />
          <p className="text-white/70 text-sm">No entries yet.</p>
          <Link href="/journal" className="inline-block mt-4 px-5 py-2 rounded-full bg-white text-black text-sm font-medium press-scale">
            Write your first one
          </Link>
        </div>
      )}

      {/* No search matches */}
      {!isLoading && entries.length > 0 && filtered.length === 0 && (
        <p className="text-center text-sm text-white/55 py-12">No entries match &ldquo;{query}&rdquo;.</p>
      )}

      {/* Timeline */}
      {!isLoading && grouped.length > 0 && (
        <div className="px-6">
          {grouped.map(group => (
            <section key={group.label} className="mb-8">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45 mb-3">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.items.map(entry => {
                  const preview = previewOf(entry)
                  const moodGlyph = entry.journal_mood && MOOD_GLYPH[entry.journal_mood.toLowerCase()]
                  return (
                    <button
                      key={entry.date}
                      onClick={() => openEntry(entry.date)}
                      className="group w-full text-left p-4 rounded-2xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/15 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[11px] text-white/55 uppercase tracking-wide">
                          {formatDayLong(entry.date)}
                        </span>
                        {moodGlyph && (
                          <span className="text-sm" aria-label={`Mood: ${entry.journal_mood}`}>
                            {moodGlyph}
                          </span>
                        )}
                        {entry.journal_ai_reflection && (
                          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[10px] text-white/65">
                            <Sparkles className="w-3 h-3" /> Reflection
                          </span>
                        )}
                      </div>
                      {preview && (
                        <p className="text-[15px] text-white/85 leading-snug line-clamp-3">
                          {preview}
                        </p>
                      )}
                      {entry.journal_ai_reflection && (
                        <p className="mt-2.5 pt-2.5 border-t border-white/[0.06] text-[13px] italic text-white/65 line-clamp-2">
                          &ldquo;{entry.journal_ai_reflection.replace(/^"|"$/g, '')}&rdquo;
                        </p>
                      )}
                      {entry.journal_tags && entry.journal_tags.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {entry.journal_tags.slice(0, 4).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.05] text-[10px] text-white/60">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
