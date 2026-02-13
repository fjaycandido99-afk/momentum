'use client'

interface StreakFlameProps {
  streak: number
}

/**
 * Animated flame that grows based on streak length.
 * 0 = hidden, 1-3 = small, 4-7 = medium, 8+ = large with extra glow
 */
export function StreakFlame({ streak }: StreakFlameProps) {
  if (streak <= 0) return null

  // Size scales with streak
  const size = streak >= 8 ? 22 : streak >= 4 ? 18 : 14
  const glowIntensity = streak >= 8 ? 0.6 : streak >= 4 ? 0.4 : 0.25

  return (
    <span
      className="streak-flame"
      style={{
        fontSize: size,
        filter: `drop-shadow(0 0 ${streak >= 8 ? 6 : 4}px rgba(255,160,50,${glowIntensity}))`,
      }}
      title={`${streak}-day streak`}
    >
      🔥
    </span>
  )
}
