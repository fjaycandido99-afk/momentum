'use client'

import { forwardRef } from 'react'

interface StreakShareCardProps {
  days: number
  message?: string
}

export const StreakShareCard = forwardRef<HTMLDivElement, StreakShareCardProps>(
  function StreakShareCard({ days, message }, ref) {
    return (
      <div
        ref={ref}
        className="w-[360px] p-8 bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl border border-white/15 text-center"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Streak number */}
        <div className="text-5xl font-light text-white mb-2">
          {days}
        </div>
        <p className="text-white/70 text-sm uppercase tracking-widest mb-4">
          day streak
        </p>

        {/* Message */}
        {message && (
          <p className="text-white/85 text-sm">
            {message}
          </p>
        )}

        {/* Visual element */}
        <div className="flex justify-center gap-1 mt-6 mb-4">
          {Array.from({ length: Math.min(days, 7) }, (_, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-full bg-white"
              style={{ opacity: 0.3 + (i / 7) * 0.7 }}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/15">
          <span className="text-white/50 text-xs">voxu.app</span>
        </div>
      </div>
    )
  }
)
