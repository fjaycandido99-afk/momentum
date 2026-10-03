'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { BackButton } from '@/components/ui/BackButton'
import { SceneImage } from '@/components/home/SceneImage'
import { SectionTabs } from '@/components/ui/SectionTabs'
import { LESSON_GROUPS, LESSONS, lessonsForLaws, readMinutes, type Lesson, type LessonGroup } from '@/lib/psychology/lessons'
import type { PatternReport } from '@/lib/patterns/rules'
import { trackFeature } from '@/lib/analytics/track'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The Psychology Library — short lessons on the ideas Voxu is built on,
 * each resting on a named study (lib/psychology/lessons).
 */
export default function PsychologyPage() {
  useEffect(() => { trackFeature('psychology', 'open') }, [])
  const [filter, setFilter] = useState<LessonGroup | 'all'>('all')
  // "For you": lessons related to their own solid laws. Nothing to show
  // until they have one — never guessed from anything else.
  const [forYou, setForYou] = useState<Lesson[]>([])
  useEffect(() => {
    fetch('/api/patterns', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((d: PatternReport | null) => {
        if (d) setForYou(lessonsForLaws(d.patterns.filter(p => p.strength === 'solid').map(p => p.kind)))
      })
      .catch(() => {})
  }, [])

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <BackButton />
        <SectionTabs section="learn" className="mt-2" />
        <div className="relative -mx-5 px-5 pt-1 pb-2 overflow-hidden">
        <SceneImage src="/scenes/psychology/library.jpg" fade="left-down" className="inset-y-0 right-0 w-[70%] h-full" opacity={0.75} />
        <p className="relative text-px-11 uppercase tracking-[0.24em] text-white/70 mt-3">Library</p>
        <h1 className="relative text-px-40 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>Psychology</h1>
        <p className="relative text-px-14 text-white/75 mt-2 leading-relaxed">
          The ideas behind how Voxu works — each one short, each one from a published study you can look up.
        </p>
        </div>

        {/* Groups as chips */}
        <div className="mt-5 -mx-5 px-5 flex gap-2 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Lesson groups">
          {[{ key: 'all' as const, title: 'All' }, ...LESSON_GROUPS].map(g => (
            <button
              key={g.key}
              role="tab"
              aria-selected={filter === g.key}
              onClick={() => setFilter(g.key)}
              className={`tap-44 shrink-0 px-3.5 py-1.5 rounded-full border text-px-13 transition-colors ${
                filter === g.key ? 'bg-white text-black border-white' : 'border-white/20 text-white/80'
              }`}
            >
              {g.title}
            </button>
          ))}
        </div>

        {/* For you — from their own laws */}
        {filter === 'all' && forYou.length > 0 && (
          <section className="mt-7">
            <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">For you</p>
            <p className="text-px-12 text-white/60 mt-0.5">Related to the laws your record shows.</p>
            <ul className="mt-3 space-y-2">
              {forYou.map(l => <LessonCard key={l.id} l={l} />)}
            </ul>
          </section>
        )}

        {LESSON_GROUPS.filter(g => filter === 'all' || g.key === filter).map(g => {
          const lessons = LESSONS.filter(l => l.group === g.key)
          if (lessons.length === 0) return null
          return (
            <section key={g.key} className="mt-8">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">{g.title}</p>
              <p className="text-px-12 text-white/60 mt-0.5">{g.sub}</p>
              <ul className="mt-3 space-y-2">
                {lessons.map(l => <LessonCard key={l.id} l={l} />)}
              </ul>
            </section>
          )
        })}

        <p className="text-px-11 text-white/55 mt-10 leading-relaxed">
          General findings about how people tend to work — not advice for your situation, and not a diagnosis of anything.
        </p>
      </div>
    </div>
  )
}

function LessonCard({ l }: { l: Lesson }) {
  const group = LESSON_GROUPS.find(g => g.key === l.group)
  return (
    <li>
      <Link
        href={`/psychology/${l.id}`}
        className="card-surface relative overflow-hidden rounded-2xl p-4 pl-[38%] min-h-[112px] flex items-center gap-3 press-scale"
      >
        {/* The photo as its own block on the left, as in the mockup: these are
            night scenes, and faded under text they all but disappeared. */}
        <SceneImage src={`/scenes/psychology/${l.id}.jpg`} fade="right" className="inset-y-0 left-0 w-[36%] h-full" position="center" opacity={1} />
        <div className="relative min-w-0 flex-1">
          <p className="text-px-17 text-white leading-snug" style={{ ...SERIF, fontWeight: 600 }}>{l.title}</p>
          <p className="text-px-13 text-white/70 mt-0.5 leading-snug">{l.line}</p>
          <p className="text-px-10 uppercase tracking-[0.16em] mt-1.5" style={{ color: 'rgb(var(--era-accent, 255 255 255))' }}>
            {group?.title} <span className="text-white/55 normal-case tracking-normal text-px-11">· {readMinutes(l)} min read</span>
          </p>
        </div>
        <ChevronRight className="relative w-4 h-4 text-white/50 shrink-0" />
      </Link>
    </li>
  )
}
