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
    <div className="fixed bottom-0 left-0 right-0 z-30 p-4 safe-area-pb">
      <div
        className="flex items-center justify-between p-3 rounded-2xl bg-[#1a1a22]/95 border border-white/10 backdrop-blur-md shadow-[0_-4px_30px_rgba(0,0,0,0.5)] cursor-pointer"
        onClick={onOpenPlayer}
      >
        {/* Left: sound wave + status */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-white/10">
            {/* Sound wave icon */}
            <div className="flex items-end gap-[2px] w-5 h-5">
              <div className={`w-[3px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-1' : 'h-2'}`} />
              <div className={`w-[3px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-2' : 'h-3'}`} />
              <div className={`w-[3px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-3' : 'h-1.5'}`} />
              <div className={`w-[3px] rounded-full bg-white/70 ${isPlaying ? 'animate-sound-bar-4' : 'h-2.5'}`} />
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-white">
              {isPlaying ? 'Playing' : 'Paused'}
            </p>
            <p className="text-xs text-white/50">{label || MODE_LABELS[mode]}</p>
          </div>
        </div>

        {/* Right: play/pause button */}
        <button
          onClick={(e) => { e.stopPropagation(); onTogglePlay() }}
          className="p-3 rounded-full bg-white/10 hover:bg-white/15 transition-colors press-scale"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" fill="white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          )}
        </button>
      </div>
    </div>
  )
}
