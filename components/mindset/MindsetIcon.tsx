import type { MindsetId } from '@/lib/mindset/types'

interface MindsetIconProps {
  mindsetId: MindsetId
  className?: string
  size?: number
}

function StoicIcon() {
  return (
    <>
      {/* Top beam */}
      <line x1="5" y1="4" x2="19" y2="4" />
      <line x1="6" y1="4" x2="7" y2="7" />
      <line x1="18" y1="4" x2="17" y2="7" />
      {/* Columns */}
      <line x1="7" y1="7" x2="7" y2="18" />
      <line x1="12" y1="6" x2="12" y2="18" />
      <line x1="17" y1="7" x2="17" y2="18" />
      {/* Base */}
      <line x1="4" y1="18" x2="20" y2="18" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </>
  )
}

function ExistentialistIcon() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5.5" />
      <circle cx="12" cy="12" r="2" />
    </>
  )
}

function CynicIcon() {
  return (
    <>
      {/* Handle */}
      <path d="M12 2 L12 5" />
      <path d="M9 5 L15 5" />
      {/* Top ring */}
      <circle cx="12" cy="5" r="1.5" />
      {/* Lamp body */}
      <path d="M8 8 L7 17 L17 17 L16 8 Z" />
      {/* Cross bars */}
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="7.3" y1="14" x2="16.7" y2="14" />
      {/* Flame */}
      <path d="M12 10.5 Q13.5 12 12 13.5 Q10.5 12 12 10.5" />
      {/* Base */}
      <line x1="6" y1="17" x2="18" y2="17" />
      <path d="M8 17 L9 20 L15 20 L16 17" />
    </>
  )
}

function HedonistIcon() {
  return (
    <>
      {/* Stem */}
      <line x1="12" y1="22" x2="12" y2="15" />
      {/* Center petal */}
      <path d="M12 6 Q14 9 12 12 Q10 9 12 6" />
      {/* Left petals */}
      <path d="M7 9 Q9.5 10 12 12 Q8.5 12 7 9" />
      <path d="M5 13 Q8 13 12 12 Q8 15 5 13" />
      {/* Right petals */}
      <path d="M17 9 Q14.5 10 12 12 Q15.5 12 17 9" />
      <path d="M19 13 Q16 13 12 12 Q16 15 19 13" />
      {/* Leaves */}
      <path d="M12 18 Q9 17 7 19" />
      <path d="M12 18 Q15 17 17 19" />
    </>
  )
}

function SamuraiIcon() {
  return (
    <>
      {/* First katana (top-left to bottom-right) */}
      <line x1="4" y1="4" x2="20" y2="20" />
      {/* Handle wrap */}
      <line x1="5.5" y1="4.5" x2="4.5" y2="5.5" />
      <line x1="7" y1="6" x2="6" y2="7" />
      {/* Guard */}
      <line x1="8.5" y1="7" x2="7" y2="8.5" />
      {/* Second katana (top-right to bottom-left) */}
      <line x1="20" y1="4" x2="4" y2="20" />
      {/* Handle wrap */}
      <line x1="18.5" y1="4.5" x2="19.5" y2="5.5" />
      <line x1="17" y1="6" x2="18" y2="7" />
      {/* Guard */}
      <line x1="15.5" y1="7" x2="17" y2="8.5" />
      {/* Center circle */}
      <circle cx="12" cy="12" r="2" />
    </>
  )
}

function ScholarIcon() {
  return (
    <>
      {/* Scroll body */}
      <path d="M6 4 C4 4 4 7 6 7 L6 17 C4 17 4 20 6 20 L18 20 C20 20 20 17 18 17 L18 7 C20 7 20 4 18 4 Z" />
      {/* Top curl */}
      <path d="M6 4 C6 6 4.5 6.5 4.5 5" />
      {/* Bottom curl */}
      <path d="M6 20 C6 18 4.5 17.5 4.5 19" />
      {/* Stars */}
      <circle cx="10" cy="9" r="0.8" />
      <circle cx="14" cy="12" r="0.8" />
      <circle cx="10" cy="15" r="0.8" />
      {/* Lines on scroll */}
      <line x1="12" y1="9" x2="16" y2="9" />
      <line x1="8" y1="12" x2="12.5" y2="12" />
      <line x1="12" y1="15" x2="16" y2="15" />
    </>
  )
}

function ManifestorIcon() {
  return (
    <>
      {/* Central eye */}
      <ellipse cx="12" cy="12" rx="7" ry="4" />
      <circle cx="12" cy="12" r="2" />
      {/* Rays */}
      <line x1="12" y1="3" x2="12" y2="6" />
      <line x1="12" y1="18" x2="12" y2="21" />
      <line x1="4" y1="8" x2="6.5" y2="9.5" />
      <line x1="17.5" y1="9.5" x2="20" y2="8" />
      <line x1="4" y1="16" x2="6.5" y2="14.5" />
      <line x1="17.5" y1="14.5" x2="20" y2="16" />
    </>
  )
}

function HustlerIcon() {
  return (
    <>
      {/* Mountain peak */}
      <path d="M12 4 L20 20 L4 20 Z" />
      {/* Flag at peak */}
      <line x1="12" y1="4" x2="12" y2="2" />
      <path d="M12 2 L16 3.5 L12 5" />
      {/* Steps */}
      <line x1="8" y1="16" x2="16" y2="16" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </>
  )
}

const ICON_MAP: Record<MindsetId, () => JSX.Element> = {
  stoic: StoicIcon,
  existentialist: ExistentialistIcon,
  cynic: CynicIcon,
  hedonist: HedonistIcon,
  samurai: SamuraiIcon,
  scholar: ScholarIcon,
  manifestor: ManifestorIcon,
  hustler: HustlerIcon,
}

export function MindsetIcon({ mindsetId, className = 'w-6 h-6', size }: MindsetIconProps) {
  const IconContent = ICON_MAP[mindsetId]
  if (!IconContent) return null

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...(size ? { width: size, height: size } : {})}
    >
      <IconContent />
    </svg>
  )
}
