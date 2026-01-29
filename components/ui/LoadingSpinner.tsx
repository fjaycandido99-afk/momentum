'use client'

import { useState, useEffect } from 'react'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    let frame: number
    let start = performance.now()

    const animate = (time: number) => {
      const elapsed = (time - start) / 1000
      setRotation(elapsed * 45)
      frame = requestAnimationFrame(animate)
    }

    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [])

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
  }

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  }

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center ${className}`}>
      {/* Outer ring - dashed, rotates clockwise slow */}
      <div
        className="absolute inset-0 rounded-full border-2 border-dashed border-white/20"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      {/* Middle ring - dotted, rotates counter-clockwise */}
      <div
        className="absolute inset-[15%] rounded-full border-2 border-dotted border-white/40"
        style={{ transform: `rotate(${-rotation * 1.3}deg)` }}
      />
      {/* Inner ring - dashed, rotates clockwise faster */}
      <div
        className="absolute inset-[30%] rounded-full border-2 border-dashed border-white/30"
        style={{ transform: `rotate(${rotation * 2}deg)` }}
      />
      {/* Center dot with glow */}
      <div className={`${dotSizes[size]} rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]`} />
    </div>
  )
}

// Full page loading screen
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  )
}
