import { ERA_PRESETS, ERA_PRESETS_BY_KEY } from '@/lib/era/presets'

/**
 * The first launch — Voxu shown, not explained (components/onboarding/
 * FirstLaunch). Pure: everything here works with no model at all, so the
 * opener always finishes even when the AI is down, out of quota, or slow.
 *
 * The model (app/api/onboarding/first-moment) may only:
 *   - say one short reply to what they wrote,
 *   - pick eras FROM THE PRESET LIST (anything else is dropped),
 *   - suggest a first promise and an easier one.
 * validateFirstMoment() enforces that; the fallbacks below fill any gap.
 */

/** Words people actually use about each era. Lowercase stems, matched as substrings. */
const ERA_SIGNALS: Record<string, string[]> = {
  locked_in: ['distract', 'focus', 'procrastinat', 'business', 'work', 'drift', 'phone', 'scroll', 'side project', 'career', 'putting off'],
  discipline: ['disciplin', 'lazy', 'consisten', 'follow through', 'motivation', 'habit', 'stick to', 'give up'],
  comeback: ['start over', 'rebuild', 'back on track', 'hard time', 'hard stretch', 'breakup', 'lost my', 'fell off', 'again'],
  gym_arc: ['gym', 'fit', 'weight', 'body', 'workout', 'run', 'health', 'muscle', 'lose', 'exercise', 'eat'],
  stoic_mode: ['stress', 'calm', 'overthink', 'control', 'angry', 'react', 'worry', 'patient', 'peace'],
  confidence: ['confiden', 'shy', 'speak', 'social', 'insecure', 'people', 'voice', 'awkward', 'myself'],
  study: ['study', 'exam', 'school', 'learn', 'class', 'grade', 'college', 'university', 'read'],
  five_am: ['morning', 'wake', 'early', 'sleep', 'late', 'bed', 'night'],
}

/** When nothing matches, the broadest three. */
const DEFAULT_ERAS = ['locked_in', 'discipline', 'comeback']

/** Up to three preset keys for what they wrote, best match first, always three. */
export function suggestEras(text: string, n = 3): string[] {
  const t = text.toLowerCase()
  const scored = ERA_PRESETS
    .map((p, i) => ({ key: p.key, i, hits: (ERA_SIGNALS[p.key] ?? []).filter(w => t.includes(w)).length }))
    .filter(x => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.i - b.i)
    .map(x => x.key)
  const out = [...new Set([...scored, ...DEFAULT_ERAS])]
  return out.slice(0, n)
}

/** "20 minutes" → 10, never under 5; anything else becomes a five-minute start. */
export function easierPromise(promise: string): string {
  // "20 minutes", "20 min", and "20 focused minutes" — one word may sit between.
  const m = promise.match(/(\d+)((?:\s+[a-z]+)?\s*)(minutes|mins|min)\b/i)
  if (m) {
    const half = Math.max(5, Math.round(Number(m[1]) / 2))
    return promise.replace(m[0], `${half}${m[2]}${m[3]}`)
  }
  return 'I\'ll start it for five minutes. That counts.'
}

/** The era's own example promise, when there's nothing better. */
export function fallbackPromise(eraKey: string): string {
  return ERA_PRESETS_BY_KEY.get(eraKey)?.promiseHint?.replace(/^e\.g\.\s*/i, '').trim() || 'Spend 20 focused minutes on the one thing that matters most today.'
}

export interface FirstMoment {
  reply: string
  eras: string[]
  promise: string
  easier: string
}

const PROMISE_MAX = 90
const REPLY_MAX = 240

/**
 * Whatever the model returned, made safe: only real preset keys, a reply and
 * promises of sane length, and fallbacks for anything missing. Never throws.
 */
export function validateFirstMoment(raw: unknown, text: string): FirstMoment {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')

  const picked = Array.isArray(r.eras) ? r.eras.filter((k): k is string => typeof k === 'string' && ERA_PRESETS_BY_KEY.has(k)) : []
  const eras = [...new Set([...picked, ...suggestEras(text)])].slice(0, 3)

  const reply = str(r.reply, REPLY_MAX) || 'Thank you for telling me. That\'s exactly the kind of thing we can work on together.'
  const promise = str(r.promise, PROMISE_MAX) || fallbackPromise(eras[0])
  const easier = str(r.easier, PROMISE_MAX) || easierPromise(promise)
  return { reply, eras, promise, easier }
}

/**
 * The guided taste — the same words for everyone, so each line is voiced
 * once (chat-voice caches by text) and costs nothing after. `pause` is the
 * silence after the line, in ms.
 */
export const GUIDED_TASTE: { text: string; pause: number }[] = [
  { text: 'Before we start, I want you to do something with me.', pause: 1200 },
  { text: 'Put everything else down for a moment. Breathe in slowly… and out.', pause: 4500 },
  { text: 'Think about the thing you keep putting off. Not everything. Just one thing.', pause: 5000 },
  { text: 'Hold it for one more breath.', pause: 4000 },
  { text: 'Good. That\'s what we\'ll work with.', pause: 1200 },
]
