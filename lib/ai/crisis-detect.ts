/**
 * Crisis-content detector for the AI chat.
 *
 * Voxu invites people to say what's on their mind — anxiety, grief,
 * identity, sleep. Some of that is crisis language (suicidal ideation,
 * self-harm), and a companion that answers it with a journalling
 * follow-up question is worse than one that says nothing. Detection
 * here lets the chat:
 *
 *   - Surface real helpline resources inline, above the AI's reply
 *   - Steer the model's system prompt away from probing questions
 *     and toward acknowledgement + signposting
 *
 * Two tiers:
 *   - URGENT  — explicit ideation / harm intent. Prominent resources.
 *   - CONCERN — hopelessness / give-up language. A gentler check-in.
 *
 * Intentionally KEYWORD-based: deterministic, no LLM cost, and no
 * dependence on a model not to miss it. It WILL over-trigger — that's
 * the correct bias. The resources are gentle and never punitive.
 *
 * Originally written for the Community feed (removed 2026-09-02); kept
 * and re-homed here because the duty of care is the same or greater
 * when the AI is the only one listening.
 */

export type CrisisLevel = 'urgent' | 'concern' | null

/**
 * Coarse region buckets — derived from an IANA timezone string so we
 * can surface the right helpline numbers per user. Defaults to US when
 * we don't have a clear match (findahelpline link always shows as a
 * fallback regardless of region).
 */
export type CrisisRegion = 'US' | 'UK' | 'CA' | 'AU' | 'NZ' | 'EU' | 'OTHER'

export function detectRegion(timezone: string | null | undefined): CrisisRegion {
  const tz = (timezone || '').trim()
  if (!tz) return 'US'
  if (tz === 'Europe/London' || tz === 'Europe/Dublin') return 'UK'
  if (tz === 'Australia/Sydney' || tz.startsWith('Australia/')) return 'AU'
  if (tz === 'Pacific/Auckland' || tz.startsWith('Pacific/')) return 'NZ'
  if (tz === 'America/Toronto' || tz === 'America/Vancouver' || tz === 'America/Edmonton' || tz === 'America/Halifax' || tz === 'America/Winnipeg') return 'CA'
  if (tz.startsWith('America/')) return 'US'
  if (tz.startsWith('Europe/')) return 'EU'
  return 'OTHER'
}

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
  // Intent to self-harm without the word "plan". The original set only
  // caught "planning to hurt myself" and the specific acts (cutting,
  // burning), so a plain "I want to hurt myself" fell through. Matched on
  // the intent verb rather than the bare phrase, so "I hurt myself at the
  // gym" doesn't trigger a helpline.
  /\b(want|wanna|wanting|need|going|about) to (hurt|harm) (myself|me)\b/i,
  /\bthinking about (hurting|harming|killing) (myself|me)\b/i,
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

interface Resource { label: string; href: string; phone?: string }

// Per-region helplines. Each region lists the top one or two local
// numbers first, with findahelpline as the universal fallback. Order
// matters — first entry is the most prominent in the inline banner.
const RESOURCES_BY_REGION: Record<CrisisRegion, Resource[]> = {
  US: [
    { label: 'Call or text 988', href: 'tel:988', phone: '988' },
    { label: 'Text HOME to 741741', href: 'sms:741741&body=HOME' },
  ],
  UK: [
    { label: 'Samaritans 116 123', href: 'tel:116123', phone: '116 123' },
    { label: 'Text SHOUT to 85258', href: 'sms:85258&body=SHOUT' },
  ],
  CA: [
    { label: 'Call or text 9-8-8', href: 'tel:988', phone: '988' },
    { label: 'Talk Suicide 1-833-456-4566', href: 'tel:18334564566' },
  ],
  AU: [
    { label: 'Lifeline 13 11 14', href: 'tel:131114', phone: '13 11 14' },
    { label: 'Beyond Blue 1300 22 4636', href: 'tel:1300224636' },
  ],
  NZ: [
    { label: 'Need to Talk? — text 1737', href: 'sms:1737' },
    { label: 'Lifeline NZ 0800 543 354', href: 'tel:0800543354' },
  ],
  EU: [
    { label: 'European emergency: 112', href: 'tel:112', phone: '112' },
    { label: 'Samaritans 116 123 (Europe-wide)', href: 'tel:116123' },
  ],
  OTHER: [],
}

const FALLBACK_RESOURCE: Resource = { label: 'Find a helpline (worldwide)', href: 'https://findahelpline.com' }

/**
 * Inline crisis banner content for a given level + region. Region is
 * optional — defaults to US when not provided. The worldwide
 * findahelpline link always appears as the last resource regardless
 * of region so non-US/UK/AU users have a real path forward.
 */
export function crisisResourceForLevel(level: CrisisLevel, region: CrisisRegion = 'US'): {
  headline: string
  body: string
  resources: Resource[]
} | null {
  if (!level) return null

  const regional = RESOURCES_BY_REGION[region] || []
  // For 'concern' we keep the list shorter (less heavy) — just the
  // top local number + findahelpline. 'urgent' surfaces everything.
  const resources: Resource[] = level === 'urgent'
    ? [...regional, FALLBACK_RESOURCE]
    : [...regional.slice(0, 1), FALLBACK_RESOURCE]

  if (level === 'urgent') {
    return {
      headline: 'You are not alone.',
      body: 'If you are in crisis or thinking about hurting yourself, please reach out. Help is free, confidential, and available right now.',
      resources,
    }
  }
  return {
    headline: 'This sounds heavy.',
    body: "What you're carrying is real. If you want to talk to someone trained to listen, these lines are open.",
    resources,
  }
}
