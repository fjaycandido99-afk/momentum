'use client'

import { useEffect, useState } from 'react'
import { Telescope } from 'lucide-react'
import type { PracticePattern } from '@/lib/practices/patterns'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * What Voxu has noticed.
 *
 * Every line is a count with its denominator in the sentence, so you can
 * check it against your own memory and disagree with it. That is the whole
 * design: a claim you can test is worth reading, and "your consistency is
 * 72%" is not.
 *
 * When there is nothing solid it says what it's waiting for instead of
 * filling the space. An insight nobody can trust costs more than an empty
 * panel — it teaches people to skim the app.
 */
export function PatternsBlock() {
  const [patterns, setPatterns] = useState<PracticePattern[] | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetch('/api/practices/patterns')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!alive || !data) return
        setPatterns(data.patterns ?? [])
        setPending(data.pending ?? null)
      })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  // Nothing at all until the answer arrives: a heading with a spinner under
  // it is worse than the section appearing a beat later.
  if (!patterns) return null

  return (
    <div className="card-surface-lg p-4">
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
        <Telescope className="w-3.5 h-3.5" /> What Voxu noticed
      </div>

      {patterns.length > 0 ? (
        <ul className="mt-3 space-y-3">
          {patterns.map(pattern => (
            <li key={pattern.id} className="flex gap-2.5">
              <span className="mt-2 w-1 h-1 rounded-full bg-white/40 shrink-0" aria-hidden />
              <p className="text-[16px] text-white/90 leading-snug" style={SERIF}>
                {pattern.line}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-white/50 mt-2 leading-relaxed">{pending}</p>
      )}

      <p className="text-[11px] text-white/30 mt-4 leading-relaxed">
        Counted from your own answers, never guessed. Each line shows what it&rsquo;s counting so
        you can disagree with it.
      </p>
    </div>
  )
}
