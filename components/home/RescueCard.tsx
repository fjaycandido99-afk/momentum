'use client'

import { Lock, LifeBuoy, ChevronRight } from 'lucide-react'
import { SpeakReplyButton } from '@/components/journal/SpeakReplyButton'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { rescueScript, type RescuePlan } from '@/lib/pulse/rescue'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Rescue: the rest of today at its minimums.
 *
 * Offered once a day when the day is slipping (lib/pulse/rescue.ts). Two
 * answers only — switch to minimums, or keep the plan. Accepting changes how
 * the rest of the day asks; it records nothing. Once on, the card becomes
 * the plan itself: each step opens its discipline, and steps leave the list
 * as they are logged.
 */
export function RescueCard({
  plan,
  active,
  onAccept,
  onDecline,
  onOpen,
}: {
  plan: RescuePlan
  active: boolean
  onAccept: () => void
  onDecline: () => void
  onOpen: (id: string) => void
}) {
  const subscription = useSubscriptionOptional()
  const premium = !!subscription?.isPremium

  return (
    <section className="card-surface-lg era-glow p-4" aria-label="Rescue plan">
      <div className="flex items-start gap-3.5">
        <span className="w-10 h-10 shrink-0 rounded-full border border-white/[0.16] flex items-center justify-center" aria-hidden>
          <LifeBuoy className="w-[18px] h-[18px] text-white/80" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-px-10 tracking-[0.24em] uppercase text-white/45">
            {active ? 'Rescue plan · minimums today' : 'Behind today?'}
          </p>
          <p className="text-px-18 text-white leading-snug mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
            {active ? 'One at a time. Then close the day.' : 'Nothing is ruined.'}
          </p>
          {!active && <p className="text-px-13 text-white/55 mt-1 leading-snug">{plan.reason}</p>}
        </div>
      </div>

      <ul className="mt-3 divide-y divide-white/[0.07]">
        {plan.steps.map(s => (
          <li key={s.id}>
            <button onClick={() => onOpen(s.id)} className="w-full text-left flex items-center gap-3 py-2.5 press-scale">
              <span className="w-2 h-2 rounded-full era-accent-bg shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-px-14 text-white truncate">{s.title}</span>
                <span className="block text-px-11 text-white/50">Minimum · {s.ask}</span>
              </span>
              <ChevronRight className="w-4 h-4 text-white/35 shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {plan.minutes !== null && (
        <p className="text-px-12 text-white/45 mt-1">About {plan.minutes} minutes, all of it.</p>
      )}

      {!active && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onAccept} className="py-3 rounded-xl bg-white text-black text-px-14 font-medium active:scale-[0.98] transition-all">
            Switch to minimums
          </button>
          <button onClick={onDecline} className="py-3 rounded-xl border border-white/[0.16] text-white/80 text-px-14 active:scale-[0.98] transition-all">
            Keep my plan
          </button>
        </div>
      )}

      <div className="mt-3">
        {premium ? (
          <SpeakReplyButton label="Hear the plan" text={rescueScript(plan)} onUpgrade={subscription?.openUpgradeModal} />
        ) : (
          <button
            onClick={() => subscription?.openUpgradeModal()}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.16] px-3 py-1.5 text-px-12 text-white/80"
          >
            <Lock className="h-3.5 w-3.5" /> Hear the plan · Premium
          </button>
        )}
      </div>
    </section>
  )
}
