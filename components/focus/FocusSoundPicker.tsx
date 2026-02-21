'use client'

import { useRef, useEffect } from 'react'
import { EqBars } from '@/components/ui/EqBars'
import { VolumeX } from 'lucide-react'
import { SOUNDSCAPE_ITEMS, type SoundscapeItem } from '@/components/player/SoundscapePlayer'
import { getSoundscapeBackground } from '@/components/home/home-types'

// All soundscapes available for focus
const FOCUS_SOUNDS = SOUNDSCAPE_ITEMS

interface FocusSoundPickerProps {
  selectedId: string | null
  onSelect: (sound: SoundscapeItem | null) => void
}

export function FocusSoundPicker({ selectedId, onSelect }: FocusSoundPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current && selectedId) {
      const el = scrollRef.current.querySelector(`[data-sound-id="${selectedId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedId])

  return (
    <div>
      <p className="text-xs text-white/90 uppercase tracking-widest mb-3">Ambient Sound</p>
      <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-6 px-6">
        {/* Silent option */}
        <button
          onClick={() => onSelect(null)}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <div className={`relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-200 ${
            selectedId === null
              ? 'bg-white text-black'
              : 'bg-black border border-white/[0.12] text-white'
          }`}>
            <VolumeX className="w-6 h-6 relative z-10" strokeWidth={1.5} />
          </div>
          <span className={`text-[11px] transition-colors ${selectedId === null ? 'text-white' : 'text-white/80'}`}>Silent</span>
        </button>

        {FOCUS_SOUNDS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === selectedId
          const bg = getSoundscapeBackground(item.id)
          return (
            <button
              key={item.id}
              data-sound-id={item.id}
              onClick={() => onSelect(item)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={`relative w-16 h-16 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-200 bg-black border border-white/[0.12] ${
                isActive ? 'ring-2 ring-white' : ''
              }`}>
                {bg && (
                  <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-black/20" />
                <div className="relative z-10">
                  {isActive ? (
                    <EqBars />
                  ) : (
                    <Icon className="w-6 h-6 text-white drop-shadow-md" strokeWidth={1.5} />
                  )}
                </div>
              </div>
              <span className={`text-[11px] transition-colors ${isActive ? 'text-white' : 'text-white/80'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
