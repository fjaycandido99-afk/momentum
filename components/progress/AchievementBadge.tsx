'use client'

import { Lock } from 'lucide-react'
import {
  CATEGORY_BADGE_IMAGES,
  type AchievementCategory,
  type AchievementRarity,
} from '@/lib/achievements'

/**
 * One achievement's badge, shared by the grid and the unlock celebration.
 *
 * Monochrome like the rest of Voxu: rarity is how much light the ring gives
 * off (faint → clear → bright → glowing), never a colour. The art is the
 * category's badge image when one is committed (CATEGORY_BADGE_IMAGES),
 * otherwise the achievement's emoji rendered in grayscale so it sits inside
 * the black-and-white look instead of breaking it.
 */

const RING: Record<AchievementRarity, string> = {
  common: 'ring-1 ring-white/20',
  rare: 'ring-1 ring-white/45',
  epic: 'ring-2 ring-white/70',
  legendary: 'ring-2 ring-white shadow-[0_0_24px_rgba(255,255,255,0.35)]',
}

export function AchievementBadge({
  category,
  icon,
  rarity,
  unlocked,
  size = 56,
}: {
  category: AchievementCategory
  icon: string
  rarity: AchievementRarity
  unlocked: boolean
  size?: number
}) {
  const image = CATEGORY_BADGE_IMAGES[category]

  return (
    <div
      className={`relative rounded-full overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_60%,rgba(0,0,0,0.4))] ${
        unlocked ? RING[rarity] : 'ring-1 ring-white/[0.08]'
      }`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover grayscale ${unlocked ? '' : 'opacity-15'}`}
        />
      ) : (
        <span
          className={`leading-none grayscale ${unlocked ? 'contrast-125' : 'opacity-15'}`}
          style={{ fontSize: Math.round(size * 0.46) }}
        >
          {icon}
        </span>
      )}
      {!unlocked && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Lock className="text-white/35" style={{ width: size * 0.3, height: size * 0.3 }} />
        </span>
      )}
      {/* A slow sheen across legendary badges — the one thing that moves. */}
      {unlocked && rarity === 'legendary' && (
        <>
          {/* Keyframes live here rather than in globals.css (mixed line
              endings there make edits risky); only legendary badges use it. */}
          <style>{'@keyframes badge-sheen{0%{background-position:150% 0}100%{background-position:-50% 0}}'}</style>
          <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_35%,rgba(255,255,255,0.35)_50%,transparent_65%)] bg-[length:250%_100%] animate-[badge-sheen_3.5s_ease-in-out_infinite] motion-reduce:animate-none" />
        </>
      )}
    </div>
  )
}
