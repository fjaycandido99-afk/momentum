'use client'

import { forwardRef } from 'react'

interface QuoteShareCardProps {
  quote: string
  author?: string
  mindset?: string
}

export const QuoteShareCard = forwardRef<HTMLDivElement, QuoteShareCardProps>(
  function QuoteShareCard({ quote, author, mindset }, ref) {
    return (
      <div
        ref={ref}
        className="w-[360px] p-8 bg-gradient-to-br from-[#0a0a0f] to-[#1a1a2e] rounded-2xl border border-white/15"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {/* Quote mark */}
        <div className="text-white/15 text-5xl leading-none mb-2">&ldquo;</div>

        {/* Quote text */}
        <p className="text-white text-lg leading-relaxed italic">
          {quote}
        </p>

        {/* Author */}
        {author && (
          <p className="text-white/70 text-sm mt-4 font-sans" style={{ fontFamily: 'Inter, sans-serif' }}>
            &mdash; {author}
          </p>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span className="text-white/50 text-xs">voxu.app</span>
          {mindset && (
            <span className="text-white/20 text-[10px] uppercase tracking-wider">{mindset}</span>
          )}
        </div>
      </div>
    )
  }
)
