'use client'

import { useState } from 'react'
import { Lock, Moon, X } from 'lucide-react'
import { SpeakReplyButton } from '@/components/journal/SpeakReplyButton'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { isDismissed, setDismissed } from '@/lib/ui/dismiss'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const DISMISS_ID = 'night-debrief'

/**
 * Evening: 7pm until midnight. Not after — past midnight the day Pulse
 * reports is already the new one, so a "close the day" then would describe
 * a day that has only just begun.
 */
export function isDebriefHour(h: number = new Date().getHours()): boolean {
  return h >= 19
}

/**
 * The night debrief card — the day closed, spoken in Voxu's voice
 * (lib/pulse/debrief.ts builds the words from what was recorded).
 *
 * PREMIUM for the same reason as the morning brief: the script is personal,
 * so it can't be shared through the audio cache. The written line is shown
 * to everyone — the words are the product; the voice is the premium part.
 */
export function NightDebriefCard({ script, done, total }: { script: string; done: number; total: number }) {
  const subscription = useSubscriptionOptional()
  const [hidden, setHidden] = useState(() => isDismissed(DISMISS_ID))
  if (hidden) return null

  const premium = !!subscription?.isPremium
  const secs = Math.max(15, Math.round(script.length / 15))
  const length = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`

  return (
    <section className="card-surface-lg p-4" aria-label="Close the day">
      <div className="flex items-start gap-3.5">
        <span className="w-10 h-10 shrink-0 rounded-full border border-white/[0.16] flex items-center justify-center" aria-hidden>
          <Moon className="w-[18px] h-[18px] text-white/80" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">
            Close the day · {length}
          </p>
          <p className="text-[17px] text-white leading-snug mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
            {total > 0 ? `${done} of ${total} done today.` : 'Today, closed.'}
          </p>
        </div>
        <button
          onClick={() => { setDismissed(DISMISS_ID, 'today'); setHidden(true) }}
          aria-label="Not tonight"
          className="p-1.5 -m-1 rounded-full text-white/40 hover:text-white/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[13px] text-white/60 mt-2.5 leading-snug">{script}</p>
      <div className="mt-3">
        {premium ? (
          <SpeakReplyButton label="Hear it" text={script} onUpgrade={subscription?.openUpgradeModal} />
        ) : (
          <button
            onClick={() => subscription?.openUpgradeModal()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.16] px-3 py-1.5 text-[12px] text-white/80"
          >
            <Lock className="h-3.5 w-3.5" /> Hear it · Premium
          </button>
        )}
      </div>
    </section>
  )
}
