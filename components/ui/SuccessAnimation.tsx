'use client'

const PARTICLE_COLORS = [
  'bg-amber-400',
  'bg-purple-400',
  'bg-indigo-400',
  'bg-white',
  'bg-amber-300',
  'bg-purple-300',
]

export function SuccessAnimation() {
  return (
    <div className="relative w-32 h-32 mx-auto">
      {/* Expanding rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute w-20 h-20 rounded-full border-2 border-white/30 success-ring" />
        <div className="absolute w-20 h-20 rounded-full border-2 border-white/20 success-ring" style={{ animationDelay: '0.5s' }} />
        <div className="absolute w-20 h-20 rounded-full border border-white/10 success-ring" style={{ animationDelay: '1s' }} />
      </div>

      {/* Confetti particles */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * 360
        const delay = i * 0.1
        const distance = 40 + (i % 3) * 15
        const x = Math.cos((angle * Math.PI) / 180) * distance
        const y = Math.sin((angle * Math.PI) / 180) * distance
        const colorClass = PARTICLE_COLORS[i % PARTICLE_COLORS.length]

        return (
          <div
            key={i}
            className={`absolute w-1.5 h-1.5 rounded-full ${colorClass} confetti-particle`}
            style={{
              left: `calc(50% + ${x}px)`,
              top: `calc(50% + ${y}px)`,
              animationDelay: `${delay}s`,
            }}
          />
        )
      })}

      {/* Center glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/10 to-white/5 animate-breathe" />
      </div>
    </div>
  )
}
