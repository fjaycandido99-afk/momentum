'use client'

import { useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'

interface StressButtonProps {
  onActivate: () => void
  isLoading?: boolean
  className?: string
}

export function StressButton({ onActivate, isLoading, className = '' }: StressButtonProps) {
  const [isPressed, setIsPressed] = useState(false)

  const handlePress = () => {
    if (isLoading) return
    setIsPressed(true)
    onActivate()
    // Reset visual state after animation
    setTimeout(() => setIsPressed(false), 300)
  }

  return (
    <button
      onClick={handlePress}
      disabled={isLoading}
      className={`
        relative group flex items-center gap-2 px-4 py-2.5 rounded-2xl
        bg-white/[0.04] border border-white/[0.08]
        hover:bg-white/[0.06] hover:border-white/[0.12]
        active:scale-95 transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${isPressed ? 'scale-95 bg-white/[0.08]' : ''}
        ${className}
      `}
    >
      {/* Pulse animation on idle */}
      <span className="absolute inset-0 rounded-2xl bg-white/[0.06] animate-breathe opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center gap-2">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-white/90 animate-spin" />
        ) : (
          <Heart className="w-4 h-4 text-white/90" />
        )}
        <span className="text-sm font-medium text-white/90">
          {isLoading ? 'Loading...' : 'Need a moment?'}
        </span>
      </div>
    </button>
  )
}

// Floating version for fixed positioning
export function FloatingStressButton({ onActivate, isLoading }: Omit<StressButtonProps, 'className'>) {
  return (
    <div className="fixed bottom-28 right-6 z-40">
      <StressButton
        onActivate={onActivate}
        isLoading={isLoading}
        className="shadow-lg shadow-white/5"
      />
    </div>
  )
}
