'use client'

import Image from 'next/image'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'

const PORTRAIT_PATHS: Record<MindsetId, string> = {
  stoic: '/portraits/stoic.jpg',
  existentialist: '/portraits/existentialist.jpg',
  cynic: '/portraits/cynic.jpg',
  hedonist: '/portraits/hedonist.jpg',
  samurai: '/portraits/samurai.jpg',
  scholar: '/portraits/scholar.jpg',
  manifestor: '/portraits/manifestor.jpg',
  hustler: '/portraits/hustler.jpg',
}

interface MindsetPortraitProps {
  mindsetId: MindsetId
  /** Size variant */
  size?: 'sm' | 'md' | 'lg'
}

export function MindsetPortrait({ mindsetId, size = 'lg' }: MindsetPortraitProps) {
  const config = MINDSET_CONFIGS[mindsetId]

  const sizeClasses = {
    sm: 'w-20 h-24',
    md: 'w-36 h-48',
    lg: 'w-56 h-72',
  }

  const imgDimensions = {
    sm: { width: 80, height: 96 },
    md: { width: 144, height: 192 },
    lg: { width: 224, height: 288 },
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        {/* Soft ambient glow behind portrait */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-32 h-32 rounded-full bg-white/[0.04] blur-2xl" />
        </div>
        <div
          className={`relative ${sizeClasses[size]} overflow-hidden`}
          style={{
            maskImage: [
              'linear-gradient(to bottom, transparent 0%, black 12%, black 80%, transparent 100%)',
              'linear-gradient(to right, transparent 0%, black 10%, black 82%, transparent 100%)',
            ].join(', '),
            WebkitMaskImage: [
              'linear-gradient(to bottom, transparent 0%, black 12%, black 80%, transparent 100%)',
              'linear-gradient(to right, transparent 0%, black 10%, black 82%, transparent 100%)',
            ].join(', '),
            maskComposite: 'intersect',
            WebkitMaskComposite: 'destination-in' as any,
          }}
        >
          <Image
            src={PORTRAIT_PATHS[mindsetId]}
            alt={`Portrait of ${config.name}`}
            width={imgDimensions[size].width}
            height={imgDimensions[size].height}
            className="object-cover w-full h-full brightness-90"
            priority
          />
        </div>
      </div>
    </div>
  )
}
