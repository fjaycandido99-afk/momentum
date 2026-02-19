'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Layers } from 'lucide-react'
import { SOUNDSCAPE_ITEMS } from '@/components/player/SoundscapePlayer'

const AMBIENT_LAYERS = [
  { id: 'rain', label: 'Rain', emoji: '\u{1F327}\u{FE0F}', soundscapeId: 'rain' },
  { id: 'thunder', label: 'Thunder', emoji: '\u26A1', soundscapeId: 'thunder' },
  { id: 'fire', label: 'Fireplace', emoji: '\u{1F525}', soundscapeId: 'fire' },
  { id: 'wind', label: 'Wind', emoji: '\u{1F32C}\u{FE0F}', soundscapeId: 'wind' },
  { id: 'birds', label: 'Birds', emoji: '\u{1F426}', soundscapeId: 'forest' },
  { id: 'waves', label: 'Ocean', emoji: '\u{1F30A}', soundscapeId: 'ocean' },
  { id: 'night', label: 'Night', emoji: '\u{1F319}', soundscapeId: 'night' },
  { id: 'cafe', label: 'Cafe', emoji: '\u2615', soundscapeId: 'cafe' },
]

// Build YouTube ID map from SOUNDSCAPE_ITEMS
const LAYER_YOUTUBE_IDS: Record<string, string> = {}
for (const layer of AMBIENT_LAYERS) {
  const item = SOUNDSCAPE_ITEMS.find(s => s.id === layer.soundscapeId)
  if (item) LAYER_YOUTUBE_IDS[layer.id] = item.youtubeId
}

interface YTPlayer {
  setVolume: (vol: number) => void
  destroy: () => void
  playVideo: () => void
}

interface AmbientMixerProps {
  onClose: () => void
}

export function AmbientMixer({ onClose }: AmbientMixerProps) {
  const [activeLayers, setActiveLayers] = useState<Record<string, number>>({})
  const playersRef = useRef<Map<string, YTPlayer>>(new Map())
  const containersRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const MAX_LAYERS = 3

  const createPlayer = useCallback((layerId: string) => {
    const youtubeId = LAYER_YOUTUBE_IDS[layerId]
    if (!youtubeId) return
    const YT = (window as any).YT
    if (!YT?.Player) return

    const containerId = `mixer-layer-${layerId}`
    let container = document.getElementById(containerId) as HTMLDivElement | null
    if (!container) {
      container = document.createElement('div')
      container.id = containerId
      container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;'
      document.body.appendChild(container)
    }
    containersRef.current.set(layerId, container)

    const player = new YT.Player(containerId, {
      videoId: youtubeId,
      playerVars: { autoplay: 1, loop: 1, playlist: youtubeId, controls: 0 },
      events: {
        onReady: (e: any) => {
          e.target.setVolume(50)
          e.target.playVideo()
        },
        onStateChange: (e: any) => {
          if (e.data === YT.PlayerState.ENDED) {
            e.target.playVideo()
          }
        },
      },
    })
    playersRef.current.set(layerId, player)
  }, [])

  const destroyPlayer = useCallback((layerId: string) => {
    const player = playersRef.current.get(layerId)
    if (player) {
      try { player.destroy() } catch {}
      playersRef.current.delete(layerId)
    }
    const container = containersRef.current.get(layerId)
    if (container?.parentNode) {
      container.parentNode.removeChild(container)
      containersRef.current.delete(layerId)
    }
  }, [])

  const toggleLayer = useCallback((id: string) => {
    if (activeLayers[id] !== undefined) {
      destroyPlayer(id)
      setActiveLayers(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    } else {
      if (Object.keys(activeLayers).length >= MAX_LAYERS) return
      createPlayer(id)
      setActiveLayers(prev => ({ ...prev, [id]: 50 }))
    }
  }, [activeLayers, createPlayer, destroyPlayer])

  const setVolume = useCallback((id: string, vol: number) => {
    const player = playersRef.current.get(id)
    if (player) {
      try { player.setVolume(vol) } catch {}
    }
    setActiveLayers(prev => ({ ...prev, [id]: vol }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      playersRef.current.forEach((player, id) => {
        try { player.destroy() } catch {}
        const container = containersRef.current.get(id)
        if (container?.parentNode) container.parentNode.removeChild(container)
      })
      playersRef.current.clear()
      containersRef.current.clear()
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
