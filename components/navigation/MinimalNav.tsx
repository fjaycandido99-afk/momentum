'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { Home, Pause } from 'lucide-react'
import { useHomeAudioOptional } from '@/contexts/HomeAudioContext'

const PAGE_LABELS: Record<string, string> = {
  '/settings': 'Settings',
  '/journal': 'Journal',
  '/saved': 'Saved',
  '/coach': 'Coach',
  '/progress': 'Progress',
}

export function MinimalNav() {
  const pathname = usePathname()
  const router = useRouter()
  const pageLabel = PAGE_LABELS[pathname] || ''
  const homeAudio = useHomeAudioOptional()
  const isDailyGuide = pathname === '/daily-guide'

  const isPlaying = homeAudio && !isDailyGuide && (
    homeAudio.audioState.musicPlaying ||
    homeAudio.audioState.guideIsPlaying ||
    homeAudio.audioState.soundscapeIsPlaying
  )

  const label = homeAudio ? (
    homeAudio.audioState.backgroundMusic?.label
    || homeAudio.audioState.guideLabel
    || homeAudio.audioState.activeSoundscape?.label
    || ''
  ) : ''

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!homeAudio) return
    const { audioState, dispatch, refs } = homeAudio
    if (audioState.musicPlaying) {
      dispatch({ type: 'PAUSE_MUSIC' })
    } else if (audioState.guideIsPlaying && refs.guideAudioRef.current) {
      refs.guideAudioRef.current.pause()
      dispatch({ type: 'PAUSE_GUIDE' })
    } else if (audioState.soundscapeIsPlaying) {
      dispatch({ type: 'PAUSE_SOUNDSCAPE' })
    }
  }

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-30 flex justify-center gap-2 pb-6 pt-3 pointer-events-none">
      {/* Player capsule — only when playing */}
      {isPlaying && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => router.push('/')}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push('/') } }}
          className="pointer-events-auto flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors press-scale cursor-pointer"
        >
          <div className="flex items-end gap-[2px] w-4 h-4">
            <div className="w-[2.5px] rounded-full bg-white/80 animate-sound-bar-1" />
            <div className="w-[2.5px] rounded-full bg-white/80 animate-sound-bar-2" />
            <div className="w-[2.5px] rounded-full bg-white/80 animate-sound-bar-3" />
          </div>
          <span className="text-sm text-white/95 max-w-[100px] truncate">{label}</span>
          <button
            aria-label="Pause"
            onClick={handlePause}
            className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
          >
            <Pause className="w-3 h-3 text-white/80" fill="white" fillOpacity={0.8} />
          </button>
        </div>
      )}

      {/* Home capsule */}
      <Link
        href="/"
        aria-label={pageLabel ? `Home — currently on ${pageLabel}` : 'Home'}
        className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 border border-white/15 hover:bg-white/15 backdrop-blur-sm transition-colors press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        <Home className="w-4 h-4 text-white/95" strokeWidth={1.5} aria-hidden="true" />
        {pageLabel && (
          <span className="text-sm text-white/95">{pageLabel}</span>
        )}
      </Link>
    </nav>
  )
}
