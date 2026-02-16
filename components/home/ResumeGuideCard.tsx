'use client'

import { Play, CheckCircle2 } from 'lucide-react'

interface ResumeGuideCardProps {
  modulesCompleted: number
  totalModules: number
  onResume: () => void
}

export function ResumeGuideCard({ modulesCompleted, totalModules, onResume }: ResumeGuideCardProps) {
  if (modulesCompleted === 0 || modulesCompleted >= totalModules) return null

  const progress = Math.round((modulesCompleted / totalModules) * 100)

  return (
    <div className="px-6 mb-4">
      <button
        onClick={onResume}
        className="w-full relative p-4 rounded-2xl border border-white/15 bg-black press-scale text-left group"
      >
        <div className="flex items-center gap-3">
          <div className="relative p-2.5 rounded-xl bg-cyan-500/15 shrink-0">
            <Play className="w-4 h-4 text-cyan-400" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Continue Daily Guide</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-cyan-400/60 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-3 h-3 text-cyan-400/60" />
                <span className="text-[10px] text-white/40">{modulesCompleted}/{totalModules}</span>
              </div>
            </div>
          </div>
        </div>
      </button>
    </div>
  )
}
