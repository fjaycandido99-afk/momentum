'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, Flame } from 'lucide-react'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { PATH_ACCENT_COLORS } from '@/lib/path-journey'
import type { MindsetId } from '@/lib/mindset/types'
import type { PathStatus } from '@/lib/path-journey'

interface PathChallengeBannerProps {
  mindsetId: Exclude<MindsetId, 'scholar'>
}

export function PathChallengeBanner({ mindsetId }: PathChallengeBannerProps) {
  const [status, setStatus] = useState<PathStatus | null>(null)
  const config = MINDSET_CONFIGS[mindsetId]
  const accentColor = PATH_ACCENT_COLORS[mindsetId]

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

  return (
    <Link href="/my-path">
      <div className="card-gradient-border-lg rounded-2xl p-4 press-scale">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center">
              <MindsetIcon mindsetId={mindsetId} className="w-4 h-4 text-white/70" />
            </div>
            <div>
              <p className={`text-[13px] font-semibold ${accentColor}`}>Your {config.name} Path</p>
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
                  <span className="text-[10px] text-white/50">0/4</span>
                )}
                {status && status.completedCount > 0 && (
                  <span className="text-[10px] text-white/60 font-medium">{status.completedCount}/4</span>
                )}
                {status && status.streak > 0 && (
                  <div className="flex items-center gap-0.5 ml-1">
                    <Flame className="w-2.5 h-2.5 text-orange-400" />
                    <span className="text-[10px] text-orange-300 font-medium">{status.streak}d</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-white/50" />
        </div>
      </div>
    </Link>
  )
}
