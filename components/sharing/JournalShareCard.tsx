'use client'

import { forwardRef } from 'react'

interface JournalShareCardProps {
  content: string
  date: string
  mood?: string
}

export const JournalShareCard = forwardRef<HTMLDivElement, JournalShareCardProps>(
  function JournalShareCard({ content, date, mood }, ref) {
    return (
      <div
        ref={ref}
        className="w-[360px] p-6 bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl border border-white/10"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/40 text-xs">{date}</span>
          {mood && (
            <span className="text-sm">{mood}</span>
          )}
        </div>

        {/* Content */}
        <p className="text-white text-sm leading-relaxed line-clamp-6">
          {content}
        </p>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-white/30 text-xs">voxu.app</span>
          <span className="text-white/20 text-[10px]">Journal Entry</span>
        </div>
      </div>
    )
  }
)
