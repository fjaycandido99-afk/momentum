/**
 * Per-mindset visual signatures for community posts.
 *
 * Each mindset gets:
 *   - An accent color (drives left-edge stripe, mindset chip, avatar ring,
 *     subtle glow). All translucent so the dark canvas stays primary.
 *   - A radial gradient hint (subtle wash on the top-left of the card)
 *     that maps to the mindset's philosophical "world" — fire for Hustler,
 *     cosmic indigo for Manifestor, marble grey for Stoic, etc.
 *
 * The goal isn't to color-code aggressively — it's to break up the
 * "wall of identical cards" feeling so a Stoic reflection FEELS
 * different from a Hustler reflection at a glance, without making
 * either one look like a notification.
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

const STYLES: Record<MindsetId, MindsetStyle> = {
  stoic: {
    borderClass: 'border-l-2 border-l-slate-400/40',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(148, 163, 184, 0.10) 0%, transparent 55%)',
    chipClass: 'text-slate-300/85 bg-slate-400/10 border-slate-400/20',
    avatarRing: 'ring-slate-400/30',
    vibe: 'measured',
  },
  existentialist: {
    borderClass: 'border-l-2 border-l-indigo-400/40',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(129, 140, 248, 0.12) 0%, transparent 55%)',
    chipClass: 'text-indigo-300/90 bg-indigo-400/10 border-indigo-400/20',
    avatarRing: 'ring-indigo-400/30',
    vibe: 'searching',
  },
  cynic: {
    borderClass: 'border-l-2 border-l-orange-400/40',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(251, 146, 60, 0.10) 0%, transparent 55%)',
    chipClass: 'text-orange-300/85 bg-orange-400/10 border-orange-400/20',
    avatarRing: 'ring-orange-400/30',
    vibe: 'unfiltered',
  },
  hedonist: {
    borderClass: 'border-l-2 border-l-emerald-400/40',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(52, 211, 153, 0.10) 0%, transparent 55%)',
    chipClass: 'text-emerald-300/85 bg-emerald-400/10 border-emerald-400/20',
    avatarRing: 'ring-emerald-400/30',
    vibe: 'savoring',
  },
  samurai: {
    borderClass: 'border-l-2 border-l-rose-400/45',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(251, 113, 133, 0.10) 0%, transparent 55%)',
    chipClass: 'text-rose-300/90 bg-rose-400/10 border-rose-400/20',
    avatarRing: 'ring-rose-400/35',
    vibe: 'disciplined',
  },
  scholar: {
    borderClass: 'border-l-2 border-l-sky-400/40',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(56, 189, 248, 0.10) 0%, transparent 55%)',
    chipClass: 'text-sky-300/85 bg-sky-400/10 border-sky-400/20',
    avatarRing: 'ring-sky-400/30',
    vibe: 'curious',
  },
  manifestor: {
    borderClass: 'border-l-2 border-l-violet-400/45',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(167, 139, 250, 0.12) 0%, transparent 55%)',
    chipClass: 'text-violet-300/90 bg-violet-400/10 border-violet-400/20',
    avatarRing: 'ring-violet-400/35',
    vibe: 'becoming',
  },
  hustler: {
    borderClass: 'border-l-2 border-l-amber-400/45',
    glowGradient: 'radial-gradient(circle at 0% 0%, rgba(251, 191, 36, 0.10) 0%, transparent 55%)',
    chipClass: 'text-amber-300/90 bg-amber-400/10 border-amber-400/20',
    avatarRing: 'ring-amber-400/35',
    vibe: 'relentless',
  },
}

const DEFAULT_STYLE: MindsetStyle = {
  borderClass: 'border-l-2 border-l-white/15',
  glowGradient: 'radial-gradient(circle at 0% 0%, rgba(255, 255, 255, 0.04) 0%, transparent 55%)',
  chipClass: 'text-white/65 bg-white/[0.06] border-white/10',
  avatarRing: 'ring-white/15',
  vibe: '',
}

export function getMindsetStyle(mindsetId: string | null | undefined): MindsetStyle {
  if (!mindsetId) return DEFAULT_STYLE
  return STYLES[mindsetId as MindsetId] || DEFAULT_STYLE
}

/**
 * Mood → subtle background tint (radial gradient applied to the
 * top-right of the card). Independent of mindset so a Stoic feeling
 * anxious and a Hustler feeling anxious both pick up the same cool
 * blue wash. Optional — `null` returns transparent.
 */
const MOOD_TINTS: Record<string, string> = {
  anxious:     'radial-gradient(circle at 100% 0%, rgba(99, 102, 241, 0.10) 0%, transparent 50%)',
  overwhelmed: 'radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.10) 0%, transparent 50%)',
  stuck:       'radial-gradient(circle at 100% 0%, rgba(100, 116, 139, 0.10) 0%, transparent 50%)',
  hopeful:     'radial-gradient(circle at 100% 0%, rgba(251, 191, 36, 0.09) 0%, transparent 50%)',
  grateful:    'radial-gradient(circle at 100% 0%, rgba(52, 211, 153, 0.09) 0%, transparent 50%)',
  lost:        'radial-gradient(circle at 100% 0%, rgba(244, 114, 182, 0.09) 0%, transparent 50%)',
}

export function getMoodTint(mood: string | null | undefined): string {
  if (!mood) return 'transparent'
  return MOOD_TINTS[mood.toLowerCase()] || 'transparent'
}
