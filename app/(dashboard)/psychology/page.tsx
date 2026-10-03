'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { LESSON_GROUPS, LESSONS } from '@/lib/psychology/lessons'
import { trackFeature } from '@/lib/analytics/track'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The Psychology Library — short lessons on the ideas Voxu is built on,
 * each resting on a named study (lib/psychology/lessons).
 */
export default function PsychologyPage() {
  useEffect(() => { trackFeature('psychology', 'open') }, [])

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <Link href="/" aria-label="Back" className="tap-44 inline-flex p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white/80" />
        </Link>
        <p className="text-px-11 uppercase tracking-[0.24em] text-white/70 mt-3">Library</p>
        <h1 className="text-px-40 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>Psychology</h1>
        <p className="text-px-14 text-white/75 mt-2 leading-relaxed">
          The ideas behind how Voxu works — each one short, each one from a published study you can look up.
        </p>

        {LESSON_GROUPS.map(g => {
          const lessons = LESSONS.filter(l => l.group === g.key)
          if (lessons.length === 0) return null
          return (
            <section key={g.key} className="mt-8">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">{g.title}</p>
              <p className="text-px-12 text-white/60 mt-0.5">{g.sub}</p>
              <ul className="mt-3 space-y-2">
                {lessons.map(l => (
                  <li key={l.id}>
                    <Link
                      href={`/psychology/${l.id}`}
                      className="card-surface rounded-2xl p-4 flex items-center gap-3 press-scale"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-px-17 text-white leading-snug" style={{ ...SERIF, fontWeight: 600 }}>{l.title}</p>
                        <p className="text-px-13 text-white/70 mt-0.5 leading-snug">{l.line}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
                    </Link>
                  </li>
                ))}
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
