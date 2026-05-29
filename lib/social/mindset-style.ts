/**
 * Per-mindset visual signatures for community posts — MONOCHROME.
 *
 * Voxu's visual identity is white/silver light on black — the colored
 * mindset accents (amber Hustler, violet Manifestor, etc.) fought
 * that direction and felt off-brand. This version keeps the visual
 * variety BUT through monochrome treatments: different white/silver
 * intensities, different glow positions, and breath rhythms — no
 * chroma.
 *
 * Variety still happens through:
 *   - The mindset CHIP TEXT (each mindset has a distinct word/vibe)
 *   - The breath animation on the aura layer
 *   - The essence quote, lesson card, echo quote per post
 *   - The mood tints (which carry actual mood information)
 *
 * That's enough differentiation without bringing color back in.
 */

import type { MindsetId } from '@/lib/mindset/types'

export interface MindsetStyle {
  /** Tailwind class for the colored left-edge stripe + glow. */
  borderClass: string
  /** Inline radial gradient applied as a subtle top-left wash. */
  glowGradient: string
  /** Accent text color for the mindset chip on the card. */
  chipClass: string
  /** Accent ring color for the avatar bubble. */
  avatarRing: string
  /** Short signifier word displayed beneath the mindset name (optional). */
  vibe: string
}

// All monochrome — borders are white with subtle alpha variation,
// glows vary in INTENSITY (0.08–0.12 alpha) and POSITION (top-left
// vs top-center) rather than hue. Keeps each mindset visually distinct
// while staying in Voxu's cinematic palette.
const STYLES: Record<MindsetId, MindsetStyle> = {
  stoic: {
    borderClass: 'border-l border-l-white/15',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.06) 0%, transparent 50%)',
    chipClass: 'text-white/75 bg-white/[0.04] border-white/10',
    avatarRing: 'ring-white/15',
    vibe: 'measured',
  },
  existentialist: {
    borderClass: 'border-l border-l-white/15',
    glowGradient: 'radial-gradient(circle at 10% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 60%)',
    chipClass: 'text-white/75 bg-white/[0.05] border-white/12',
    avatarRing: 'ring-white/15',
    vibe: 'searching',
  },
  cynic: {
    borderClass: 'border-l border-l-white/20',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.07) 0%, transparent 55%)',
    chipClass: 'text-white/80 bg-white/[0.05] border-white/12',
    avatarRing: 'ring-white/20',
    vibe: 'unfiltered',
  },
  hedonist: {
    borderClass: 'border-l border-l-white/15',
    glowGradient: 'radial-gradient(circle at 5% 5%, rgba(255, 255, 255, 0.06) 0%, transparent 55%)',
    chipClass: 'text-white/75 bg-white/[0.04] border-white/10',
    avatarRing: 'ring-white/15',
    vibe: 'savoring',
  },
  samurai: {
    borderClass: 'border-l border-l-white/20',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.08) 0%, transparent 50%)',
    chipClass: 'text-white/80 bg-white/[0.05] border-white/15',
    avatarRing: 'ring-white/20',
    vibe: 'disciplined',
  },
  scholar: {
    borderClass: 'border-l border-l-white/15',
    glowGradient: 'radial-gradient(circle at 5% 0%, rgba(255, 255, 255, 0.07) 0%, transparent 55%)',
    chipClass: 'text-white/75 bg-white/[0.04] border-white/10',
    avatarRing: 'ring-white/15',
    vibe: 'curious',
  },
  manifestor: {
    borderClass: 'border-l border-l-white/18',
    glowGradient: 'radial-gradient(circle at 10% 5%, rgba(255, 255, 255, 0.09) 0%, transparent 60%)',
    chipClass: 'text-white/80 bg-white/[0.05] border-white/12',
    avatarRing: 'ring-white/18',
    vibe: 'becoming',
  },
  hustler: {
    borderClass: 'border-l border-l-white/22',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.09) 0%, transparent 50%)',
    chipClass: 'text-white/85 bg-white/[0.06] border-white/15',
    avatarRing: 'ring-white/22',
    vibe: 'relentless',
  },
}

const DEFAULT_STYLE: MindsetStyle = {
  borderClass: 'border-l border-l-white/12',
  glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 55%)',
  chipClass: 'text-white/65 bg-white/[0.04] border-white/8',
  avatarRing: 'ring-white/12',
  vibe: '',
}

export function getMindsetStyle(mindsetId: string | null | undefined): MindsetStyle {
  if (!mindsetId) return DEFAULT_STYLE
  return STYLES[mindsetId as MindsetId] || DEFAULT_STYLE
}

/**
 * Mood → subtle background tint. KEPT colored (very lightly) because
 * mood is genuine information — knowing at a glance whether a post is
 * "anxious" vs "hopeful" matters. Pulled down to ~6% alpha so the
 * color reads more as warmth/coolness than as a hue.
 */
const MOOD_TINTS: Record<string, string> = {
  anxious:     'radial-gradient(circle at 100% 0%, rgba(180, 180, 220, 0.07) 0%, transparent 55%)',
  overwhelmed: 'radial-gradient(circle at 100% 0%, rgba(190, 180, 220, 0.07) 0%, transparent 55%)',
  stuck:       'radial-gradient(circle at 100% 0%, rgba(180, 185, 200, 0.06) 0%, transparent 55%)',
  hopeful:     'radial-gradient(circle at 100% 0%, rgba(220, 210, 180, 0.07) 0%, transparent 55%)',
  grateful:    'radial-gradient(circle at 100% 0%, rgba(200, 215, 195, 0.07) 0%, transparent 55%)',
  lost:        'radial-gradient(circle at 100% 0%, rgba(215, 195, 210, 0.06) 0%, transparent 55%)',
}

export function getMoodTint(mood: string | null | undefined): string {
  if (!mood) return 'transparent'
  return MOOD_TINTS[mood.toLowerCase()] || 'transparent'
}
