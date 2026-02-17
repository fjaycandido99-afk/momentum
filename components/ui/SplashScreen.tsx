'use client'

import { useState, useEffect } from 'react'

interface SplashScreenProps {
  onComplete: () => void
  minDuration?: number
}

export function SplashScreen({ onComplete, minDuration = 2500 }: SplashScreenProps) {
  const [rotation, setRotation] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [showText, setShowText] = useState(false)

  // Rotation animation
  useEffect(() => {
    let frame: number
    let start = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - start) / 1000
      setRotation(elapsed * 60)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

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
    >
      {/* Animated logo */}
      <div className="w-28 h-28 relative flex items-center justify-center mb-8">
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full bg-white/10 blur-xl" />

        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-white/35"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        {/* Second ring */}
        <div
          className="absolute inset-3 rounded-full border-2 border-dotted border-white/50"
          style={{ transform: `rotate(${-rotation * 1.2}deg)` }}
        />
        {/* Third ring */}
        <div
          className="absolute inset-6 rounded-full border-2 border-dashed border-white/60"
          style={{ transform: `rotate(${rotation * 1.5}deg)` }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-9 rounded-full border-2 border-dotted border-white/70"
          style={{ transform: `rotate(${-rotation * 2}deg)` }}
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
        <p className="text-white/95 text-sm mt-2 tracking-wide">Your Audio Mentor</p>
      </div>
    </div>
  )
}
