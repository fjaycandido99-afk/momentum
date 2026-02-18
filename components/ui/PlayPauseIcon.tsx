'use client'

interface PlayPauseIconProps {
  isPlaying: boolean
  size?: number
  className?: string
}

export default function PlayPauseIcon({ isPlaying, size = 32, className = '' }: PlayPauseIconProps) {
  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      {/* Play icon (triangle) */}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="absolute inset-0 transition-all duration-200 ease-out"
        style={{
          opacity: isPlaying ? 0 : 1,
          transform: isPlaying ? 'scale(0.8)' : 'scale(1)',
        }}
      >
        <polygon
          points="6,3 20,12 6,21"
          fill="currentColor"
          stroke="none"
        />
      </svg>

      {/* Pause icon (two bars) */}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className="absolute inset-0 transition-all duration-200 ease-out"
        style={{
          opacity: isPlaying ? 1 : 0,
          transform: isPlaying ? 'scale(1)' : 'scale(0.8)',
        }}
      >
        <rect x="5" y="3" width="4" height="18" rx="1" fill="currentColor" />
        <rect x="15" y="3" width="4" height="18" rx="1" fill="currentColor" />
      </svg>
    </div>
  )
}
