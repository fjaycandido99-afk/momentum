'use client'

import { Play, Pause } from 'lucide-react'

type Mode = 'focus' | 'relax' | 'sleep' | 'energy'

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  relax: 'Relax',
  sleep: 'Sleep',
  energy: 'Energy',
}

interface BottomPlayerBarProps {
  mode: Mode
  isPlaying: boolean
  onTogglePlay: () => void
  onOpenPlayer: () => void
  label?: string // Override subtitle (e.g. guide name)
}

export function BottomPlayerBar({ mode, isPlaying, onTogglePlay, onOpenPlayer, label }: BottomPlayerBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 safe-area-pb">
      {/* Main bar */}
      <div
        className="mx-4 mb-2 flex items-center justify-between px-4 py-3 rounded-full bg-[#1a1a1a] border border-white/10 cursor-pointer"
        onClick={onOpenPlayer}
      >
        {/* Left: sound bars icon + text */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
            {/* Sound wave bars */}
            <div className="flex items-end gap-[2px] w-4 h-4">
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-1' : 'h-1.5'}`} />
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-2' : 'h-2.5'}`} />
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-3' : 'h-1'}`} />
              <div className={`w-[2.5px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-4' : 'h-2'}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white leading-tight">
              {isPlaying ? 'Playing' : 'Paused'}
            </p>
            <p className="text-xs text-white/95 leading-tight">{label || MODE_LABELS[mode]}</p>
          </div>
        </div>

        {/* Right: play/pause */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
          className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center hover:border-white/40 transition-colors press-scale"
        >
          {isPlaying ? (
            <Pause className="w-[18px] h-[18px] text-white" fill="white" />
          ) : (
            <Play className="w-[18px] h-[18px] text-white ml-0.5" fill="white" />
          )}
        </button>
      </div>
    </div>
  )
}
