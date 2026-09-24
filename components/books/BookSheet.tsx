'use client'

/**
 * The book behind a typed title.
 *
 * Opened from the reading plan, where the row stays free text — that row is a
 * note to themselves and nothing here replaces it. This sheet is the upgrade:
 * find the actual book, and you get a cover, a real page count, a place to
 * say where you are, and the one thing nothing else can tell you — what this
 * book has to do with the era you are 9 days into.
 *
 * Every number it shows is either from the catalogue or typed by the reader.
 * When a page count is unknown — which is most of the time — it shows less
 * rather than estimating. See lib/books/progress.
 */

import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, Loader2, Search, Sparkles, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { trackFeature } from '@/lib/analytics/track'
import type { BookMatch } from '@/lib/books/lookup'
import { finishEstimate, progressLine } from '@/lib/books/progress'
import type { BookSummary } from '@/lib/books/summary'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/** The row as /api/books returns it. */
interface BookRow {
  id: string
  title: string
  author: string | null
  pages: number | null
  cover_url: string | null
  current_page: number | null
  current_page_at: string | null
  prev_page: number | null
  prev_page_at: string | null
  summary: BookSummary | null
  summary_day: number | null
  finished_at: string | null
}

const date = (v: string | null) => (v ? new Date(v) : null)

function stateOf(book: BookRow) {
  return {
    pages: book.pages,
    currentPage: book.current_page,
    currentPageAt: date(book.current_page_at),
    prevPage: book.prev_page,
    prevPageAt: date(book.prev_page_at),
  }
}

export function BookSheet({
  title,
  onClose,
  onChanged,
}: {
  title: string
  onClose: () => void
  /** So the caller can refresh a shelf it is showing. */
  onChanged?: () => void
}) {
  const [book, setBook] = useState<BookRow | null>(null)
  const [matches, setMatches] = useState<BookMatch[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [degraded, setDegraded] = useState(false)
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'unknown' | 'failed'>('idle')
  const [pageDraft, setPageDraft] = useState('')

  // Freeze the page behind — see PracticePlanSheet.
  useBodyScrollLock()

  /**
   * Already on the shelf, or still a string?
   *
   * Matched on title because the plan row has no id to point with — and the
   * plan row is deliberately staying free text, so it never will. Case and
   * spacing are ignored; that is the whole of the cleverness.
   */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/books')
      if (res.ok) {
        const data = await res.json()
        const all: BookRow[] = [...(data.reading ?? []), ...(data.finished ?? [])]
        const flat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '')
        const found = all.find(b => flat(b.title) === flat(title))
        if (found) {
          setBook(found)
          setPageDraft(found.current_page != null ? String(found.current_page) : '')
          setLoading(false)
          return
        }
      }
      // Not on the shelf — offer the catalogue.
      const search = await fetch(`/api/books/search?q=${encodeURIComponent(title)}`)
      if (search.ok) {
        const data = await search.json()
        setMatches(data.books ?? [])
        setDegraded(!!data.degraded)
        // A search that found nothing leaves no row behind, so without this
        // the funnel would show only the people it worked for.
        if (!data.books?.length) {
          trackFeature('books', 'use', data.degraded ? 'search_degraded' : 'no_match')
        }
      } else {
        setMatches([])
        setDegraded(true)
        trackFeature('books', 'use', 'search_failed')
      }
    } catch {
      setMatches([])
      setDegraded(true)
    } finally {
      setLoading(false)
    }
  }, [title])

  useEffect(() => { void load() }, [load])

  const pick = async (match: BookMatch) => {
    if (busy) return
    setBusy(true)
    haptic('light')
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: match.title,
          author: match.author,
          pages: match.pages,
          coverUrl: match.coverUrl,
          sourceId: match.id,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setBook(data.book)
        setMatches(null)
        onChanged?.()
        trackFeature('books', 'use', 'resolved')
      }
    } finally {
      setBusy(false)
    }
  }

  const patch = async (body: Record<string, unknown>) => {
    if (!book || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: book.id, ...body }),
      })
      if (res.ok) {
        const data = await res.json()
        setBook(data.book)
        onChanged?.()
      }
    } finally {
      setBusy(false)
    }
  }

  const savePage = () => {
    const n = Number(pageDraft)
    if (!Number.isFinite(n) || n < 0) return
    haptic('light')
    void patch({ page: Math.round(n) })
  }

  const askForSummary = async () => {
    if (!book?.author || summaryState === 'loading') return
    setSummaryState('loading')
    try {
      const res = await fetch('/api/books/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title, author: book.author }),
      })
      const data = await res.json().catch(() => ({}))

      if (data?.unknown) {
        // The model said it does not know this book. That is an answer, and
        // it is shown as one rather than retried into something invented.
        // Counted separately so the rate is visible — if most books come
        // back unknown the feature is not working, even though no error is.
        trackFeature('books', 'use', 'summary_unknown')
        setSummaryState('unknown')
        return
      }
      if (!res.ok || !data?.summary) {
        trackFeature('books', 'use', data?.problem ? `summary_refused:${data.problem}` : 'summary_failed')
        setSummaryState('failed')
        return
      }
      // Cached on the row so reopening costs nothing, with the era day it
      // was written for.
      await patch({ summary: data.summary, summaryDay: data.era?.day ?? null })
      trackFeature('books', 'complete', 'summary')
      setSummaryState('idle')
    } catch {
      setSummaryState('failed')
    }
  }

  const progress = book ? progressLine(stateOf(book)) : null
  const finish = book ? finishEstimate(stateOf(book)) : null

  return (
    /*
      Centred, not a bottom sheet.

      It was `justify-end` like the movement sheet it was modelled on, and
      that is right for a tall panel you scroll — but this one is short, so it
      sat as a small strip pinned to the very bottom of the screen, under the
      plan sheet it opened from, reading as something that had fallen off
      rather than something that had opened. The app already has a centred
      pattern for short pop-ups (MomentCard, DailySpark); this joins it.

      `max-h-[85dvh] overflow-y-auto overflow-x-hidden` stays: dvh rather than
      vh because a phone's URL bar makes vh taller than the screen, and the
      x-hidden is what stops the panel sliding sideways under a thumb.
    */
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label={book?.title ?? title}
    >
      <button
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-[#0b0b0b] px-5 pt-5 pb-5 max-h-[85dvh] overflow-y-auto overflow-x-hidden"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
              {book ? 'What you’re reading' : 'Find this book'}
            </p>
            <h2 className="text-2xl text-white mt-1 leading-tight" style={SERIF}>
              {book?.title ?? title}
            </h2>
            {book?.author && <p className="text-sm text-white/55 mt-0.5">{book.author}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 p-2 rounded-full text-white/40 hover:text-white hover:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading && (
          <div className="py-8 space-y-1.5">
            <div className="flex items-center gap-2 text-white/45 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Looking it up…
            </div>
            {/* Said out loud because it is true: the catalogue takes four to
                nine seconds to answer. A spinner with no explanation for that
                long reads as broken. */}
            <p className="text-[11px] text-white/30">The book catalogue is slow. A few seconds.</p>
          </div>
        )}

        {/* ── Choosing which book it is ─────────────────────────────── */}
        {!loading && matches && (
          <div className="mt-4">
            {matches.length === 0 ? (
              <p className="text-sm text-white/55 leading-relaxed">
                {degraded
                  ? 'Couldn’t reach the book catalogue just now. Your reading plan still has the title — nothing is lost.'
                  : 'No match for that title. Check the spelling, or keep it as it is: the plan works either way.'}
              </p>
            ) : (
              <>
                <p className="text-sm text-white/55 leading-relaxed flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 shrink-0" /> Which one is it?
                </p>
                <div className="mt-3 space-y-2">
                  {matches.map(match => (
                    <button
                      key={match.id}
                      onClick={() => pick(match)}
                      disabled={busy}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.12] text-left active:scale-[0.99] disabled:opacity-50"
                    >
                      {match.coverUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={match.coverUrl} alt="" className="w-10 h-14 object-cover rounded shrink-0 bg-white/[0.06]" />
                      ) : (
                        <div className="w-10 h-14 rounded shrink-0 bg-white/[0.06] grid place-items-center">
                          <BookOpen className="w-4 h-4 text-white/30" />
                        </div>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] text-white truncate">{match.title}</span>
                        <span className="block text-[12px] text-white/50 truncate">
                          {[match.author, match.year, match.pages ? `${match.pages} pages` : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── The book, once it is one ───────────────────────────────── */}
        {!loading && book && (
          <div className="mt-4 space-y-4">
            <div className="flex gap-3">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={book.cover_url} alt="" className="w-16 h-24 object-cover rounded-lg shrink-0 bg-white/[0.06]" />
              ) : (
                <div className="w-16 h-24 rounded-lg shrink-0 bg-white/[0.06] grid place-items-center">
                  <BookOpen className="w-5 h-5 text-white/30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {progress && <p className="text-sm text-white/70">{progress}</p>}
                {finish && (
                  // "recent pace", not "your pace": it is two readings, and
                  // saying so is the difference between a number you can
                  // argue with and one that sounds like a verdict.
                  <p className="text-[12px] text-white/45 mt-1 leading-relaxed">
                    About {finish.days} {finish.days === 1 ? 'day' : 'days'} left at your recent pace
                    {' '}({finish.pace} {finish.pace === 1 ? 'page' : 'pages'} a day).
                  </p>
                )}
                {book.finished_at && (
                  <p className="text-[12px] text-white/45 mt-1">Finished.</p>
                )}
              </div>
            </div>

            {!book.finished_at && (
              <div>
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/45" htmlFor="book-page">
                  Page you’re on
                </label>
                <div className="flex gap-2 mt-2">
                  <input
                    id="book-page"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={pageDraft}
                    onChange={e => setPageDraft(e.target.value)}
                    placeholder={book.current_page != null ? String(book.current_page) : '0'}
                    className="w-24 shrink-0 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/25 text-center"
                  />
                  <button
                    onClick={savePage}
                    disabled={busy || !pageDraft.trim()}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[14px] text-white disabled:opacity-40 active:scale-[0.99]"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* ── What Voxu makes of it ───────────────────────────────── */}
            {book.summary ? (
              <div className="rounded-2xl border border-white/[0.12] bg-white/[0.04] p-4 space-y-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">What Voxu makes of it</p>
                <p className="text-[14px] text-white/75 leading-relaxed">{book.summary.about}</p>
                <div className="border-l-2 border-white/25 pl-3">
                  <p className="text-[14px] text-white leading-relaxed">{book.summary.forYourEra}</p>
                </div>
                {book.summary.whileYouRead && (
                  <p className="text-[13px] text-white/55 leading-relaxed">{book.summary.whileYouRead}</p>
                )}
                <p className="text-[11px] text-white/30 leading-relaxed">
                  Voxu hasn’t read this book — that’s a pointer, not a substitute.
                </p>
                {/*
                  What `summary_day` is for. It was being written and never
                  read, so a card composed on day 3 sat unchanged on day 27
                  — and the middle paragraph is explicitly about the day
                  somebody is on, which makes a stale one quietly wrong.

                  It says when it was written and offers a rewrite; it does
                  not refresh itself. A card that silently changed under
                  somebody would be worse, and each rewrite costs a call.
                */}
                <div className="flex items-center justify-between gap-3 pt-1">
                  {book.summary_day != null ? (
                    <p className="text-[11px] text-white/30">Written on day {book.summary_day}.</p>
                  ) : (
                    <span />
                  )}
                  <button
                    onClick={() => { setSummaryState('idle'); void patch({ summary: null }) }}
                    disabled={busy}
                    className="text-[11px] text-white/45 underline underline-offset-4 decoration-white/15 disabled:opacity-40 shrink-0"
                  >
                    Write it again
                  </button>
                </div>
              </div>
            ) : summaryState === 'unknown' ? (
              <p className="text-sm text-white/55 leading-relaxed">
                Voxu doesn’t know this one well enough to say anything true about it, so it isn’t going to guess.
              </p>
            ) : summaryState === 'failed' ? (
              <p className="text-sm text-white/55 leading-relaxed">Couldn’t do that just now. Try again in a moment.</p>
            ) : book.author ? (
              <button
                onClick={askForSummary}
                disabled={summaryState === 'loading'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-60 active:scale-[0.99]"
              >
                {summaryState === 'loading' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Reading up on it…</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> What this has to do with your era</>
                )}
              </button>
            ) : null}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { haptic(book.finished_at ? 'light' : 'success'); void patch({ finished: !book.finished_at }) }}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[13px] text-white/70 disabled:opacity-40 active:scale-[0.99]"
              >
                <Check className="w-3.5 h-3.5" />
                {book.finished_at ? 'Not finished after all' : 'Finished it'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
