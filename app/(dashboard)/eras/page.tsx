'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import type { TimelineEra } from '@/lib/era/timeline'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function short(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return `${MONTHS[m - 1]} ${d}, ${y}`
}

/**
 * Your eras, in order — the whole story on one line. Each stop is counts
 * from the record (kept of answered, the longest run, comebacks) and how it
 * ended. Stopped eras stay: an era that ended early is still yours.
 */
export default function ErasTimelinePage() {
  const [eras, setEras] = useState<TimelineEra[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/eras/timeline', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(d => setEras(d.eras ?? []))
      .catch(() => setError(true))
  }, [])

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <BackButton fallback="/proof" />
        <p className="text-px-11 uppercase tracking-[0.24em] text-white/60 mt-4">Your story</p>
        <h1 className="text-px-34 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>Your eras</h1>

        {error ? (
          <p className="text-px-14 text-white/70 mt-6">Couldn&rsquo;t load your eras. Try again in a moment.</p>
        ) : !eras ? (
          <div className="mt-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-white/60" /></div>
        ) : eras.length === 0 ? (
          <p className="text-px-15 text-white/75 mt-6">No eras yet. <Link href="/era" className="underline underline-offset-4">Start your first</Link></p>
        ) : (
          <ol className="mt-6 relative">
            {/* The line the story runs along. */}
            <span className="absolute left-[7px] top-2 bottom-2 w-px bg-white/15" aria-hidden />
            {eras.map(e => (
              <li key={e.id} className="relative pl-8 pb-6 last:pb-0">
                <span
                  className={`absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full border ${e.status === 'running' ? 'bg-white border-white' : e.status === 'finished' ? 'bg-white/70 border-white/70' : 'bg-transparent border-white/50'}`}
                  aria-hidden
                />
                <p className="text-px-11 text-white/55">
                  {short(e.startDay)} – {e.status === 'running' ? 'now' : short(e.endDay)}
                </p>
                <p className="text-px-20 leading-snug mt-0.5" style={{ ...SERIF, fontWeight: 600 }}>{e.title}</p>
                <p className="text-px-12 text-white/70 mt-0.5">
                  {e.status === 'running'
                    ? `Day ${e.day} of ${e.lengthDays} — running`
                    : e.status === 'finished'
                      ? `All ${e.lengthDays} days`
                      : `Stopped on day ${Math.max(1, Math.min(e.lengthDays, Math.round((Date.parse(e.endDay) - Date.parse(e.startDay)) / 86400000) + 1))}`}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-px-12 tabular-nums">
                  <span><span className="text-white">{e.kept} of {e.answered}</span> <span className="text-white/55">kept</span></span>
                  {e.longestRun > 1 && <span><span className="text-white">{e.longestRun}</span> <span className="text-white/55">in a row, longest</span></span>}
                  {e.recoveries > 0 && <span><span className="text-white">{e.recoveries}</span> <span className="text-white/55">{e.recoveries === 1 ? 'comeback' : 'comebacks'}</span></span>}
                </div>
                {e.stayed.length > 0 && (
                  <p className="text-px-12 text-white/60 mt-1.5">Carried on: {e.stayed.join(', ')}</p>
                )}
              </li>
            ))}
          </ol>
        )}

        {eras && eras.length > 0 && (
          <p className="text-px-12 text-white/45 mt-8 leading-relaxed">
            Each era&rsquo;s full record — what you learned and what you tested — is on <Link href="/proof" className="underline underline-offset-4">Proof</Link>.
          </p>
        )}
      </div>
    </div>
  )
}
