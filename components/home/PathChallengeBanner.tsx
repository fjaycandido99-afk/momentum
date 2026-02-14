'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Flame } from 'lucide-react'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import type { MindsetId } from '@/lib/mindset/types'
import type { PathStatus } from '@/lib/path-journey'

interface PathChallengeBannerProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
  /** When true, renders taller card for carousel use */
  embedded?: boolean
}

export function PathChallengeBanner({ mindsetId, embedded = false }: PathChallengeBannerProps) {
  const [status, setStatus] = useState<PathStatus | null>(null)
  const config = MINDSET_CONFIGS[mindsetId]

  useEffect(() => {
    fetch('/api/path/status')
      .then(r => r.ok ? r.json() : null)
      .then((data: PathStatus | null) => {
        if (data) setStatus(data)
      })
      .catch(() => {})
  }, [])

  const activities = [
    { key: 'reflection', done: status?.reflection },
    { key: 'exercise', done: status?.exercise },
    { key: 'quote', done: status?.quote },
    { key: 'soundscape', done: status?.soundscape },
  ]

  if (embedded) {
    return (
      <Link href="/my-path" className="block group">
        <div className="rounded-2xl border border-white/[0.15] p-6 press-scale bg-black min-h-[10rem] flex flex-col justify-between">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.12]">
              <MindsetIcon mindsetId={mindsetId} className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-white">Your {config.name} Path</h2>
              <p className="text-xs text-white/95">{config.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1.5">
              {activities.map((act) => (
                <div
                  key={act.key}
                  className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                    act.done ? 'bg-emerald-400' : 'bg-white/15'
                  }`}
                />
              ))}
            </div>
            {status && (
              <span className="text-sm text-white/95">{status.completedCount}/4 today</span>
            )}
            {status && status.streak > 0 && (
              <div className="flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-sm text-white/95 font-medium">{status.streak}d</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-white/95">Tap to open your path</p>
            <ChevronRight className="w-5 h-5 text-white/95 group-hover:text-white/95 transition-colors" />
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href="/my-path">
      <div className="card-gradient-border-lg rounded-2xl p-4 press-scale">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
              <MindsetIcon mindsetId={mindsetId} className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-white">Your {config.name} Path</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {activities.map((act) => (
                    <div
                      key={act.key}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        act.done ? 'bg-emerald-400' : 'bg-white/15'
                      }`}
                    />
                  ))}
                </div>
                {status && status.completedCount === 0 && (
                  <span className="text-[10px] text-white/80">0/4</span>
                )}
                {status && status.completedCount > 0 && (
                  <span className="text-[10px] text-white font-medium">{status.completedCount}/4</span>
                )}
                {status && status.streak > 0 && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                    <span className="text-[10px] text-white font-medium">{status.streak}d</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/80" />
        </div>
      </div>
    </Link>
  )
}
