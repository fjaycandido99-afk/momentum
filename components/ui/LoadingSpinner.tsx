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

  return (
    <div className={`${sizeClasses[size]} relative flex items-center justify-center ${className}`}>
      {/* Rotating ring */}
      <div
        className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
        style={{ transform: `rotate(${rotation}deg)` }}
      />
      {/* Logo icon */}
      <svg
        viewBox="0 0 192 192"
        fill="none"
        className="w-[55%] h-[55%] animate-pulse"
      >
        <path d="M96 40L136 80H112V112H80V80H56L96 40Z" fill="white" />
        <path d="M56 128H136V152H56V128Z" fill="white" />
      </svg>
    </div>
  )
}

// Full page loading screen
export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6">
      <div className="relative">
        {/* Glow behind logo */}
        <div className="absolute inset-0 rounded-full bg-white/10 blur-2xl scale-150" />
        <LoadingSpinner size="lg" />
      </div>
      <p className="text-lg font-light text-white/80 tracking-widest">VOXU</p>
    </div>
  )
}
