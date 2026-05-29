/**
 * Per-mindset visual signatures — MONOCHROME (kept on-brand with
 * the rest of Voxu's cinematic identity).
 *
 * Variety in the feed comes from the LAYOUT of each post (voice
 * player hero / essence pull-quote / lesson card / echo / etc.),
 * not from colored mindset accents. See PostCard for the per-post
 * layout variation.
 */

import type { MindsetId } from '@/lib/mindset/types'

export interface MindsetStyle {
  borderClass: string
  glowGradient: string
  chipClass: string
  avatarRing: string
  vibe: string
}

// All monochrome — borders are white with subtle alpha variation,
// glows vary in intensity (0.05–0.09 alpha) and position (top-left
// vs slight offset) so each mindset still has a distinct visual feel
// without bringing color back in.
const STYLES: Record<MindsetId, MindsetStyle> = {
  stoic:          { borderClass: 'border-l border-l-white/15', glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.06) 0%, transparent 50%)',  chipClass: 'text-white/75 bg-white/[0.04] border-white/10',  avatarRing: 'ring-white/15', vibe: 'measured' },
  existentialist: { borderClass: 'border-l border-l-white/15', glowGradient: 'radial-gradient(circle at 10% 0%, rgba(255,255,255,0.08) 0%, transparent 60%)', chipClass: 'text-white/75 bg-white/[0.05] border-white/12', avatarRing: 'ring-white/15', vibe: 'searching' },
  cynic:          { borderClass: 'border-l border-l-white/20', glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.07) 0%, transparent 55%)',  chipClass: 'text-white/80 bg-white/[0.05] border-white/12', avatarRing: 'ring-white/20', vibe: 'unfiltered' },
  hedonist:       { borderClass: 'border-l border-l-white/15', glowGradient: 'radial-gradient(circle at 5% 5%, rgba(255,255,255,0.06) 0%, transparent 55%)',  chipClass: 'text-white/75 bg-white/[0.04] border-white/10',  avatarRing: 'ring-white/15', vibe: 'savoring' },
  samurai:        { borderClass: 'border-l border-l-white/20', glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.08) 0%, transparent 50%)',  chipClass: 'text-white/80 bg-white/[0.05] border-white/15', avatarRing: 'ring-white/20', vibe: 'disciplined' },
  scholar:        { borderClass: 'border-l border-l-white/15', glowGradient: 'radial-gradient(circle at 5% 0%, rgba(255,255,255,0.07) 0%, transparent 55%)',  chipClass: 'text-white/75 bg-white/[0.04] border-white/10',  avatarRing: 'ring-white/15', vibe: 'curious' },
  manifestor:     { borderClass: 'border-l border-l-white/18', glowGradient: 'radial-gradient(circle at 10% 5%, rgba(255,255,255,0.09) 0%, transparent 60%)', chipClass: 'text-white/80 bg-white/[0.05] border-white/12', avatarRing: 'ring-white/18', vibe: 'becoming' },
  hustler:        { borderClass: 'border-l border-l-white/22', glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.09) 0%, transparent 50%)',  chipClass: 'text-white/85 bg-white/[0.06] border-white/15', avatarRing: 'ring-white/22', vibe: 'relentless' },
}

const DEFAULT_STYLE: MindsetStyle = {
  borderClass: 'border-l border-l-white/12',
  glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.04) 0%, transparent 55%)',
  chipClass: 'text-white/65 bg-white/[0.04] border-white/8',
  avatarRing: 'ring-white/12',
  vibe: '',
}

export function getMindsetStyle(mindsetId: string | null | undefined): MindsetStyle {
  if (!mindsetId) return DEFAULT_STYLE
  return STYLES[mindsetId as MindsetId] || DEFAULT_STYLE
}

/**
 * Mood tints — kept VERY subtle monochrome washes. Mood is conveyed
 * by the chip text + chip emoji, not by tinting the whole card.
 */
const MOOD_TINTS: Record<string, string> = {
  anxious:     'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.04) 0%, transparent 55%)',
  overwhelmed: 'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.05) 0%, transparent 55%)',
  stuck:       'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.03) 0%, transparent 55%)',
  hopeful:     'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.05) 0%, transparent 55%)',
  grateful:    'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.05) 0%, transparent 55%)',
  lost:        'radial-gradient(circle at 100% 0%, rgba(255,255,255,0.03) 0%, transparent 55%)',
}

export function getMoodTint(mood: string | null | undefined): string {
  if (!mood) return 'transparent'
  return MOOD_TINTS[mood.toLowerCase()] || 'transparent'
}
