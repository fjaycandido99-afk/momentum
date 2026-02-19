'use client'

import { useRef, useEffect } from 'react'
import { VolumeX } from 'lucide-react'
import { SOUNDSCAPE_ITEMS, type SoundscapeItem } from '@/components/player/SoundscapePlayer'

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
          <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
            selectedId === null
              ? 'bg-white text-black'
              : 'bg-black border border-white/[0.12] text-white'
          }`}>
            <VolumeX className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <span className={`text-[10px] transition-colors ${selectedId === null ? 'text-white' : 'text-white'}`}>Silent</span>
        </button>

        {FOCUS_SOUNDS.map((item) => {
          const Icon = item.icon
          const isActive = item.id === selectedId
          return (
            <button
              key={item.id}
              data-sound-id={item.id}
              onClick={() => onSelect(item)}
              className="flex flex-col items-center gap-1.5 shrink-0"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? 'bg-white text-black'
                  : 'bg-black border border-white/[0.12] text-white'
              }`}>
                <Icon className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <span className={`text-[10px] transition-colors ${isActive ? 'text-white' : 'text-white'}`}>{item.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
