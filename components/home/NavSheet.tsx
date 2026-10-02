'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import {
  BarChart3, Bookmark, BookOpen, ChevronRight, Compass, Dumbbell, Headphones, HeartPulse, Home,
  Mic2, PenLine, Settings, Trophy, Waves, FlaskConical, X, type LucideIcon,
} from 'lucide-react'
import { ScrollLock } from '@/components/ui/ScrollLock'

/**
 * The menu — where Voxu's places live, opened from the spiral.
 *
 * Search used to double as this (a "Go to" list), which made search a menu
 * and the menu invisible. Now: four short sections, each place with one line
 * of what it is, and — where the app actually knows it — a live status
 * ("3 left", "Gym due", "Day 9 of 30"). No status is shown that nothing
 * measures: no "↑12%".
 */

export interface NavStatus {
  /** From Pulse: items still open today. */
  todayLeft: number | null
  /** From Pulse: a discipline due today, by name. */
  dueDiscipline: string | null
  era: { title: string; day: number; length: number } | null
  journaledToday: boolean
}

type Item = {
  label: string
  sub: string
  icon: LucideIcon
  href?: string
  onSelect?: () => void
  status?: string | null
  /** 0–1: a thin bar under the item (the era). */
  progress?: number
  /** Something here is waiting on them. */
  live?: boolean
}

export function NavSheet({
  status,
  onClose,
  onGuided,
  onSoundscapes,
}: {
  status: NavStatus
  onClose: () => void
  onGuided: () => void
  onSoundscapes: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const era = status.era
  const sections: { title: string; items: Item[] }[] = [
    {
      title: 'Your day',
      items: [
        {
          label: 'Today', sub: 'Your day, routine, promises', icon: Home, onSelect: onClose,
          status: status.todayLeft === null ? null : status.todayLeft === 0 ? 'All done' : `${status.todayLeft} left`,
          live: (status.todayLeft ?? 0) > 0,
        },
        {
          label: 'Training', sub: 'Workouts, disciplines, routines', icon: Dumbbell, href: '/training',
          status: status.dueDiscipline ? `${status.dueDiscipline} due` : null, live: !!status.dueDiscipline,
        },
        {
          label: 'Journal', sub: 'Write, or talk it through', icon: PenLine, href: '/journal',
          status: status.journaledToday ? 'Written today' : null,
        },
      ],
    },
    {
      title: 'Your journey',
      items: [
        {
          label: 'Your era', icon: Compass, href: '/era',
          sub: era ? `${era.title} · Day ${Math.min(era.day, era.length)} of ${era.length}` : 'Who are you becoming?',
          progress: era ? Math.min(1, era.day / era.length) : undefined,
        },
        { label: 'Progress', sub: 'Streaks, listening, journal stats', icon: BarChart3, href: '/progress' },
        { label: 'Proof', sub: 'What you’ve actually done', icon: Trophy, href: '/proof' },
        { label: 'Your laws', sub: 'What your record shows, and tests', icon: FlaskConical, href: '/patterns' },
      ],
    },
    {
      title: 'Library',
      items: [
        { label: 'Saved', sub: 'Everything you hearted', icon: Bookmark, href: '/saved' },
        { label: 'Daily Read', sub: 'One tap a day', icon: BookOpen, href: '/daily-read' },
        { label: 'Guided', sub: 'Breathing, focus, sleep', icon: Headphones, onSelect: onGuided },
        { label: 'Soundscapes', sub: 'Ambient sound for any moment', icon: Waves, onSelect: onSoundscapes },
      ],
    },
    {
      title: 'Support',
      items: [
        { label: 'Not feeling it', sub: 'A way back in for a hard day', icon: HeartPulse, href: '/reset' },
        { label: 'Coach voice', sub: 'How your coach speaks to you', icon: Mic2, href: '/mindset-selection' },
        { label: 'Settings', sub: 'Notifications, schedule, account', icon: Settings, href: '/settings' },
      ],
    },
  ]

  return (
    <div role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-[70]">
      <ScrollLock />
      <button aria-label="Close menu" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" />
      <nav
        aria-label="Voxu"
        className="absolute inset-y-0 right-0 w-[min(92vw,420px)] bg-[#070708] border-l border-white/[0.1] flex flex-col"
      >
        <div className="safe-area-pt px-5 pt-3 pb-2 flex items-center justify-between">
          <p className="text-px-12 tracking-[0.5em] uppercase text-white/70 pl-0.5">Voxu</p>
          <button onClick={onClose} aria-label="Close menu" className="w-9 h-9 rounded-full border border-white/[0.14] flex items-center justify-center press-scale">
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
          {sections.map(sec => (
            <section key={sec.title} className="mt-4">
              <p className="text-px-10 tracking-[0.3em] uppercase text-white/40 px-1 mb-2">{sec.title}</p>
              <ul className="space-y-1.5">
                {sec.items.map(it => {
                  const Icon = it.icon
                  const body = (
                    <>
                      <span className="w-9 h-9 shrink-0 rounded-full border border-white/[0.12] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-white/80" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-px-16 text-white leading-tight" style={{ fontFamily: 'var(--font-cormorant), Georgia, serif', fontWeight: 500 }}>
                          {it.label}
                        </span>
                        <span className="block text-px-12 text-white/50 truncate">{it.sub}</span>
                        {it.progress !== undefined && (
                          <span className="block h-1 rounded-full bg-white/10 mt-1.5 overflow-hidden" aria-hidden>
                            <span className="block h-full rounded-full era-accent-bg" style={{ width: `${Math.max(3, it.progress * 100)}%` }} />
                          </span>
                        )}
                      </span>
                      {it.status && (
                        <span className={`text-px-11 shrink-0 ${it.live ? 'text-white/85' : 'text-white/45'}`}>{it.status}</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-white/35 shrink-0" aria-hidden />
                    </>
                  )
                  const cls = 'w-full flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left press-scale'
                  return (
                    <li key={it.label}>
                      {it.href ? (
                        <Link href={it.href} onClick={onClose} className={cls}>{body}</Link>
                      ) : (
                        <button onClick={it.onSelect} className={cls}>{body}</button>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </nav>
    </div>
  )
}
