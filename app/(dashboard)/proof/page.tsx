'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { ProofGrid } from '@/components/proof/ProofGrid'
import { ProofDaySheet } from '@/components/proof/ProofDaySheet'
import { CountUp } from '@/components/ui/CountUp'
import { proofSummary } from '@/lib/proof/grid'
import type { ProofPayload } from '@/lib/proof/server'
import { trackFeature } from '@/lib/analytics/track'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * /proof — the year in proof.
 *
 * A streak is a number a single bad day deletes. This is the opposite claim:
 * a calendar of the days you kept a promise, which nothing later takes back.
 * Every dot is a row in the database, and tapping one shows what was going
 * on — the promise in their own words, the mission, how they were, and the
 * reply the coach gave that day.
 *
 * Not a second /progress. That page is streaks, XP and achievements: things
 * the app awards. This page only shows things the person did.
 */
export default function ProofPage() {
  const [data, setData] = useState<ProofPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [year, setYear] = useState<number | null>(null)
  const [open, setOpen] = useState<string | null>(null)

  const load = useCallback((y?: number) => {
    setLoading(true)
    setError(false)
    fetch(y ? `/api/proof?year=${y}` : '/api/proof')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('failed'))))
      .then((payload: ProofPayload) => {
        setData(payload)
        setYear(payload.year.year)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    trackFeature('era', 'open', 'proof_year')
  }, [load])

  const detail = open && data ? data.details[open] ?? null : null

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </Link>
          {data && data.years.length > 1 && (
            <div className="flex gap-1.5">
              {data.years.map(y => (
                <button
                  key={y}
                  onClick={() => { setYear(y); load(y) }}
                  className={`text-[12px] tabular-nums rounded-full px-3 py-1 border transition-colors ${
                    y === year ? 'bg-white text-black border-white' : 'text-white/60 border-white/20 hover:text-white'
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Your year in proof</p>
          {loading && !data ? (
            <div className="flex items-center gap-2 text-white/50 text-sm mt-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Counting your days…
            </div>
          ) : error || !data ? (
            <div className="mt-6">
              <p className="text-sm text-white/65">Couldn&rsquo;t load your record just now.</p>
              <button onClick={() => load(year ?? undefined)} className="mt-3 text-sm text-white underline underline-offset-4">
                Try again
              </button>
            </div>
          ) : (
            <>
              <h1 className="text-[52px] leading-none text-white mt-2 tabular-nums" style={{ ...SERIF, fontWeight: 600 }}>
                <CountUp value={data.year.counts.proofs} />
              </h1>
              <p className="text-[15px] text-white/70 mt-1">
                {data.year.counts.proofs === 1 ? 'day kept' : 'days kept'} in {data.year.year}
              </p>
              <p className="text-[13px] text-white/45 mt-2 leading-relaxed">{proofSummary(data.year)}</p>
              {/* Said out loud, so an opening month is a start and not a gap. */}
              {data.year.from !== `${data.year.year}-01-01` && (
                <p className="text-[12px] text-white/35 mt-1">
                  Your record starts {monthName(data.year.from)}.
                </p>
              )}

              <div className="mt-7">
                <ProofGrid
                  year={data.year}
                  hasDetail={day => !!data.details[day]}
                  onPick={day => setOpen(day)}
                />
              </div>

              {/* Counted things only — no score, no composite, no grade. */}
              {(data.year.counts.missed > 0 || data.year.counts.open > 0 || data.year.counts.missions > 0) && (
                <div className="mt-7 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Missed" value={data.year.counts.missed} />
                  <Stat label="Never answered" value={data.year.counts.open} />
                  <Stat label="Missions done" value={data.year.counts.missions} />
                </div>
              )}

              <p className="text-[12px] text-white/40 mt-7 leading-relaxed">
                Don&rsquo;t track time. Collect proof. A missed day leaves a gap and takes nothing away —
                the days you kept stay kept.
              </p>

              {data.year.counts.proofs === 0 && data.year.counts.inEra === 0 && (
                <Link
                  href="/era"
                  className="block text-center mt-5 py-3 rounded-xl bg-white text-black text-sm font-medium"
                >
                  Start an era
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {open && data && (
        <ProofDaySheet
          day={open}
          detail={detail}
          isToday={open === data.today}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

/** "in September" — the month a YYYY-MM-DD falls in. */
function monthName(day: string): string {
  const months = [
    'in January', 'in February', 'in March', 'in April', 'in May', 'in June',
    'in July', 'in August', 'in September', 'in October', 'in November', 'in December',
  ]
  return months[Number(day.slice(5, 7)) - 1] ?? ''
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.12] py-3">
      <p className="text-[20px] text-white tabular-nums">{value}</p>
      <p className="text-[10px] tracking-[0.12em] uppercase text-white/40 mt-0.5">{label}</p>
    </div>
  )
}
