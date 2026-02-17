'use client'

import { useState, useEffect } from 'react'
import { Sparkles } from 'lucide-react'

interface WelcomeScreenProps {
  onContinue: () => void
}

export function WelcomeScreen({ onContinue }: WelcomeScreenProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6">
      <div className={`text-center transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Logo/icon */}
        <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-white/5 border border-white/15 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-white" />
        </div>

        {/* Title */}
        <h1 className="text-3xl font-light text-white tracking-wide mb-3">
          Welcome to Voxu
        </h1>

        {/* Subtitle */}
        <p className="text-white/75 text-sm max-w-xs mx-auto leading-relaxed mb-2">
          Your audio companion for growth, focus, and clarity.
        </p>

        {/* Feature highlights */}
        <div className="mt-8 space-y-3 max-w-xs mx-auto text-left">
          {[
            { text: 'Personalized daily guided sessions' },
            { text: 'Ambient soundscapes and focus music' },
            { text: 'Coaching adapted to your philosophy' },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-white/85 text-sm"
              style={{ animationDelay: `${0.3 + i * 0.15}s` }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-white/40 flex-shrink-0" />
              {item.text}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="mt-10 px-8 py-3.5 bg-white text-black rounded-full text-sm font-medium hover:bg-white/90 transition-colors press-scale"
        >
          Get Started
        </button>

        <p className="text-white/50 text-xs mt-4">
          Takes about 2 minutes
        </p>
      </div>
    </div>
  )
}
