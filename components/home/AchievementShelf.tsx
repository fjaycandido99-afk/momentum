'use client'

import Link from 'next/link'
import { useQuiet } from '@/hooks/useQuiet'
import { ChevronRight, Medal, Trophy } from 'lucide-react'
import type { AchievementCategory, AchievementRarity } from '@/lib/achievements'
import { AchievementBadge } from '@/components/progress/AchievementBadge'
import { useGamificationStatus } from '@/hooks/useHomeSWR'

interface StatusAchievement {
  id: string
  title: string
  description: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  unlocked: boolean
  unlockedAt: string | null
  mark?: string | null
  progress?: { current: number; target: number } | null
}

/** Progress as a ring with the count inside — "2/3" at a glance. */
function Ring({ current, target }: { current: number; target: number }) {
  const r = 17
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, target > 0 ? current / target : 0))
  return (
    <span className="relative w-11 h-11 shrink-0 grid place-items-center" aria-hidden>
      <svg viewBox="0 0 40 40" className="absolute inset-0 -rotate-90">
        <circle cx="20" cy="20" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
        <circle
          cx="20" cy="20" r={r} fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(pct, 0.03))}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="text-[10px] text-white/85 tabular-nums">{current}/{target}</span>
    </span>
  )
}

/**
 * Achievements on home: what you're closest to next, and what you've earned.
 *
 * "Next up" leads because a visible, nearly-finished goal is the part that
 * changes what someone does today ("Seven Kept · 5/7"); a trophy case only
 * looks back. Reads the gamification status home already loads — no extra
 * request — and renders nothing for guests or while it loads.
 */
export function AchievementShelf() {
  const { gamificationData } = useGamificationStatus()
  const all = (gamificationData?.achievements ?? []) as StatusAchievement[]
  const unlocked = all.filter(a => a.unlocked)

  // Hidden until it has news. The signal is what has been earned — the
  // moment that number moves, the shelf comes back on its own.
  //
  // Before the early returns on purpose: a hook after a conditional return
  // is a hook that sometimes doesn't run, and React counts them.
  const { hidden, hide } = useQuiet('achievements', `${unlocked.length}/${all.length}`)

  if (all.length === 0) return null
  if (hidden) return null

  // Closest first, by fraction done; secrets stay secret; untouched ones
  // (0 progress) only fill in if nothing has been started.
  const candidates = all.filter(a => !a.unlocked && a.category !== 'secret' && a.progress)
  const started = candidates
    .filter(a => a.progress!.current > 0)
    .sort((a, b) => b.progress!.current / b.progress!.target - a.progress!.current / a.progress!.target)
  const next = (started.length ? started : candidates.sort((a, b) => a.progress!.target - b.progress!.target)).slice(0, 3)

  const recent = [...unlocked]
    .filter(a => a.unlockedAt)
    .sort((a, b) => new Date(b.unlockedAt!).getTime() - new Date(a.unlockedAt!).getTime())
    .slice(0, 8)

  return (
    <section className="px-5 mt-2 mb-8 space-y-3" aria-label="Achievements">
      <div className="card-surface-lg p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Achievements
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={hide}
              className="text-[11px] text-white/35 hover:text-white/80"
              aria-label="Hide until something new is earned"
            >
              Hide
            </button>
            <Link href="/progress" className="flex items-center gap-0.5 text-[11px] text-white/55 hover:text-white tabular-nums">
              {unlocked.length} of {all.length} earned <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* What's closest, as rings — the count inside each, the name beside
            it. Three across on a phone; they wrap below 360px. */}
        {next.length > 0 && (
          <div className="mt-3 grid grid-cols-1 min-[360px]:grid-cols-3 gap-2">
            {next.map(a => (
              <Link key={a.id} href="/progress" className="flex items-center gap-2 min-w-0" title={a.description}>
                <Ring current={a.progress!.current} target={a.progress!.target} />
                <span className="text-[12px] text-white/85 leading-tight line-clamp-2 min-w-0">{a.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div className="card-surface-lg p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 flex items-center gap-1.5">
              <Medal className="w-3.5 h-3.5" /> Recently earned
            </p>
            <Link href="/progress" className="flex items-center gap-0.5 text-[11px] text-white/55 hover:text-white">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {/* pt-4: a horizontal scroller clips vertically too, and it was
              cutting the tops off the rings and the legendary glow. */}
          <div className="flex gap-4 overflow-x-auto pt-4 pb-1 -mx-4 px-4 scrollbar-hide">
            {recent.map(a => (
              <Link key={a.id} href="/progress" className="flex flex-col items-center gap-2 w-[68px] shrink-0">
                <AchievementBadge category={a.category} icon={a.icon} rarity={a.rarity} unlocked mark={a.mark} size={56} />
                <span className="text-[10px] text-white/70 text-center leading-tight line-clamp-2">{a.title}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
