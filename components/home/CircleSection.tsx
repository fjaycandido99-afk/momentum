'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Flame, Share2, Users } from 'lucide-react'
import { eraName } from '@/lib/era/presets'
import { eraSlug } from '@/lib/era/share'
import type { CircleMember, TrendingEra } from '@/lib/era/circle'

/**
 * Your circle — the people who started an era from your link, or whose link
 * you started yours from — and Trending, when there is a real number to show.
 *
 * At Voxu's size a room of strangers would be empty, so the empty state is
 * the invite rather than a zero. Trending renders only when the server sends
 * something, which it doesn't until an era actually has people in it: no
 * placeholder counts, no "18.4K" from the mockup.
 */

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

interface CircleResponse {
  circle: CircleMember[]
  trending: TrendingEra[]
  visible: boolean
}

export function CircleSection({ onShare }: { onShare: () => void }) {
  const [data, setData] = useState<CircleResponse | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/era/circle', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CircleResponse) => { if (!cancelled) setData(d) })
      .catch(() => { /* a missing circle is not worth an error on home */ })
    return () => { cancelled = true }
  }, [])

  const setVisible = async (visible: boolean) => {
    setSaving(true)
    try {
      const res = await fetch('/api/era/circle', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visible }),
      })
      if (res.ok) setData(d => (d ? { ...d, visible } : d))
    } catch {
      /* leave the switch as it was */
    } finally {
      setSaving(false)
    }
  }

  // Nothing to say yet: no request finished, so no empty state either.
  if (!data) return null

  return (
    <div className="space-y-5">
      <section>
        <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 px-1 flex items-center gap-1.5">
          <Users className="w-3 h-3" /> Your circle
        </p>

        {data.circle.length === 0 ? (
          <div className="card-surface-lg p-4 mt-2">
            <p className="text-[19px] text-white leading-snug" style={{ ...SERIF, fontWeight: 500 }}>
              Nobody has joined your era yet.
            </p>
            <p className="text-sm text-white/70 mt-1.5">
              Share it. Whoever starts from your link shows up here, on day 1 with you.
            </p>
            <button
              onClick={onShare}
              className="mt-3 w-full py-2.5 rounded-xl bg-white text-black text-sm font-medium flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <Share2 className="w-4 h-4" /> Share your era
            </button>
          </div>
        ) : (
          <>
            <ul className="mt-2 space-y-1.5">
              {data.circle.map((m, i) => (
                <li key={`${m.name}-${i}`} className="card-surface-lg px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] text-white leading-tight truncate" style={{ ...SERIF, fontWeight: 500 }}>
                      {m.name}
                    </p>
                    <p className="text-[11px] text-white/55 mt-0.5 truncate">
                      {m.era
                        ? `${eraName(m.era.title)} · day ${m.era.day} of ${m.era.lengthDays}`
                        : m.direction === 'joined_you' ? 'joined your era' : 'you joined their era'}
                    </p>
                  </div>
                  {m.era && m.era.streak > 1 && (
                    <span className="flex items-center gap-1 text-xs text-white/75 shrink-0">
                      <Flame className="w-3.5 h-3.5" /> {m.era.streak}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setVisible(!data.visible)}
              disabled={saving}
              className="mt-2 px-1 text-[11px] text-white/45 flex items-center gap-1.5 disabled:opacity-50"
            >
              {data.visible
                ? <><Eye className="w-3 h-3" /> They see your era, day and streak — hide me</>
                : <><EyeOff className="w-3 h-3" /> You&rsquo;re hidden from their circles — show me</>}
            </button>
          </>
        )}
      </section>

      {/* Only ever rendered with real counts behind it. */}
      {data.trending.length > 0 && (
        <section>
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 px-1">Trending on Voxu</p>
          <ul className="mt-2 space-y-1.5">
            {data.trending.map(t => (
              <li key={t.key}>
                <Link href={`/join/${eraSlug(t.key)}`} className="card-surface-lg px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-[17px] text-white truncate" style={{ ...SERIF, fontWeight: 500 }}>{t.title}</span>
                  <span className="text-xs text-white/60 shrink-0">{t.people.toLocaleString()} in it</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
