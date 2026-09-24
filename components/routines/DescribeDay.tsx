'use client'

/**
 * "Tell Voxu about your day."
 *
 * The third way in, beside the era's routine and a blank one — and the one
 * for everybody whose day is not one of eight eras. They describe it, and the
 * editor opens on a draft of it.
 *
 * It hands back a DRAFT and saves nothing. Every field was rebuilt from a
 * closed list on the server (lib/routines/ai-draft), so what arrives here is
 * a routine that could have been built by hand — and then the person looks at
 * it, changes what is wrong, and presses Save themselves.
 */

import { useState } from 'react'
import { Loader2, Sparkles, X } from 'lucide-react'
import { haptic } from '@/lib/haptics'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { KeyboardAware } from '@/components/ui/KeyboardAware'
import { DRAFT_LIMITS, type DraftedRoutine } from '@/lib/routines/ai-draft'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * What a useful answer looks like, without filling the box for them.
 *
 * A placeholder rather than a prefilled value: somebody who taps "build it
 * for me" and finds somebody else's morning already typed in has been given
 * an example to delete, not a question to answer.
 */
const PLACEHOLDER = 'Up at 6, gym after work about 6pm, and I want to read before bed. Weekdays only.'

export function DescribeDay({
  onDrafted,
  onClose,
}: {
  onDrafted: (draft: DraftedRoutine, summary: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    const description = text.trim()
    if (description.length < 10) {
      setError('A sentence or two about your day is enough')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/routines/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        // The server's words: it knows whether this was a quota, a bad
        // read-back or a day it could not make sense of.
        setError(data?.error ?? 'Voxu could not build that')
        return
      }
      haptic('medium')
      onDrafted(data.draft as DraftedRoutine, typeof data.summary === 'string' ? data.summary : '')
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Describe your day"
    >
      <ScrollLock />
      {/* The native keyboard covers the bottom half of a phone; this brings
          the focused field back into view. */}
      <KeyboardAware />
      <button className="absolute inset-0 bg-black/90 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md">
        <div
          className="rounded-3xl border border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[85dvh] overflow-y-auto overflow-x-hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Your routine</p>
              <h2 className="text-[24px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
                What does your day look like?
              </h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          <p className="text-sm text-white/60 leading-relaxed mt-2">
            Say it however you say it — times, order, which days. Voxu turns it into a routine you can
            change before anything is saved.
          </p>

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={DRAFT_LIMITS.description}
            rows={5}
            placeholder={PLACEHOLDER}
            aria-label="Your day"
            className="w-full mt-3 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/25 leading-relaxed resize-none"
          />
          <p className="text-[11px] text-white/30 mt-1">
            It only uses what you say. It will not add habits you did not mention.
          </p>

          {error && <p className="text-[12px] text-amber-300/90 mt-3">{error}</p>}

          <button
            onClick={submit}
            disabled={busy}
            className="w-full mt-4 py-3 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-60 active:scale-[0.99] flex items-center justify-center gap-2"
          >
            {busy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Building your day…</>
              : <><Sparkles className="w-4 h-4" /> Build it</>}
          </button>
        </div>
      </div>
    </div>
  )
}
