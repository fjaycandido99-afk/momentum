'use client'

interface TarotCardVisualProps {
  numeral: string
  className?: string
}

export function TarotCardVisual({ numeral, className = '' }: TarotCardVisualProps) {
  return (
    <div className={`tarot-card-enter ${className}`}>
      <svg
        viewBox="0 0 140 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Gradient border */}
          <linearGradient id="tarot-border" x1="0" y1="0" x2="140" y2="200" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
          </linearGradient>
          {/* Inner glow */}
          <radialGradient id="tarot-glow" cx="50%" cy="45%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          {/* Star gradient */}
          <linearGradient id="star-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Card background */}
        <rect x="2" y="2" width="136" height="196" rx="12" fill="#0a0a12" />

        {/* Outer border */}
        <rect x="2" y="2" width="136" height="196" rx="12" fill="none" stroke="url(#tarot-border)" strokeWidth="2" />

        {/* Inner frame */}
        <rect x="12" y="12" width="116" height="176" rx="6" fill="none" stroke="url(#tarot-border)" strokeWidth="0.5" strokeOpacity="0.4" />

        {/* Inner glow */}
        <rect x="12" y="12" width="116" height="176" rx="6" fill="url(#tarot-glow)" />

        {/* Corner accents - top left */}
        <path d="M12 30 L12 12 L30 12" fill="none" stroke="url(#tarot-border)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Corner accents - top right */}
        <path d="M110 12 L128 12 L128 30" fill="none" stroke="url(#tarot-border)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Corner accents - bottom left */}
        <path d="M12 170 L12 188 L30 188" fill="none" stroke="url(#tarot-border)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Corner accents - bottom right */}
        <path d="M110 188 L128 188 L128 170" fill="none" stroke="url(#tarot-border)" strokeWidth="1.5" strokeLinecap="round" />

        {/* Top diamond */}
        <path d="M70 28 L76 38 L70 48 L64 38 Z" fill="url(#star-fill)" fillOpacity="0.5" />

        {/* Bottom diamond */}
        <path d="M70 152 L76 162 L70 172 L64 162 Z" fill="url(#star-fill)" fillOpacity="0.5" />

        {/* Left star dot */}
        <circle cx="30" cy="100" r="2" fill="url(#star-fill)" fillOpacity="0.6" />
        {/* Right star dot */}
        <circle cx="110" cy="100" r="2" fill="url(#star-fill)" fillOpacity="0.6" />

        {/* Small decorative crosses */}
        {/* Top left cross */}
        <path d="M32 36 L32 42 M29 39 L35 39" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.3" />
        {/* Top right cross */}
        <path d="M108 36 L108 42 M105 39 L111 39" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.3" />
        {/* Bottom left cross */}
        <path d="M32 158 L32 164 M29 161 L35 161" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.3" />
        {/* Bottom right cross */}
        <path d="M108 158 L108 164 M105 161 L111 161" stroke="#fbbf24" strokeWidth="0.8" strokeOpacity="0.3" />

        {/* Roman numeral - centered */}
        <text
          x="70"
          y="105"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#fde68a"
          fontSize="28"
          fontFamily="serif"
          fontWeight="600"
          stroke="#f59e0b"
          strokeWidth="0.5"
          strokeOpacity="0.3"
        >
          {numeral}
        </text>
      </svg>
    </div>
  )
}
