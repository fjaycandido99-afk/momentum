/**
 * Crisis-content detector for community posts + comments.
 *
 * Mental-health social products carry a real duty of care. Voxu users
 * journal about anxiety, depression, sleep, identity — content that
 * sometimes contains crisis language (suicidal ideation, self-harm).
 * Auto-detection here lets us:
 *
 *   - Show crisis resources inline on the post/comment
 *   - Auto-file a SocialReport with reason="auto_crisis" for a human to review
 *   - Block follow-on comments on "urgent"-level posts until reviewed
 *
 * Two tiers:
 *   - URGENT — explicit ideation / harm intent. Surfaces crisis resources
 *     prominently, files a high-priority report.
 *   - CONCERN — hopelessness / give-up language. Surfaces a gentler check-in
 *     resource, files a normal-priority report.
 *
 * This is intentionally KEYWORD-based for v1 (deterministic, no LLM cost,
 * no false-negative dependency on a model). It WILL have false positives —
 * fine, the resources are gentle and never punitive. Better to over-trigger
 * than under-trigger here.
 *
 * Resources by region come from `lib/social/crisis-resources.ts`. The
 * default set is US/UK + the international finder.
 */

export type CrisisLevel = 'urgent' | 'concern' | null

// Phrases that strongly indicate suicidal ideation or active self-harm.
// Match as whole-word case-insensitive substrings.
const URGENT_PATTERNS: RegExp[] = [
  /\bkill (myself|me)\b/i,
  /\bend (my|this) life\b/i,
  /\bdon'?t want to (live|exist|be here)\b/i,
  /\bwant to die\b/i,
  /\bbetter off dead\b/i,
  /\bno reason to live\b/i,
  /\b(suicide|suicidal)\b/i,
  /\b(cut|cutting|burning) myself\b/i,
  /\b(self.?harm|self.?harming|self.?injur)\w*/i,
  /\boverdose\b/i,
  /\b(plan(ning)?) to (kill|end|hurt) (myself|me)\b/i,
  /\btake (my|this) life\b/i,
]

// Lower-tier language: hopelessness, giving up, exhaustion. These don't
// always indicate crisis but warrant a soft check-in.
const CONCERN_PATTERNS: RegExp[] = [
  /\bcan'?t (go on|do this anymore|take (it|this) anymore)\b/i,
  /\bgiving up\b/i,
  /\bno (point|hope|future)\b/i,
  /\bworthless\b/i,
  /\bhopeless\b/i,
  /\bnothing matters\b/i,
  /\beveryone would be better\b/i,
  /\bdone with (life|everything)\b/i,
]

export function detectCrisisLevel(text: string): CrisisLevel {
  if (!text) return null
  const sample = text.slice(0, 8000) // cap so regex doesn't pathologically scan
  for (const re of URGENT_PATTERNS) {
    if (re.test(sample)) return 'urgent'
  }
  for (const re of CONCERN_PATTERNS) {
    if (re.test(sample)) return 'concern'
  }
  return null
}

/**
 * What to show inline to the AUTHOR + viewers when a crisis level is
 * detected. Returns null when no crisis, an object with copy + resources
 * otherwise. Resources are localized to US/UK/international fallback for
 * v1 — region-aware extension is a separate layer.
 */
export function crisisResourceForLevel(level: CrisisLevel): {
  headline: string
  body: string
  resources: Array<{ label: string; href: string; phone?: string }>
} | null {
  if (level === 'urgent') {
    return {
      headline: 'You are not alone.',
      body: 'If you are in crisis or thinking about hurting yourself, please reach out. Help is free, confidential, and available right now.',
      resources: [
        { label: 'Call or text 988 (US)', href: 'tel:988', phone: '988' },
        { label: 'Text HOME to 741741 (US)', href: 'sms:741741&body=HOME' },
        { label: 'Samaritans 116 123 (UK)', href: 'tel:116123', phone: '116 123' },
        { label: 'Find a helpline (worldwide)', href: 'https://findahelpline.com' },
      ],
    }
  }
  if (level === 'concern') {
    return {
      headline: 'This sounds heavy.',
      body: "What you're carrying is real. If you want to talk to someone trained to listen, these lines are open.",
      resources: [
        { label: 'Call or text 988 (US)', href: 'tel:988', phone: '988' },
        { label: 'Samaritans 116 123 (UK)', href: 'tel:116123', phone: '116 123' },
        { label: 'Find a helpline (worldwide)', href: 'https://findahelpline.com' },
      ],
    }
  }
  return null
}
