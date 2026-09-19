'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronRight, X } from 'lucide-react'
import { useEra } from '@/hooks/useEra'

/**
 * The era, carried into the Daily Guide.
 *
 * The guide's audio comes from a shared pre-recorded library (see
 * /api/daily-guide/voices — it never generates per user, to save voice
 * credits), so it cannot SAY your promise. This strip is how the guide knows
 * about it instead: the promise sits above the sessions all day, and in the
 * evening sessions it becomes the check-in, so winding down and answering
 * "did I keep it?" are the same moment.
 *
 * Renders nothing without a running era.
 */
export function EraPromiseStrip({ evening }: { evening: boolean }) {
  const { era, setEra } = useEra()
  const [busy, setBusy] = useState(false)

  if (!era || era.step === 'complete') return null

  const check = async (kept: boolean) => {
    setBusy(true)
    try {
      const res = await fetch('/api/era/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ which: 'today', kept }),
      })
      const data = await res.json().catch(() => null)
      if (res.ok && data?.era !== undefined) setEra(data.era)
    } finally {
      setBusy(false)
    }
  }

  const t = era.today
  const askNow = evening && era.step === 'check'

  return (
    <div className="rounded-2xl border border-white/15 bg-white/[0.04] p-4">
      <Link href="/era" className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-white/50 truncate">
          {era.title} · Day {era.day}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0" />
      </Link>

      {t ? (
        <>
          <p className="text-sm text-white mt-1.5 leading-snug">&ldquo;{t.text}&rdquo;</p>
          {askNow ? (
            <div className="mt-3">
              <p className="text-xs text-white/60">Did you keep it?</p>
              <div className="flex gap-2 mt-2">
                <button
                  disabled={busy}
                  onClick={() => check(true)}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  <Check className="w-4 h-4" /> I kept it
                </button>
                <button
                  disabled={busy}
                  onClick={() => check(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 bg-white/[0.06] text-white/85 text-sm font-medium flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-[0.98] transition-all"
                >
                  <X className="w-4 h-4" /> I didn&rsquo;t
                </button>
              </div>
            </div>
          ) : t.kept !== null ? (
            <p className="text-xs text-white/60 mt-2">{t.kept ? 'Kept.' : 'Not today — tomorrow is a new promise.'}</p>
          ) : null}
        </>
      ) : (
        <Link href="/" className="block text-sm text-white/75 mt-1.5 underline underline-offset-2">
          You haven&rsquo;t made today&rsquo;s promise yet
        </Link>
      )}
    </div>
  )
}
