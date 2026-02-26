'use client'

import { Sunrise, Moon } from 'lucide-react'

interface WelcomeBackCardProps {
  daysAway: number
  lastStreak: number
  onDismiss: () => void
}

export function WelcomeBackCard({ daysAway, lastStreak, onDismiss }: WelcomeBackCardProps) {
  const hour = new Date().getHours()
  const Icon = hour >= 5 && hour < 18 ? Sunrise : Moon

  return (
    <div className="px-6 mt-4 mb-6 liquid-reveal section-fade-bg">
      <div className="relative p-5 card-surface-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-[#111113] border border-white/15">
            <Icon className="w-5 h-5 text-amber-400/90" />
          </div>
          <div>
            <h3 className="text-base font-medium text-white">Welcome back!</h3>
            <p className="text-xs text-white/85">
              It&apos;s been {daysAway} {daysAway === 1 ? 'day' : 'days'}.
              {lastStreak > 0 && ` You had a ${lastStreak}-day streak going.`}
            </p>
          </div>
        </div>

        <p className="text-sm text-white/90 mb-4">
          {lastStreak >= 7
            ? "Your progress isn't lost — let's rebuild that momentum."
            : "Every day is a fresh start. Let's make this one count."}
        </p>

        <button
          onClick={onDismiss}
          className="w-full py-2.5 rounded-xl bg-white/10 border border-white/15 text-sm font-medium text-white press-scale hover:bg-white/15 transition-colors"
        >
          Let&apos;s do this
        </button>
      </div>
    </div>
  )
}
