'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { AchievementBadge } from '@/components/progress/AchievementBadge'
import { AchievementCelebration } from '@/components/progress/AchievementCelebration'
import type { RelicStatus } from '@/components/relics/RelicDetailSheet'
import { getAchievementById, type AchievementCategory, type AchievementRarity } from '@/lib/achievements'
import { achievementLine } from '@/lib/achievement-lines'
import { collectionByCategory, recentRelics } from '@/lib/profile/relics'
import type { RelicsPayload } from '@/lib/relics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

interface StatusAchievement extends RelicStatus {
  title: string
  icon: string
  category: AchievementCategory
  rarity: AchievementRarity
  mark: string | null
}

interface Profile { displayName: string | null; memberSince: string | null }

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * You — the coin you wear, the relics you earned most recently, and your
 * collection by category. Only what's recorded: names, dates and counts.
 * No score and no summary of who someone is from what they hold.
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [relics, setRelics] = useState<RelicsPayload | null>(null)
  const [achievements, setAchievements] = useState<StatusAchievement[] | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    const json = (r: Response) => (r.ok ? r.json() : null)
    fetch('/api/user/profile', { cache: 'no-store' }).then(json).then(setProfile).catch(() => {})
    fetch('/api/relics', { cache: 'no-store' }).then(json).then(setRelics).catch(() => {})
    fetch('/api/gamification/status', { cache: 'no-store' }).then(json)
      .then(d => setAchievements(d?.achievements ?? []))
      .catch(() => setAchievements([]))
  }, [])

  const recent = useMemo(() => recentRelics(achievements ?? []), [achievements])
  const collection = useMemo(() => collectionByCategory(achievements ?? []), [achievements])
  const earned = collection.reduce((n, c) => n + c.earned, 0)
  const total = collection.reduce((n, c) => n + c.total, 0)
  const statusOf = (id: string) => achievements?.find(a => a.id === id)
  // Every coin here is earned, so it opens the same "Your relic" popup an
  // earned coin opens on Progress.
  const viewing = detailId ? getAchievementById(detailId) : null

  const featured = relics?.featured ? getAchievementById(relics.featured) : null
  const wearing = (relics?.equipped ?? []).map(id => getAchievementById(id)).filter(a => !!a)

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <Link href="/" aria-label="Back" className="tap-44 inline-flex p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white/80" />
        </Link>

        {/* Who, and the coin they chose to lead with */}
        <div className="flex flex-col items-center text-center mt-2">
          {featured ? (
            <button onClick={() => setDetailId(featured.id)} aria-label={`${featured.title} — your featured relic`} className="press-scale">
              <AchievementBadge id={featured.id} category={featured.category} icon={featured.icon} rarity={featured.rarity} unlocked plain size={132} />
            </button>
          ) : (
            <div className="w-[132px] h-[132px] rounded-full border border-dashed border-white/20" aria-hidden />
          )}
          <h1 className="text-px-40 leading-tight mt-4" style={{ ...SERIF, fontWeight: 600 }}>
            {profile?.displayName ?? 'You'}
          </h1>
          {profile?.memberSince && (
            <p className="text-px-13 text-white/65 mt-1">With Voxu since {monthYear(profile.memberSince)}</p>
          )}
          {featured && <p className="text-px-12 text-white/60 mt-1">Wearing {featured.title}</p>}
        </div>

        {/* Recent relics */}
        <section className="mt-9">
          <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Recent relics</p>
          {!achievements ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-white/50" /></div>
          ) : recent.length === 0 ? (
            <div className="card-surface rounded-2xl p-4 mt-3">
              <p className="text-px-14 text-white/85">Relics you earn will show up here.</p>
              <Link href="/progress" className="tap-44 inline-block mt-2 text-px-12 text-white/70 underline underline-offset-4">See what&rsquo;s closest →</Link>
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent.map(a => {
                const line = achievementLine(a.id)
                return (
                  <li key={a.id}>
                    <button onClick={() => setDetailId(a.id)} className="card-surface rounded-2xl p-3 w-full flex items-center gap-3 text-left press-scale">
                      <AchievementBadge id={a.id} category={a.category} icon={a.icon} rarity={a.rarity} unlocked mark={a.mark} size={56} />
                      <div className="min-w-0 flex-1">
                        <p className="text-px-17 text-white leading-snug" style={{ ...SERIF, fontWeight: 600 }}>{a.title}</p>
                        {line && <p className="text-px-12 text-white/70 leading-snug mt-0.5 line-clamp-2">{line}</p>}
                        <p className="text-px-11 text-white/55 mt-1">Earned {shortDate(a.unlockedAt!)}</p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* What they wear */}
        {wearing.length > 0 && (
          <section className="mt-8">
            <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Wearing</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {wearing.map(a => (
                <button key={a.id} onClick={() => setDetailId(a.id)} className="flex flex-col items-center gap-1.5 p-2 rounded-2xl press-scale">
                  <AchievementBadge id={a.id} category={a.category} icon={a.icon} rarity={a.rarity} unlocked plain size={64} />
                  <span className="text-px-11 text-white/80 text-center leading-tight line-clamp-2">{a.title}</span>
                </button>
              ))}
            </div>
            <p className="text-px-11 text-white/55 mt-2">Change what you wear from the coin at the top of Today.</p>
          </section>
        )}

        {/* Collection */}
        {achievements && total > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Collection</p>
              <p className="text-px-12 text-white/70 tabular-nums">{earned} of {total}</p>
            </div>
            <ul className="mt-3 space-y-2.5">
              {collection.map(c => (
                <li key={c.category}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-px-13 text-white/85">{c.label}</span>
                    <span className="text-px-12 text-white/65 tabular-nums">{c.earned} of {c.total}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-white/70" style={{ width: `${(c.earned / c.total) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            <Link href="/progress" className="tap-44 inline-block mt-3 text-px-12 text-white/70 underline underline-offset-4">See every achievement →</Link>
          </section>
        )}

        {/* Your record */}
        <section className="mt-8">
          <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Your record</p>
          <ul className="mt-3 card-surface rounded-2xl divide-y divide-white/[0.08]">
            {[
              { href: '/era', label: 'Your era', sub: 'Who you’re becoming' },
              { href: '/proof', label: 'Proof', sub: 'What you’ve actually done' },
              { href: '/patterns', label: 'Your laws', sub: 'What your record shows' },
              { href: '/settings', label: 'Settings', sub: 'Name, notifications, account' },
            ].map(r => (
              <li key={r.href}>
                <Link href={r.href} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-px-15 text-white">{r.label}</p>
                    <p className="text-px-12 text-white/60">{r.sub}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/50" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {viewing && <AchievementCelebration achievement={viewing} viewOnly statusOf={statusOf} onClose={() => setDetailId(null)} />}
    </div>
  )
}
