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
        <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl scale-150" />

        {/* Outer ring */}
        <div
          className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
        {/* Inner ring */}
        <div
          className="absolute inset-4 rounded-full border-2 border-dotted border-white/20"
          style={{ transform: `rotate(${-rotation * 1.3}deg)` }}
        />
        {/* Logo icon */}
        <svg
          viewBox="0 0 192 192"
          fill="none"
          className="w-[50%] h-[50%]"
        >
          <path d="M96 40L136 80H112V112H80V80H56L96 40Z" fill="white" />
          <path d="M56 128H136V152H56V128Z" fill="white" />
        </svg>
      </div>

      {/* App name with fade in */}
      <div
        className={`text-center transition-all duration-700 ${
          showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h1 className="text-3xl font-light text-white tracking-widest">VOXU</h1>
        <p className="text-white/95 text-sm mt-2 tracking-wide">Your AI Audio Coach</p>
      </div>
    </div>
  )
}
