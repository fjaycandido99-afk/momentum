'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useEra } from '@/hooks/useEra'
import { PracticeSection } from '@/components/exercise/PracticeSection'
import { PracticesSection } from '@/components/practices/PracticesSection'
import { Shelf } from '@/components/books/Shelf'
import { RoutineSection } from '@/components/routines/RoutineSection'
import { PatternsBlock } from '@/components/practices/PatternsBlock'
import { attributeLabel, attributesForEra } from '@/lib/exercises/attributes'
import { eraName } from '@/lib/era/presets'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * /training — the practice side of the app, on its own page.
 *
 * It lived inside /era, which was fine while it was one card and wrong once
 * it was three: an era is what you are working on, this is the work. Home
 * still shows today's practice and any practice that is due, because that is
 * a thing to DO today; managing them happens here.
 */
export default function TrainingPage() {
  const { era, loaded } = useEra()
  const trains = attributesForEra(era?.key)

  return (
    /*
      App-shell scrolling, like /era, /daily-read, /journal and home.
      This page was the odd one out on `min-h-screen`, which means the
      DOCUMENT scrolls — and that matters for more than rubber-banding:
      useBodyScrollLock has two paths, and the document-scrolling one has to
      pin `position: fixed` on <body>, which makes WKWebView re-resolve the
      page box against the safe area and shove everything down by the inset.
      That is the bug that once dropped home's header by ~59px.

      With a scrolling container the lock is a class and nothing moves. So
      the sheets opened from this page — the plan editor, the book sheet —
      can freeze what is behind them safely.
    */
    <div className="h-[100dvh] overflow-y-auto overscroll-contain bg-black text-white" data-app-shell>
      <div
        className="max-w-md md:max-w-lg mx-auto px-5 pb-24"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1rem)' }}
      >
        <Link href="/" aria-label="Back" className="inline-flex p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </Link>

        <div className="mt-3">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Training</p>
          <h1 className="text-[34px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
            The work, not the wanting.
          </h1>
          {era ? (
            <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
              Your {eraName(era.title)} is training{' '}
              {trains.map(a => attributeLabel(a).toLowerCase()).join(', ')}.
            </p>
          ) : loaded ? (
            <p className="text-[13px] text-white/55 mt-2 leading-relaxed">
              Practices work on their own. Start an era and you also get a guided exercise each day,
              sized to where you are in it.
            </p>
          ) : null}
        </div>

        {/* Two things on this page, and they are not the same kind of thing:
            ONE exercise for today, and the disciplines you keep for months.
            They used to be called "Today's practice" and "Your practices",
            which made the reader work out the difference. */}
        <div className="mt-7">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Today</p>
          <p className="text-[12px] text-white/45 mt-0.5">Your one mindset exercise for today.</p>
          <div className="mt-2.5">
            <PracticeSection hasEra={!!era} />
          </div>
        </div>

        <div className="mt-7 space-y-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Disciplines</p>
            <p className="text-[12px] text-white/45 mt-0.5">
              The long-term things you&rsquo;re staying consistent with.
            </p>
          </div>
          <PracticesSection canAdd />
        </div>

        {/* The routine: the shape of the day and when. Above the shelf and
            below the disciplines on purpose — it is the thing that ties the
            others together, and it reads from them. */}
        <RoutineSection />

        {/* Renders nothing until a book has been finished, so it never
            advertises itself at somebody who reads without resolving one. */}
        <Shelf />

        {/* What it has noticed. Last on the page on purpose: the answer for
            today comes before any observation about the last three months. */}
        <div className="mt-7 space-y-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Patterns</p>
            <p className="text-[12px] text-white/45 mt-0.5">What Voxu is learning about you.</p>
          </div>
          <PatternsBlock />
        </div>

        {!era && loaded && (
          <Link
            href="/era"
            className="block text-center mt-7 py-3 rounded-xl bg-white text-black text-sm font-medium"
          >
            Start an era
          </Link>
        )}
      </div>
    </div>
  )
}
