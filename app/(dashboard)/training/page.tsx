'use client'

import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { useEra } from '@/hooks/useEra'
import { PracticeSection } from '@/components/exercise/PracticeSection'
import { PracticesSection } from '@/components/practices/PracticesSection'
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
    <div className="min-h-screen bg-black text-white">
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

        <div className="mt-6 space-y-3">
          {/* Today's guided exercise — only exists inside an era. */}
          <PracticeSection hasEra={!!era} />

          {/* The disciplines they already keep. This is where they're added,
              renamed and retired. */}
          <PracticesSection canAdd />

          {!era && loaded && (
            <Link
              href="/era"
              className="block text-center py-3 rounded-xl bg-white text-black text-sm font-medium"
            >
              Start an era
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
