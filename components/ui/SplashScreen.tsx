'use client'

import { useState, useEffect } from 'react'

interface SplashScreenProps {
  onComplete: () => void
  minDuration?: number
}

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false)
  const [showText, setShowText] = useState(false)

  // Show text after delay
  useEffect(() => {
    const textTimer = setTimeout(() => setShowText(true), 500)
    return () => clearTimeout(textTimer)
  }, [])

  // Fade out and complete
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFadeOut(true), minDuration - 500)
    const completeTimer = setTimeout(onComplete, minDuration)

    return () => {
      clearTimeout(fadeTimer)
      clearTimeout(completeTimer)
    }
  }, [minDuration, onComplete])

  return (
    <div
      className={`fixed inset-0 z-50 bg-black flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      data-nextjs-scroll-focus-boundary
    >
      {/* Animated logo */}
      <div className="w-28 h-28 relative flex items-center justify-center mb-8">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />

        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-white/35"
          style={{ animation: 'spin 6s linear infinite' }}
        />
        {/* Second ring */}
        <div
          className="absolute inset-3 rounded-full border-2 border-dotted border-white/50"
          style={{ animation: 'spin 5s linear infinite reverse' }}
        />
        {/* Third ring */}
        <div
          className="absolute inset-6 rounded-full border-2 border-dashed border-white/60"
          style={{ animation: 'spin 4s linear infinite' }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-9 rounded-full border-2 border-dotted border-white/70"
          style={{ animation: 'spin 3s linear infinite reverse' }}
        />
        {/* Center dot */}
        <div className="w-4 h-4 rounded-full bg-white shadow-[0_0_25px_rgba(255,255,255,0.9)]" />
      </div>

      {/* App name with fade in */}
      <div
        className={`text-center transition-all duration-700 ${
          showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h1
          className="text-3xl font-light text-white tracking-widest"
          style={{ fontFamily: 'var(--font-cormorant), Georgia, serif' }}
        >
          VOXU
        </h1>
        <p className="text-white/50 text-sm mt-2 tracking-wide">Your Audio Mentor</p>
      </div>
    </div>
  )
}
