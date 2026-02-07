import { type LucideIcon } from 'lucide-react'

type ColorTheme = 'amber' | 'purple' | 'indigo' | 'emerald' | 'white'

interface DecorativeIconProps {
  icon: LucideIcon
  color?: ColorTheme
  size?: 'sm' | 'md'
  glow?: boolean
}

const COLOR_MAP: Record<ColorTheme, { bg: string; icon: string; glow: string }> = {
  amber: {
    bg: 'bg-gradient-to-br from-amber-500/20 to-orange-500/20',
    icon: 'text-amber-400',
    glow: 'shadow-[0_0_12px_rgba(245,158,11,0.15)]',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500/20 to-pink-500/20',
    icon: 'text-purple-400',
    glow: 'shadow-[0_0_12px_rgba(168,85,247,0.15)]',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20',
    icon: 'text-indigo-400',
    glow: 'shadow-[0_0_12px_rgba(99,102,241,0.15)]',
  },
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20',
    icon: 'text-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.15)]',
  },
  white: {
    bg: 'bg-white/10',
    icon: 'text-white',
    glow: 'shadow-[0_0_12px_rgba(255,255,255,0.08)]',
  },
}

export function DecorativeIcon({ icon: Icon, color = 'white', size = 'md', glow = false }: DecorativeIconProps) {
  const theme = COLOR_MAP[color]
  const sizeClass = size === 'sm' ? 'p-1.5' : 'p-2'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <div className={`${sizeClass} rounded-xl ${theme.bg} ${glow ? `${theme.glow} decorative-glow` : ''}`}>
      <Icon className={`${iconSize} ${theme.icon}`} />
    </div>
  )
}
