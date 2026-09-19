'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_IDS, type MindsetId } from '@/lib/mindset/types'
import { MINDSET_VOICES } from '@/lib/mindset/voice-samples'

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

/** Card-sized, grayscale versions of the portraits (public/portraits/cards). */
const cardImage = (id: MindsetId) => `/portraits/cards/${id}.jpg`

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
      className={`relative overflow-hidden rounded-2xl text-left aspect-[3/4] border border-white/[0.14] bg-black active:scale-[0.97] transition-all duration-500 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none group ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={cardImage(id)}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-top grayscale opacity-70 group-hover:opacity-85 transition-opacity duration-300"
      />
      {/* Black rising from the foot so the title always reads. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-3.5">
        <p className="text-[9px] tracking-[0.22em] uppercase text-white/55">{TAGLINE(id)}</p>
        <p className="text-[24px] leading-none text-white uppercase mt-1" style={{ ...SERIF, fontWeight: 600 }}>
          {config.name}
        </p>
        <p className="text-[11px] text-white/70 leading-snug mt-1.5 line-clamp-2">{config.subtitle}</p>
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
    <div className="min-h-screen bg-black flex flex-col items-center px-5 pt-[calc(env(safe-area-inset-top)+2.5rem)] pb-12 relative overflow-hidden">
      <div className={`text-center mb-8 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <p className="text-white/55 text-[10px] font-medium tracking-[0.28em] uppercase mb-3">
          {isReset ? 'Change your coach' : 'Your coach'}
        </p>
        <h1 className="text-[40px] leading-[0.95] text-white uppercase" style={{ ...SERIF, fontWeight: 600 }}>
          {isReset ? <>A new<br />voice</> : <>How should<br />it talk to you?</>}
        </h1>
        <p className="text-white/70 text-sm max-w-[300px] mx-auto leading-relaxed mt-4">
          Your era is what you&rsquo;re working on. Your mindset is how your coach talks to you about it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {MINDSET_IDS.map((id, i) => (
          <MindsetCard key={id} id={id} index={i} onTap={handleCardTap} />
        ))}
      </div>

      <p className={`text-white/50 text-[11px] mt-8 transition-all duration-700 delay-700 ${headerVisible ? 'opacity-100' : 'opacity-0'}`}>
        Tap one to see how it talks. You can change it anytime.
      </p>
    </div>
  )
}
