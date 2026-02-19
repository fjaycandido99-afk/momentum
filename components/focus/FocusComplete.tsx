'use client'

import { useRouter } from 'next/navigation'
import { RotateCcw, Home } from 'lucide-react'
import { haptic } from '@/lib/haptics'

interface FocusCompleteProps {
  minutesCompleted: number
  xpEarned: number | null
  onStartAnother: () => void
}

export function FocusComplete({ minutesCompleted, xpEarned, onStartAnother }: FocusCompleteProps) {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6">
      <div className="glass-refined rounded-3xl p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🎯</div>
        <h2 className="text-2xl font-bold text-white mb-1">Session Complete</h2>
        <p className="text-white/50 text-sm mb-6">Great focus work!</p>

        <div className="flex justify-center gap-6 mb-8">
          <div>
            <p className="text-3xl font-bold text-white">{minutesCompleted}</p>
            <p className="text-xs text-white/50">minutes</p>
          </div>
          {xpEarned !== null && (
            <div>
              <p className="text-3xl font-bold text-cyan-400">+{xpEarned}</p>
              <p className="text-xs text-white/50">XP earned</p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              haptic('light')
              router.push('/')
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white/8 border border-white/15 text-white/90 text-sm hover:bg-white/15 transition-colors press-scale"
          >
            <Home className="w-4 h-4" />
            Done
          </button>
          <button
            onClick={() => {
              haptic('light')
              onStartAnother()
            }}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-sm font-medium transition-transform active:scale-95 press-scale"
          >
            <RotateCcw className="w-4 h-4" />
            Again
          </button>
        </div>
      </div>
    </div>
  )
}
