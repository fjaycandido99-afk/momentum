'use client'

/**
 * "What page?" — asked the moment somebody marks their reading done.
 *
 * Recording a page used to take five taps on another screen: /training →
 * Details → Edit → Find this book → Page you're on. So nobody would ever do
 * it, and every number that depends on it — the percentage, the pace, the
 * finish estimate — would stay empty forever while looking like a feature.
 *
 * This is the one moment the answer is known without having to remember it:
 * they have just put the book down. Inline under the practice they ticked,
 * never a modal, and skippable in one tap — the check-off is already saved
 * before this appears, so ignoring it costs nothing.
 *
 * Only shown when a resolved book matches what their plan says for today. A
 * typed title with no book behind it has no page to record.
 */

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { trackFeature } from '@/lib/analytics/track'
import { pagesLeft } from '@/lib/books/progress'

export function PagePrompt({
  bookId,
  title,
  pages,
  currentPage,
  onDone,
}: {
  bookId: string
  title: string
  pages: number | null
  currentPage: number | null
  onDone: () => void
}) {
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  const save = async () => {
    const page = Number(value)
    if (!Number.isFinite(page) || page < 0 || busy) return
    setBusy(true)
    haptic('light')
    try {
      const res = await fetch('/api/books', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bookId, page: Math.round(page) }),
      })
      if (res.ok) {
        trackFeature('books', 'use', 'page_at_checkoff')
        setSaved(true)
        // Left up for a beat so the tick is seen, then gone. A row that
        // vanishes the instant you tap it reads as a failure.
        window.setTimeout(onDone, 1200)
      } else {
        onDone()
      }
    } catch {
      onDone()
    } finally {
      setBusy(false)
    }
  }

  if (saved) {
    const left = pagesLeft({ pages, currentPage: Number(value) })
    return (
      <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-3 py-2.5">
        <Check className="h-3.5 w-3.5 shrink-0 text-white" />
        <p className="text-[12px] text-white/70">
          {/* Only when there is a real total. Without one this says just the
              page, because "180 to go" out of an unknown length is a number
              the app would be making up. */}
          {left != null && left > 0 ? `Page ${value}. ${left} to go.` : `Page ${value}.`}
        </p>
      </div>
    )
  }

  return (
    <div className="mt-2 rounded-xl border border-white/[0.12] bg-white/[0.04] p-3">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-[12px] text-white/70" htmlFor={`page-${bookId}`}>
          What page are you on?
        </label>
        <button
          onClick={onDone}
          aria-label="Skip"
          className="shrink-0 -mr-0.5 p-1 rounded-full text-white/30 hover:text-white/70"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-[11px] text-white/35 mt-0.5 truncate">{title}</p>
      <div className="flex gap-2 mt-2">
        <input
          id={`page-${bookId}`}
          type="number"
          inputMode="numeric"
          min={0}
          autoFocus
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void save() } }}
          placeholder={currentPage != null ? String(currentPage) : '0'}
          className="w-20 shrink-0 px-2.5 py-2 rounded-lg bg-white/[0.06] border border-white/15 text-[14px] text-white placeholder:text-white/25 text-center"
        />
        <button
          onClick={save}
          disabled={busy || !value.trim()}
          className="flex-1 px-3 py-2 rounded-lg bg-white text-black text-[13px] font-medium disabled:opacity-40 active:scale-[0.99]"
        >
          Save
        </button>
      </div>
    </div>
  )
}
