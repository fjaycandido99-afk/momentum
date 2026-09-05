'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Compass, Loader2, Check } from 'lucide-react'

interface BatchItem { id: string; text: string }
interface Batch {
  items: BatchItem[]
  scale: { score: number; label: string }[]
  answered: number
  needed: number
  hasRead: boolean
}

/**
 * Daily Read — a run of items in one sitting.
 *
 * A full page rather than a sheet: this is a deliberate task someone chose to
 * start, not an interruption, and up to twelve questions needs room. It also
 * means the hardware back button behaves like it does anywhere else.
 *
 * One item on screen at a time, never a scrolling list. A list invites
 * answering straight down one column without reading, which is worse data
 * than no data — the same reason the scale is five points and not seven.
 *
 * Monochrome, like the rest of the app.
 */
export default function DailyReadPage() {
  const router = useRouter()
  const [batch, setBatch] = useState<Batch | null>(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/assessment/batch')
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled) return
        setBatch(d)
        setAnswered(d?.answered ?? 0)
        if (!d?.items?.length) setFinished(true)
      })
      .catch(() => { if (!cancelled) setFinished(true) })
    return () => { cancelled = true }
  }, [])

  const current = batch?.items[index]
  const total = batch?.items.length ?? 0
  const reached = batch ? answered >= batch.needed : false

  const answer = async (score: number) => {
    if (!current || busy) return
    setBusy(true)
    const next = answered + 1
    setAnswered(next)
    try {
      const res = await fetch('/api/assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: current.id, score }),
      })
      if (res.ok) {
        const body = await res.json()
        if (typeof body?.read?.answered === 'number') setAnswered(body.read.answered)
      }
    } catch {
      // One lost item out of forty isn't worth stopping the run for.
    }
    setBusy(false)
    if (batch && index + 1 < batch.items.length) setIndex(index + 1)
    else setFinished(true)
  }

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      {/* App-shell scroll: this container scrolls, the document does not.
          iOS rubber-bands the document past its ends and drags any sticky
          header along with it. Header carries safe-area padding for the same
          reason — flat pixel padding only worked while the viewport started
          below the status bar. */}
      <header className="sticky top-0 z-40 bg-black safe-area-pt pb-3 px-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12]">
              <Compass className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-medium text-white leading-tight">Daily Read</h1>
              <p className="text-[11px] text-white/50 leading-tight">How you tick, a question at a time</p>
            </div>
          </div>
        </div>
      </header>

      <div className="px-5 pb-16">
        {!batch ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        ) : finished ? (
          <div className="pt-16 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 mx-auto rounded-full bg-white/[0.06] border border-white/[0.15] flex items-center justify-center mb-4">
              <Check className="w-7 h-7 text-white" />
            </div>
            <p className="text-lg text-white font-medium mb-1.5">
              {reached ? 'That’s enough for a first read' : `${answered} answered`}
            </p>
            <p className="text-sm text-white/60 mb-7">
              {reached
                ? 'It’s on your Progress screen now, and it keeps moving as you answer more.'
                : `${Math.max(0, batch.needed - answered)} more and it can start telling you something.`}
            </p>
            <div className="flex flex-col gap-2.5">
              {reached && (
                <button
                  onClick={() => router.push('/progress')}
                  className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  See your read
                </button>
              )}
              <button
                onClick={() => router.push('/')}
                className="w-full py-3.5 rounded-xl bg-white/[0.06] border border-white/[0.12] text-sm text-white/90 font-medium hover:bg-white/[0.12] transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                Done
              </button>
            </div>
          </div>
        ) : current ? (
          <div className="pt-6 max-w-sm mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${(index / Math.max(total, 1)) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-white/40 tabular-nums">{index + 1}/{total}</span>
            </div>

            <p className="text-2xl text-white leading-snug font-medium min-h-[5rem]">
              {current.text}
            </p>

            {/* Stacked, not a five-across row: full-width rows give a thumb a
                target it cannot miss, and the labels stay readable. */}
            <div className="flex flex-col gap-2 mt-8">
              {batch.scale.map(point => (
                <button
                  key={point.score}
                  disabled={busy}
                  onClick={() => answer(point.score)}
                  className="w-full py-4 rounded-xl bg-white/[0.05] border border-white/[0.12] text-[15px] text-white/85 font-medium hover:bg-white/[0.12] hover:text-white hover:border-white/25 active:scale-[0.98] disabled:opacity-40 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  {point.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-white/35 mt-6 text-center">
              First instinct is the useful one — don&rsquo;t overthink it.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
