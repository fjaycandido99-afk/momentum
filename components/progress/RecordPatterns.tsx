'use client'

import { useEffect, useState } from 'react'
import { BarChart3, Loader2 } from 'lucide-react'
import type { PatternReport } from '@/lib/patterns/rules'

/**
 * "What your record shows" — the computed patterns in someone's own history
 * (lib/patterns/rules.ts).
 *
 * Every line shows its counts, because a percentage with no denominator is
 * how people end up believing things about themselves that aren't true. When
 * nothing has cleared the thresholds the card says what it still needs
 * instead of filling the space with something softer.
 */
export function RecordPatterns() {
  const [report, setReport] = useState<PatternReport | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/patterns', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: PatternReport) => { if (!cancelled) setReport(d) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])

  if (failed) return null

  return (
    <div className="bg-white/5 rounded-2xl p-4">
      <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" /> What your record shows
      </h2>

      {report && report.scores.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {report.scores.map(s => (
            <div key={s.id} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-2xl text-white leading-none">
                {s.value}<span className="text-sm text-white/50">{s.unit === '%' ? '%' : ' days'}</span>
              </p>
              <p className="text-[11px] text-white/70 mt-1.5">{s.label}</p>
              {/* The counts, always — a rate with no denominator is how people
                  come to believe things about themselves that aren't true. */}
              <p className="text-[10px] text-white/40 mt-0.5 leading-snug">{s.detail}</p>
            </div>
          ))}
        </div>
      )}

      {!report ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-white/30" />
        </div>
      ) : report.patterns.length === 0 ? (
        <div className="mt-2">
          <p className="text-sm text-white/70 leading-relaxed">
            {report.needs.answeredPromises > 0
              ? `${report.scores.length > 0 ? 'No patterns yet' : 'Nothing to show yet'} — ${report.needs.answeredPromises} more answered ${report.needs.answeredPromises === 1 ? 'promise' : 'promises'} and this starts comparing your own days against each other.`
              : 'No pattern has separated out yet — your days look much alike so far, which is its own kind of answer.'}
          </p>
          <p className="text-[11px] text-white/40 mt-2">
            It stays quiet until each side of a comparison has enough days behind it. A pattern from four days would just be noise.
          </p>
        </div>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {report.patterns.map(p => (
              <li key={p.id} className="bg-white/[0.03] rounded-xl p-3.5">
                <p className="text-[15px] text-white leading-snug">{p.headline}</p>
                <p className="text-xs text-white/55 mt-1.5 leading-relaxed">{p.detail}</p>
                <div className="mt-2.5 space-y-1.5">
                  {p.groups.map(g => (
                    <div key={g.label} className="flex items-center gap-2">
                      <span className="text-[10px] text-white/45 w-[8.5rem] shrink-0 truncate">{g.label}</span>
                      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-white/50 rounded-full" style={{ width: `${Math.min(100, g.rate)}%` }} />
                      </div>
                      <span className="text-[10px] text-white/45 tabular-nums shrink-0">{g.hits}/{g.of}</span>
                    </div>
                  ))}
                </div>
                {/* Honest about what hasn't been established yet: the numbers
                    are real, the pattern might still be chance. */}
                {p.strength === 'early' && (
                  <p className="text-[10px] text-white/35 mt-2">
                    Early — real numbers, but not yet more than chance could explain.
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-white/40 mt-3 leading-relaxed">
            {report.disclaimer} From {report.basis.answeredPromises} answered {report.basis.answeredPromises === 1 ? 'promise' : 'promises'}
            {report.basis.moodDays > 0 && ` and ${report.basis.moodDays} days you logged a mood`}.
          </p>
        </>
      )}
    </div>
  )
}
