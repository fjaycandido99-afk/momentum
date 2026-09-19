'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
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

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

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
  if (all.length === 0) return null

  const unlocked = all.filter(a => a.unlocked)
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
    <section className="px-6 mt-2 mb-8" aria-label="Achievements">
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/50">Achievements</p>
          <p className="text-xl text-white leading-tight mt-0.5" style={{ ...SERIF, fontWeight: 500 }}>
            {unlocked.length} <span className="text-white/40">of {all.length} earned</span>
          </p>
        </div>
        <Link href="/progress" className="flex items-center gap-0.5 text-xs text-white/60 hover:text-white pb-1">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {next.length > 0 && (
        <div className="card-surface-lg p-4 space-y-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50">Next up</p>
          {next.map(a => {
            const pct = Math.round((a.progress!.current / a.progress!.target) * 100)
            return (
              <Link key={a.id} href="/progress" className="flex items-center gap-3.5">
                <AchievementBadge category={a.category} icon={a.icon} rarity={a.rarity} unlocked={false} mark={a.mark} size={46} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm text-white font-medium truncate">{a.title}</p>
                    <p className="text-xs text-white/70 tabular-nums shrink-0">
                      {a.progress!.current}<span className="text-white/35">/{a.progress!.target}</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-white/45 truncate">{a.description}</p>
                  {/* Thick and bright on purpose — a hairline bar reads as decoration. */}
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden mt-1.5">
                    <div className="h-full rounded-full bg-white transition-all duration-700" style={{ width: `${Math.max(pct, 3)}%` }} />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {recent.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-0.5">Recently earned</p>
          {/* pt-4: a horizontal scroller clips vertically too, and it was
              cutting the tops off the rings and the legendary glow. */}
          <div className="flex gap-4 overflow-x-auto pt-4 pb-3 -mx-6 px-6 scrollbar-hide">
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
