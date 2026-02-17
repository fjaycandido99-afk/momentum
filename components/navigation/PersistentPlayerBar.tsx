'use client'

import { useRouter } from 'next/navigation'
import { Pause } from 'lucide-react'
import { useHomeAudioOptional } from '@/contexts/HomeAudioContext'

export function PersistentPlayerBar() {
  const router = useRouter()
  const homeAudio = useHomeAudioOptional()

  if (!homeAudio) return null

  const { audioState, dispatch, refs } = homeAudio
  const { guideAudioRef } = refs

  // Only show when audio is actively playing
  const isPlaying = audioState.musicPlaying || audioState.guideIsPlaying || audioState.soundscapeIsPlaying
  if (!isPlaying) return null

  const label = audioState.backgroundMusic?.label
    || audioState.guideLabel
    || audioState.activeSoundscape?.label
    || ''

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (audioState.musicPlaying) {
      dispatch({ type: 'PAUSE_MUSIC' })
    } else if (audioState.guideIsPlaying && guideAudioRef.current) {
      guideAudioRef.current.pause()
      dispatch({ type: 'PAUSE_GUIDE' })
    } else if (audioState.soundscapeIsPlaying) {
      dispatch({ type: 'PAUSE_SOUNDSCAPE' })
    }
  }

  return (
    <div className="fixed bottom-[52px] left-0 right-0 z-30 flex justify-center pointer-events-none">
      <div
        role="button"
        tabIndex={0}
        onClick={() => router.push('/')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/') } }}
        className="pointer-events-auto flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors press-scale cursor-pointer"
      >
        {/* Sound bars */}
        <div className="flex items-end gap-[2px] w-3 h-3">
          <div className="w-[2px] rounded-full bg-white/80 animate-sound-bar-1" />
          <div className="w-[2px] rounded-full bg-white/80 animate-sound-bar-2" />
          <div className="w-[2px] rounded-full bg-white/80 animate-sound-bar-3" />
        </div>
        <span className="text-sm text-white/95 max-w-[120px] truncate">{label}</span>
        <button
          aria-label="Pause"
          onClick={handlePause}
          className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <Pause className="w-3 h-3 text-white/80" fill="white" fillOpacity={0.8} />
        </button>
      </div>
    </div>
  )
}
