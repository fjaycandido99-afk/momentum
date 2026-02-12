'use client'

import { useRouter } from 'next/navigation'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_IDS, type MindsetId } from '@/lib/mindset/types'

interface MindsetSelectionScreenProps {
  /** If true, show as a "Reset My Path" picker instead of onboarding */
  isReset?: boolean
}

export function MindsetSelectionScreen({ isReset }: MindsetSelectionScreenProps) {
  const router = useRouter()

  const handleCardTap = (id: MindsetId) => {
    router.push(`/mindset-selection/${id}`)
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-light text-white tracking-wide">
          {isReset ? 'Reset Your Path' : 'Choose Your Path'}
        </h1>
        <p className="text-white/60 text-sm mt-2 max-w-xs mx-auto">
          {isReset
            ? 'Your AI coach, quotes, and journal will adapt to your new mindset.'
            : 'Your philosophy shapes everything — AI coaching, quotes, journal prompts, and visuals.'}
        </p>
        <p className="text-white/30 text-xs mt-3">
          Tap a path to learn more
        </p>
      </div>

      {/* 2x3 Grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {MINDSET_IDS.map((id) => {
          const config = MINDSET_CONFIGS[id]

          return (
            <button
              key={id}
              onClick={() => handleCardTap(id)}
              className="relative p-4 rounded-2xl text-left transition-all duration-200 min-h-[120px] bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <span className="text-2xl block mb-2">{config.icon}</span>
              <p className="font-medium text-sm text-white/90">
                {config.name}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5 leading-snug">
                {config.subtitle}
              </p>
              <p className="text-[10px] text-white/30 mt-1.5 leading-snug italic">
                {config.promptReferences.slice(0, 2).join(', ')}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
