'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { BackButton } from '@/components/ui/BackButton'
import { VoxuGuide } from '@/components/voice-guide/VoxuGuide'
import { lessonScript, talkOpener } from '@/lib/voice-guide/scripts'
import { SceneImage } from '@/components/home/SceneImage'
import { LoopDiagram } from '@/components/psychology/LoopDiagram'
import { LESSON_BY_ID, LESSON_FOR_EXPERIMENT, LESSON_GROUPS } from '@/lib/psychology/lessons'
import { trackFeature } from '@/lib/analytics/track'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const


/** One lesson: the idea, the loop if it has one, something to try, and its sources. */
export default function LessonPage() {
  const { id } = useParams<{ id: string }>()
  const lesson = LESSON_BY_ID.get(id)

  useEffect(() => { if (lesson) trackFeature('psychology', 'use', lesson.id) }, [lesson])

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white" data-app-shell>
      <div className="max-w-md md:max-w-lg mx-auto px-5 pb-16" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}>
        <div className="flex items-center justify-between">
          <BackButton fallback="/psychology" />
          {lesson && (
            <VoxuGuide
              screen="lesson"
              opener={talkOpener({ screen: 'lesson', lessonTitle: lesson.title })}
              lines={lessonScript(lesson)}
              experiment={(Object.entries(LESSON_FOR_EXPERIMENT).find(([, id]) => id === lesson.id)?.[0] ?? null) as 'morning_promise' | 'small_promise' | 'guide_first' | null}
              next={lesson.tryThis.href ? { say: 'Here\'s where to try it.', href: lesson.tryThis.href } : null}
            />
          )}
        </div>

        {!lesson ? (
          <p className="text-px-15 text-white/80 mt-6">That lesson isn&rsquo;t here. <Link href="/psychology" className="underline underline-offset-4">See all lessons</Link></p>
        ) : (
          <>
            {/* A hero, as in the mockup: the title sits over its lower edge. */}
            <div className="relative -mx-5 mt-2 h-60 -mb-20 overflow-hidden" aria-hidden>
              <SceneImage src={`/scenes/psychology/${lesson.id}.jpg`} fade="down" className="inset-0 w-full h-full" position="center 60%" opacity={1} />
            </div>
            <p className="relative text-px-11 uppercase tracking-[0.24em] text-white/70 mt-3">
              {LESSON_GROUPS.find(g => g.key === lesson.group)?.title}
            </p>
            <h1 data-voxu-spot="lesson-title" className="relative text-px-34 leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>{lesson.title}</h1>
            <p className="relative text-px-17 text-white/90 mt-3 leading-snug" style={SERIF}>{lesson.line}</p>

            <div className="mt-5 space-y-3" data-voxu-spot="lesson-body">
              {lesson.body.map((para, i) => (
                <p key={i} className="text-px-15 text-white/80 leading-relaxed">{para}</p>
              ))}
            </div>

            {lesson.loop && <LoopDiagram loop={lesson.loop} />}

            <div className="mt-6 card-surface rounded-2xl p-4" data-voxu-spot="lesson-try">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">Try this</p>
              <p className="text-px-15 text-white mt-1.5 leading-snug">{lesson.tryThis.text}</p>
              {lesson.tryThis.href && (
                <Link
                  href={lesson.tryThis.href}
                  className="tap-44 mt-3 inline-flex items-center px-3.5 py-2 rounded-full bg-white text-black text-px-13 font-medium press-scale"
                >
                  {lesson.tryThis.cta ?? 'Go'}
                </Link>
              )}
            </div>

            <div className="mt-8">
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/70">{lesson.sources.length === 1 ? 'Source' : 'Sources'}</p>
              <ul className="mt-2 space-y-3">
                {lesson.sources.map(s => (
                  <li key={s.cite}>
                    <p className="text-px-13 text-white/85 leading-snug">{s.finding}</p>
                    <p className="text-px-11 text-white/55 mt-1 leading-snug">{s.cite}</p>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-px-11 text-white/55 mt-8 leading-relaxed">
              A general finding about how people tend to work — not advice for your situation, and not a diagnosis.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
