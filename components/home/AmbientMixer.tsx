'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { X, Layers } from 'lucide-react'

const AMBIENT_LAYERS = [
  { id: 'rain', label: 'Rain', emoji: '\u{1F327}\u{FE0F}' },
  { id: 'thunder', label: 'Thunder', emoji: '\u26A1' },
  { id: 'fire', label: 'Fireplace', emoji: '\u{1F525}' },
  { id: 'wind', label: 'Wind', emoji: '\u{1F32C}\u{FE0F}' },
  { id: 'birds', label: 'Birds', emoji: '\u{1F426}' },
  { id: 'waves', label: 'Ocean', emoji: '\u{1F30A}' },
  { id: 'night', label: 'Night', emoji: '\u{1F319}' },
  { id: 'cafe', label: 'Cafe', emoji: '\u2615' },
]

const SOUND_URLS: Record<string, string> = {
  rain: 'https://cdn.freesound.org/previews/531/531947_6364814-lq.mp3',
  thunder: 'https://cdn.freesound.org/previews/362/362225_1166348-lq.mp3',
  fire: 'https://cdn.freesound.org/previews/499/499257_4828702-lq.mp3',
  wind: 'https://cdn.freesound.org/previews/406/406899_7716079-lq.mp3',
  birds: 'https://cdn.freesound.org/previews/531/531015_10274857-lq.mp3',
  waves: 'https://cdn.freesound.org/previews/467/467539_9653378-lq.mp3',
  night: 'https://cdn.freesound.org/previews/380/380200_1676145-lq.mp3',
  cafe: 'https://cdn.freesound.org/previews/454/454594_5765561-lq.mp3',
}

interface AmbientMixerProps {
  onClose: () => void
}

export function AmbientMixer({ onClose }: AmbientMixerProps) {
  const [activeLayers, setActiveLayers] = useState<Record<string, number>>({})
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map())
  const MAX_LAYERS = 3

  const toggleLayer = useCallback((id: string) => {
    if (activeLayers[id] !== undefined) {
      // Fade out and remove
      const audio = audioRefs.current.get(id)
      if (audio) {
        const fadeOut = setInterval(() => {
          if (audio.volume > 0.05) {
            audio.volume = Math.max(0, audio.volume - 0.05)
          } else {
            clearInterval(fadeOut)
            audio.pause()
            audio.src = ''
            audioRefs.current.delete(id)
          }
        }, 30)
      }
      setActiveLayers(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } else {
      // Check max
      if (Object.keys(activeLayers).length >= MAX_LAYERS) return
      // Create and play
      const audio = new Audio(SOUND_URLS[id])
      audio.loop = true
      audio.volume = 0.5
      audio.play().catch(() => {})
      audioRefs.current.set(id, audio)
      setActiveLayers(prev => ({ ...prev, [id]: 50 }))
    }
  }, [activeLayers])

  const setVolume = useCallback((id: string, vol: number) => {
    const audio = audioRefs.current.get(id)
    if (audio) audio.volume = vol / 100
    setActiveLayers(prev => ({ ...prev, [id]: vol }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause()
        audio.src = ''
      })
      audioRefs.current.clear()
    }
  }, [])

  const activeCount = Object.keys(activeLayers).length

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-2xl animate-sheet-slide-up"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'sheet-slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) both' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-white/70" />
            <h3 className="text-sm font-semibold text-white/90">Ambient Mixer</h3>
            <span className="text-[11px] text-white/40">{activeCount}/{MAX_LAYERS}</span>
          </div>
          <button onClick={onClose} aria-label="Close mixer" className="p-2 rounded-full hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Layer Grid */}
        <div className="grid grid-cols-2 gap-2 px-5 pb-5">
          {AMBIENT_LAYERS.map(layer => {
            const isActive = activeLayers[layer.id] !== undefined
            const vol = activeLayers[layer.id] ?? 50
            const atMax = activeCount >= MAX_LAYERS && !isActive
            return (
              <div key={layer.id} className={`rounded-xl border transition-all duration-200 ${isActive ? 'bg-white/[0.08] border-white/20' : 'bg-white/[0.03] border-white/[0.08]'} ${atMax ? 'opacity-40' : ''}`}>
                <button
                  onClick={() => !atMax && toggleLayer(layer.id)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-left"
                  disabled={atMax}
                >
                  <span className="text-lg">{layer.emoji}</span>
                  <span className={`text-sm ${isActive ? 'text-white/90' : 'text-white/50'}`}>{layer.label}</span>
                </button>
                {isActive && (
                  <div className="px-3 pb-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={vol}
                      onChange={e => setVolume(layer.id, Number(e.target.value))}
                      className="w-full h-1 appearance-none bg-white/15 rounded-full accent-white cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                      aria-label={`${layer.label} volume`}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
