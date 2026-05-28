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

        {/* Footer — audio-forward: invites the viewer to *hear* it in the app */}
        <div className="mt-6 pt-4 border-t border-white/15 flex items-center justify-between" style={{ fontFamily: 'Inter, sans-serif' }}>
          <span className="inline-flex items-center gap-1.5 text-white/75 text-xs font-medium">
            {/* play glyph (explicit fill so html2canvas rasterizes it reliably) */}
            <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" fill="rgba(255,255,255,0.75)" />
            </svg>
            Listen on Voxu
          </span>
          {mindset && (
            <span className="text-white/20 text-[10px] uppercase tracking-wider">{mindset}</span>
          )}
        </div>
        <p className="text-white/30 text-[10px] mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>voxu.app</p>
      </div>
    )
  }
)
