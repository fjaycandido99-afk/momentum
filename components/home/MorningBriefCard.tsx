'use client'

import { useEffect, useState } from 'react'
import { Lock, Sunrise, X } from 'lucide-react'
import { SpeakReplyButton } from '@/components/journal/SpeakReplyButton'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { isDismissed, setDismissed } from '@/lib/ui/dismiss'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const DISMISS_ID = 'morning-brief'

/**
 * The morning brief: today, spoken — the day of the era, how yesterday
 * went, today's mission or promise — in Voxu's voice, on tap.
 *
 * It is the wake-up call's own script (lib/era/wake.ts, via /api/era/wake),
 * so the two can never say different things, and it needs no new writing.
 *
 * PREMIUM. Unlike "Talk me into it", this script is personal — their era,
 * their yesterday — so it can't be shared through the cache: every play of
 * new text is ElevenLabs characters. Free users see the card and it opens
 * the upgrade, which is the honest version of "this costs us per person".
 *
 * Mornings only (5am–noon), only with an era running, dismissible for the
 * day. The script is fetched only when the card is actually going to show.
 */
export function MorningBriefCard() {
  const subscription = useSubscriptionOptional()
  const [script, setScript] = useState<string | null>(null)
  const [hidden, setHidden] = useState(true)

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 5 || h >= 12 || isDismissed(DISMISS_ID)) return
    let cancelled = false
    fetch('/api/era/wake', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (cancelled || !d?.call?.script || d.complete) return
        setScript(d.call.script)
        setHidden(false)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  if (hidden || !script) return null

  // ~15 characters a second of speech: a label, not a promise.
  const secs = Math.max(15, Math.round(script.length / 15))
  const length = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
  const premium = !!subscription?.isPremium

  return (
    <section className="card-surface-lg era-glow p-4 flex items-center gap-3.5" aria-label="Morning brief">
      <span className="w-10 h-10 shrink-0 rounded-full border border-white/[0.16] flex items-center justify-center" aria-hidden>
        <Sunrise className="w-[18px] h-[18px] text-white/80" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
          Morning brief · {length}
        </p>
        <p className="text-[17px] text-white leading-snug mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
          Made for your day.
        </p>
        <div className="mt-2">
          {premium ? (
            <SpeakReplyButton label="Play" text={script} onUpgrade={subscription?.openUpgradeModal} />
          ) : (
            <button
              onClick={() => subscription?.openUpgradeModal()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.16] px-3 py-1.5 text-[12px] text-white/80"
            >
              <Lock className="h-3.5 w-3.5" /> Play · Premium
            </button>
          )}
        </div>
      </div>
      <button
        onClick={() => { setDismissed(DISMISS_ID, 'today'); setHidden(true) }}
        aria-label="Not today"
        className="self-start p-1.5 -m-1 rounded-full text-white/40 hover:text-white/80"
      >
        <X className="w-4 h-4" />
      </button>
    </section>
  )
}
