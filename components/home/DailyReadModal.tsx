'use client'

import { useEffect, useState } from 'react'
import { X, Compass, Loader2, Check } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface BatchItem { id: string; text: string }
interface Batch {
  items: BatchItem[]
  scale: { score: number; label: string }[]
  answered: number
  needed: number
  hasRead: boolean
}

/**
 * "Finish your read" — a run of items in one sitting.
 *
 * The daily drip is the default because low friction is the whole premise,
 * but it means a first read is a week away, and someone who wants it now
 * shouldn't be made to wait for us. One item on screen at a time rather than
 * a scrolling list of forty: a list invites pattern-answering straight down
 * one column, which is worse data than no data.
 */
export function DailyReadModal({ onClose, onDone }: { onClose: () => void; onDone: (answered: number) => void }) {
  const [batch, setBatch] = useState<Batch | null>(null)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [busy, setBusy] = useState(false)
  const [finished, setFinished] = useState(false)

  useBodyScrollLock(true)

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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const current = batch?.items[index]

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
    else { setFinished(true); onDone(next) }
  }

  const total = batch?.items.length ?? 0
  const reached = batch ? answered >= batch.needed : false

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Daily Read">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-[#141118] border-t sm:border border-white/15 sm:rounded-2xl rounded-t-3xl overflow-hidden safe-area-pb">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-violet-500/20">
              <Compass className="w-4 h-4 text-violet-300" />
            </div>
            <span className="text-xs font-semibold text-violet-300/80 uppercase tracking-wider">Daily Read</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {!batch ? (
          <div className="px-5 py-16 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-white/40" />
          </div>
        ) : finished ? (
          <div className="px-5 pb-6 pt-2 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-base text-white font-medium mb-1">
              {reached ? 'That’s enough for a first read' : `${answered} answered`}
            </p>
            <p className="text-sm text-white/60 mb-5">
              {reached
                ? 'You’ll find it on your Progress screen. It keeps moving as you answer more.'
                : `${Math.max(0, batch.needed - answered)} more and it can start telling you something.`}
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-violet-500/25 hover:bg-violet-500/35 border border-violet-400/25 text-sm text-violet-100 font-medium transition-colors"
            >
              Done
            </button>
          </div>
        ) : current ? (
          <div className="px-5 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-violet-400/80 rounded-full transition-all duration-300"
                  style={{ width: `${((index) / Math.max(total, 1)) * 100}%` }}
                />
              </div>
              <span className="text-[11px] text-white/40 tabular-nums">{index + 1}/{total}</span>
            </div>

            <p className="text-[17px] text-white leading-snug font-medium min-h-[3.5rem]">
              {current.text}
            </p>

            <div className="flex items-stretch gap-1.5 mt-5">
              {batch.scale.map(point => (
                <button
                  key={point.score}
                  disabled={busy}
                  aria-label={point.label}
                  onClick={() => answer(point.score)}
                  className="flex-1 min-h-[3.5rem] px-1 py-2 rounded-xl bg-white/5 border border-white/15 text-[11px] leading-tight text-white/75 font-medium hover:bg-white/10 hover:text-white active:scale-95 disabled:opacity-40 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  {point.label}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-white/35 mt-3 text-center">
              First instinct is the useful one — don’t overthink it.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
