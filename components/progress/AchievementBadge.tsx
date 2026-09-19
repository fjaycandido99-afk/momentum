'use client'

import { Lock } from 'lucide-react'
import {
  CATEGORY_BADGE_IMAGES,
  type AchievementCategory,
  type AchievementRarity,
} from '@/lib/achievements'

/**
 * One achievement's badge, shared by the grid, the home shelf and the unlock
 * celebration.
 *
 * Two things make badges in the same category distinct at a glance (they all
 * share the category's coin art):
 *
 *  - The STAMP: a small plate at the foot of the coin carrying the
 *    achievement's number — "7", "30", "365", "2K" — or, when it has none,
 *    its own glyph. Getting Started and Year of Growth no longer look alike.
 *  - The FINISH, by rarity, still monochrome: common is darker, dull metal
 *    with a faint ring; rare is clean silver; epic is bright with a double
 *    ring; legendary is brightest, glowing, with a slow sheen.
 */

const FINISH: Record<AchievementRarity, { filter: string; ring: string; shadow?: string }> = {
  common: { filter: 'grayscale(1) brightness(0.72) contrast(1.05)', ring: 'ring-1 ring-white/15' },
  rare: { filter: 'grayscale(1) brightness(0.95) contrast(1.1)', ring: 'ring-1 ring-white/45' },
  epic: {
    filter: 'grayscale(1) brightness(1.12) contrast(1.18)',
    ring: 'ring-2 ring-white/75',
    // The second, outer ring — a thin halo separated by a black gap.
    shadow: '0 0 0 3px #000, 0 0 0 4px rgba(255,255,255,0.35)',
  },
  legendary: {
    filter: 'grayscale(1) brightness(1.25) contrast(1.22)',
    ring: 'ring-2 ring-white',
    shadow: '0 0 0 3px #000, 0 0 0 4px rgba(255,255,255,0.6), 0 0 26px rgba(255,255,255,0.4)',
  },
}

export function AchievementBadge({
  category,
  icon,
  rarity,
  unlocked,
  mark = null,
  size = 56,
}: {
  category: AchievementCategory
  icon: string
  rarity: AchievementRarity
  unlocked: boolean
  /** The achievement's number ("7", "30", "2K"), or null to stamp its glyph. */
  mark?: string | null
  size?: number
}) {
  const image = CATEGORY_BADGE_IMAGES[category]
  const finish = FINISH[rarity]
  const plateFont = Math.max(9, Math.round(size * 0.19))

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} aria-hidden>
      <div
        className={`absolute inset-0 rounded-full overflow-hidden flex items-center justify-center bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_60%,rgba(0,0,0,0.4))] ${
          unlocked ? finish.ring : 'ring-1 ring-white/[0.08]'
        }`}
        style={unlocked && finish.shadow ? { boxShadow: finish.shadow } : undefined}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover ${unlocked ? '' : 'opacity-[0.14]'}`}
            style={{ filter: unlocked ? finish.filter : 'grayscale(1)' }}
          />
        ) : (
          <span className={`leading-none grayscale ${unlocked ? '' : 'opacity-15'}`} style={{ fontSize: Math.round(size * 0.46) }}>
            {icon}
          </span>
        )}

        {!unlocked && (
          <span className="absolute inset-0 flex items-center justify-center pb-[18%]">
            <Lock className="text-white/35" style={{ width: size * 0.26, height: size * 0.26 }} />
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

      {/* The stamp: sits over the foot of the coin, like a struck plate. */}
      <span
        className={`absolute left-1/2 -translate-x-1/2 bottom-[-6%] rounded-full border px-[0.45em] leading-[1.5] font-semibold tabular-nums whitespace-nowrap ${
          unlocked
            ? rarity === 'legendary'
              ? 'bg-white text-black border-white'
              : 'bg-black text-white border-white/40'
            : 'bg-black text-white/30 border-white/10'
        }`}
        style={{ fontSize: plateFont }}
      >
        {mark ?? <span className="grayscale">{icon}</span>}
      </span>
    </div>
  )
}
