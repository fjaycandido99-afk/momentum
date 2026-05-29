/**
 * Per-mindset visual signatures — Community uses FILM-STOCK TONAL
 * COLORS while the rest of Voxu stays monochrome cinematic.
 *
 * The community surface is the one place in Voxu that benefits from
 * color: feeds need visual variety + emotional energy to feel alive
 * (vs clinical). The palette here is deliberately desaturated and
 * earthy — closer to Kodak Portra / muted Instagram-2014 than to
 * Twitter primary colors. Reads as natural warmth, not branded loud.
 *
 * Each mindset gets a paired warm/cool tone:
 *   - Border: thin colored stripe (~25-40% alpha)
 *   - Glow: low-alpha colored radial wash on the card
 *   - Chip: subtle tonal bg + slightly tonal text
 *   - Avatar ring: same tonal hue
 *   - Vibe word: identity signifier shown next to the chip
 */

import type { MindsetId } from '@/lib/mindset/types'

export interface MindsetStyle {
  borderClass: string
  glowGradient: string
  chipClass: string
  avatarRing: string
  vibe: string
}

// Film-stock tonal palette per mindset — desaturated, earthy.
const STYLES: Record<MindsetId, MindsetStyle> = {
  // Marble + cool dawn — measured, cold-stone steadiness.
  stoic: {
    borderClass: 'border-l-2 border-l-[#9aa7b8]/30',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(154, 167, 184, 0.08) 0%, transparent 55%)',
    chipClass: 'text-[#c5d0dd] bg-[#8a98ad]/[0.06] border-[#9aa7b8]/15',
    avatarRing: 'ring-[#9aa7b8]/25',
    vibe: 'measured',
  },
  // Twilight indigo — searching, the void with depth.
  existentialist: {
    borderClass: 'border-l-2 border-l-[#7d83a8]/35',
    glowGradient: 'radial-gradient(circle at 5% 0%, rgba(125, 131, 168, 0.09) 0%, transparent 55%)',
    chipClass: 'text-[#bdc0d8] bg-[#7d83a8]/[0.07] border-[#7d83a8]/18',
    avatarRing: 'ring-[#7d83a8]/30',
    vibe: 'searching',
  },
  // Burnt ember — unfiltered, smoldering.
  cynic: {
    borderClass: 'border-l-2 border-l-[#b8865c]/35',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(184, 134, 92, 0.08) 0%, transparent 55%)',
    chipClass: 'text-[#dab48c] bg-[#b8865c]/[0.07] border-[#b8865c]/18',
    avatarRing: 'ring-[#b8865c]/30',
    vibe: 'unfiltered',
  },
  // Olive garden — savoring, earthy green.
  hedonist: {
    borderClass: 'border-l-2 border-l-[#8da872]/30',
    glowGradient: 'radial-gradient(circle at 5% 5%, rgba(141, 168, 114, 0.08) 0%, transparent 55%)',
    chipClass: 'text-[#bdd1a4] bg-[#8da872]/[0.06] border-[#8da872]/15',
    avatarRing: 'ring-[#8da872]/25',
    vibe: 'savoring',
  },
  // Deep burgundy — discipline edge, focused intensity.
  samurai: {
    borderClass: 'border-l-2 border-l-[#a8615c]/35',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(168, 97, 92, 0.09) 0%, transparent 55%)',
    chipClass: 'text-[#d9a4a0] bg-[#a8615c]/[0.07] border-[#a8615c]/18',
    avatarRing: 'ring-[#a8615c]/30',
    vibe: 'disciplined',
  },
  // Slate sky — curious, analytic blue.
  scholar: {
    borderClass: 'border-l-2 border-l-[#7494a8]/30',
    glowGradient: 'radial-gradient(circle at 5% 0%, rgba(116, 148, 168, 0.08) 0%, transparent 55%)',
    chipClass: 'text-[#b8c8d6] bg-[#7494a8]/[0.06] border-[#7494a8]/15',
    avatarRing: 'ring-[#7494a8]/25',
    vibe: 'curious',
  },
  // Faded gold — becoming, soft vision-light.
  manifestor: {
    borderClass: 'border-l-2 border-l-[#c2a567]/35',
    glowGradient: 'radial-gradient(circle at 10% 5%, rgba(194, 165, 103, 0.09) 0%, transparent 60%)',
    chipClass: 'text-[#e0c98e] bg-[#c2a567]/[0.07] border-[#c2a567]/18',
    avatarRing: 'ring-[#c2a567]/30',
    vibe: 'becoming',
  },
  // Copper fire — relentless, warmth with edge.
  hustler: {
    borderClass: 'border-l-2 border-l-[#c48a4a]/40',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(196, 138, 74, 0.10) 0%, transparent 55%)',
    chipClass: 'text-[#e3b07a] bg-[#c48a4a]/[0.08] border-[#c48a4a]/20',
    avatarRing: 'ring-[#c48a4a]/35',
    vibe: 'relentless',
  },
}

const DEFAULT_STYLE: MindsetStyle = {
  borderClass: 'border-l-2 border-l-white/15',
  glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.05) 0%, transparent 55%)',
  chipClass: 'text-white/65 bg-white/[0.04] border-white/8',
  avatarRing: 'ring-white/15',
  vibe: '',
}

export function getMindsetStyle(mindsetId: string | null | undefined): MindsetStyle {
  if (!mindsetId) return DEFAULT_STYLE
  return STYLES[mindsetId as MindsetId] || DEFAULT_STYLE
}

/**
 * Mood tints — also tonal (warm/cool washes), now at a higher alpha
 * since mood carries genuine emotional info. Saturated enough to
 * feel different but not enough to dominate.
 */
const MOOD_TINTS: Record<string, string> = {
  anxious:     'radial-gradient(circle at 100% 0%, rgba(140, 155, 200, 0.11) 0%, transparent 55%)',
  overwhelmed: 'radial-gradient(circle at 100% 0%, rgba(165, 140, 195, 0.11) 0%, transparent 55%)',
  stuck:       'radial-gradient(circle at 100% 0%, rgba(140, 150, 170, 0.10) 0%, transparent 55%)',
  hopeful:     'radial-gradient(circle at 100% 0%, rgba(210, 195, 140, 0.11) 0%, transparent 55%)',
  grateful:    'radial-gradient(circle at 100% 0%, rgba(170, 200, 165, 0.10) 0%, transparent 55%)',
  lost:        'radial-gradient(circle at 100% 0%, rgba(200, 165, 180, 0.10) 0%, transparent 55%)',
}

export function getMoodTint(mood: string | null | undefined): string {
  if (!mood) return 'transparent'
  return MOOD_TINTS[mood.toLowerCase()] || 'transparent'
}
