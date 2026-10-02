'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_IDS, type MindsetId } from '@/lib/mindset/types'
import { MINDSET_VOICES } from '@/lib/mindset/voice-samples'
import { SceneImage } from '@/components/home/SceneImage'

/** The picker's photograph (see lib/home/scenes.ts for the art rules). */
const MINDSET_SCENES = {
  /** A marble bust of a bearded philosopher in warm side light, far right. */
  hero: '/scenes/mindset/hero.jpg' as string | null,
}

interface MindsetSelectionScreenProps {
  /** If true, show as a "Reset My Path" picker instead of onboarding */
  isReset?: boolean
}

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The mindset picker, in the same language as the era picker: full-bleed
 * monochrome art, a serif title, nothing else competing.
 *
 * It used to carry a cartoon robot avatar on every card and a different
 * accent colour per mindset (stone, violet, orange, emerald, red, blue,
 * amber, cyan) — the only colour and the only cartoon left in the app.
 *
 * The framing matters as much as the look. With eras, a mindset is no
 * longer "your path"; it's the VOICE your coach speaks in. The era is what
 * you're working on.
 */
const TAGLINE = (id: MindsetId) => MINDSET_VOICES[id].tagline

/**
 * Card-sized, grayscale versions of the portraits (public/portraits/cards).
 * ?v= busts the iOS WebView's cache when the art is replaced — the file
 * name stays the same, so without it phones kept showing the old portraits.
 */
export const PORTRAIT_VERSION = 2
const cardImage = (id: MindsetId) => `/portraits/cards/${id}.jpg?v=${PORTRAIT_VERSION}`

const longestWord = (name: string) => Math.max(...name.split(/s+/).map(w => w.length))

function MindsetCard({ id, index, onTap }: { id: MindsetId; index: number; onTap: (id: MindsetId) => void }) {
  const [visible, setVisible] = useState(false)
  const config = MINDSET_CONFIGS[id]

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100 + index * 70)
    return () => clearTimeout(timer)
  }, [index])

  return (
    <button
      onClick={() => onTap(id)}
      style={{ containerType: 'inline-size' }}
      className={`gold-card relative overflow-hidden rounded-[18px] text-left aspect-[3/4] active:scale-[0.97] transition-all duration-500 group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* The same monochrome portrait as everywhere, toned warm. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImage(id)}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-top gold-tone opacity-80 group-hover:opacity-95 transition-opacity duration-300"
      />
      {/* Warm black rising from the foot so the title always reads. */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070504] via-[#070504]/75 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="gold-eyebrow !text-px-9 !tracking-[0.22em]">{TAGLINE(id)}</p>
        {/* Sized to the card, by its longest WORD: a name may wrap between
            words (Samurai / Code) but never inside one — break-words split
            MANIFESTOR into "MANIFESTO / R". cqw is the card's own width
            (container-type on the button), so it fits a phone and an iPad
            alike; 0.7em is a safe width for a Cormorant capital. */}
        <p
          className="leading-none text-white uppercase mt-1.5"
          style={{ ...SERIF, fontWeight: 600, fontSize: `min(32px, calc((100cqw - 28px) / ${(longestWord(config.name) * 0.7).toFixed(2)}))` }}
        >
          {config.name}
        </p>
        <p className="text-px-11 md:text-px-13 text-white/75 leading-snug mt-1.5 line-clamp-2">{config.subtitle}</p>
      </div>
    </button>
  )
}

export function MindsetSelectionScreen({ isReset }: MindsetSelectionScreenProps) {
  const router = useRouter()
  const [headerVisible, setHeaderVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleCardTap = (id: MindsetId) => {
    router.push(`/mindset-selection/${id}`)
  }

  return (
    <div className="min-h-screen voxu-gold flex flex-col items-center px-5 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-12 relative overflow-hidden">
      {/* The coach, in marble, over the title's right shoulder. Landscape so
          one photo serves a phone (its right side) and an iPad (all of it). */}
      <SceneImage
        src={MINDSET_SCENES.hero}
        fade="left-down"
        className="top-0 right-0 w-[72%] md:w-[60%] h-[440px] md:h-[520px]"
        position="center right"
        opacity={0.9}
      />
      {/*
        A way out, but only when there is one.

        The dashboard layout hides its nav on this route, so a change-your-
        coach visit had no exit at all: you either picked a mindset or you
        were stuck. router.back(), matching the detail screen next door, so
        it returns to wherever they came from — Settings, home's header, or
        Mindset Evolution.

        Absent during onboarding on purpose. There is nothing behind that
        step, and a back button that goes nowhere is worse than none.
      */}
      {isReset && (
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute left-3 top-[calc(env(safe-area-inset-top)+1.75rem)] p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 z-10"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      <div className={`relative text-center mb-8 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <p className="gold-eyebrow mb-3">
          {isReset ? 'Change your coach' : 'Your coach'}
        </p>
        <h1 className="text-px-52 md:text-px-64 leading-[0.92] text-white uppercase" style={{ ...SERIF, fontWeight: 600 }}>
          {isReset
            ? <>A new<br /><span className="gold-title">voice</span></>
            : <>How should<br /><span className="gold-title">it talk to you?</span></>}
        </h1>
        <p className="text-white/80 text-px-15 max-w-[320px] mx-auto leading-relaxed mt-4">
          Your era is what you&rsquo;re working on. Your mindset is how your coach talks to you about it.
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-3 md:gap-4 w-full max-w-sm md:max-w-xl">
        {MINDSET_IDS.map((id, i) => (
          <MindsetCard key={id} id={id} index={i} onTap={handleCardTap} />
        ))}
      </div>

      <p className={`relative text-white/50 text-px-11 mt-8 transition-all duration-700 delay-700 ${headerVisible ? 'opacity-100' : 'opacity-0'}`}>
        Tap one to see how it talks. You can change it anytime.
      </p>
    </div>
  )
}
