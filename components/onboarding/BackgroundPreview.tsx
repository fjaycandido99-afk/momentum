'use client'

import { BACKGROUND_ANIMATIONS } from '@/components/player/DailyBackground'

interface BackgroundPreviewProps {
  animationId: string
  isSelected: boolean
  onSelect: () => void
}

export function BackgroundPreview({ animationId, isSelected, onSelect }: BackgroundPreviewProps) {
  const anim = BACKGROUND_ANIMATIONS.find(a => a.id === animationId)
  if (!anim) return null

  const AnimComponent = anim.component

  return (
    <button
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`relative rounded-xl overflow-hidden transition-all press-scale ${
        isSelected
          ? 'ring-2 ring-white/50 scale-[1.02]'
          : 'hover:ring-1 hover:ring-white/20'
      }`}
    >
      <div className="aspect-[3/2] relative bg-black">
        <AnimComponent animate topOffset={0} className="absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-2">
        <p className="text-xs font-medium text-white">{anim.name}</p>
      </div>
    </button>
  )
}
