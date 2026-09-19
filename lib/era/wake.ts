import type { MindsetId } from '@/lib/mindset/types'
import { eraName } from './presets'

/**
 * The wake-up call: at the time they chose, the coach calls them by name,
 * tells them where they are in their era, and asks for today's promise.
 *
 * Version 1 is a notification plus a spoken message, not an alarm. iOS won't
 * play a freshly generated voice as an alarm without native code, and the
 * iPhone app is a web shell, so the push says "get up" and tapping it plays
 * the coach (app/(dashboard)/era/wake). The copy never claims to be an alarm.
 *
 * Pure and written, not generated: the same inputs give the same script, so
 * reopening the call replays the cached audio instead of paying for it
 * twice (/api/ai/chat-voice caches by text).
 */

/** "06:30" → 390, or null if it isn't a valid HH:MM. */
export function parseWakeTime(value: unknown): number | null {
  if (typeof value !== 'string') return null
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

/** 390 → "06:30", the stored form. */
export function formatWakeTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** 390 → "6:30", how the coach says it. */
export function spokenTime(minutes: number): string {
  const h24 = Math.floor(minutes / 60)
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h}:${String(minutes % 60).padStart(2, '0')}`
}

/** "06:30" → "6:30 AM", for labels. Null for anything that isn't a time. */
export function clockLabel(value: string | null | undefined): string | null {
  const minutes = parseWakeTime(value)
  if (minutes === null) return null
  return `${spokenTime(minutes)} ${minutes < 720 ? 'AM' : 'PM'}`
}

/** Minutes past local midnight in the given timezone (server time if unknown). */
export function localMinutes(timezone: string | null | undefined, now: Date = new Date()): number {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      timeZone: timezone || undefined,
    }).formatToParts(now)
    const h = Number(parts.find(p => p.type === 'hour')?.value) % 24
    const m = Number(parts.find(p => p.type === 'minute')?.value)
    if (Number.isFinite(h) && Number.isFinite(m)) return h * 60 + m
  } catch {
    // Unknown timezone — fall through to server time.
  }
  return now.getHours() * 60 + now.getMinutes()
}

/**
 * How long after the wake time the call may still go out. The cron runs every
 * five minutes and can start late, so this gives it a few chances; the send
 * gate's once-a-day dedupe stops a second call.
 */
export const WAKE_WINDOW_MINUTES = 20

/** Is `now` (minutes past midnight) within the window after `wake`? Wraps midnight. */
export function isInWakeWindow(now: number, wake: number, windowMinutes = WAKE_WINDOW_MINUTES): boolean {
  const since = (now - wake + 1440) % 1440
  return since < windowMinutes
}

/** First name only — a coach doesn't call you by your full legal name. */
export function callName(name: string | null | undefined): string | null {
  const first = name?.trim().split(/\s+/)[0]
  if (!first || first.includes('@')) return null
  return first.slice(0, 30)
}

interface Voice {
  /** The push title, and the first thing the coach says. */
  opener: (name: string | null) => string
  /** The last thing it says. */
  closer: string
}

/**
 * One voice per mindset, true to lib/mindset/configs.ts and the sample
 * replies in lib/mindset/voice-samples.ts.
 */
const VOICES: Record<MindsetId, Voice> = {
  stoic: {
    opener: n => (n ? `Good morning, ${n}.` : 'Good morning.'),
    closer: "The day hasn't happened yet. How you begin it is yours. Get up.",
  },
  existentialist: {
    opener: n => (n ? `${n}. It's time.` : "It's time."),
    closer: 'Nobody else gets to decide what today means. Get up and decide it.',
  },
  cynic: {
    opener: n => (n ? `${n}, get up.` : 'Get up.'),
    closer: "Don't lie there negotiating. You already know you're getting up, so do it now.",
  },
  hedonist: {
    opener: n => (n ? `Morning, ${n}.` : 'Morning.'),
    closer: 'Get up, get the hard part done early, and enjoy the rest of the day.',
  },
  samurai: {
    opener: n => (n ? `${n}. Rise.` : 'Rise.'),
    closer: 'A warrior does not negotiate with the morning. Feet on the floor.',
  },
  scholar: {
    opener: n => (n ? `Good morning, ${n}.` : 'Good morning.'),
    closer: 'Small, early starts compound. Get up and make the first one.',
  },
  manifestor: {
    opener: n => (n ? `Good morning, ${n}.` : 'Good morning.'),
    closer: "Picture who you're becoming. Then get up and act like them.",
  },
  hustler: {
    opener: n => (n ? `${n}, get up.` : 'Get up.'),
    closer: "Don't negotiate with yourself. Phone down, feet on the floor. Go.",
  },
}

export function voiceFor(mindset: string | null | undefined): Voice {
  return VOICES[(mindset ?? '') as MindsetId] ?? VOICES.stoic
}

/** Cut to `max` characters at a word boundary, without a dangling comma. */
function clip(text: string, max: number): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t.replace(/[.!?,;:\s]+$/, '')
  const cut = t.slice(0, max)
  const at = cut.lastIndexOf(' ')
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[.!?,;:\s]+$/, '')}…`
}

export interface WakeCallInput {
  name: string | null
  mindset: string | null
  /** Minutes past midnight: what the coach says the time is. Null leaves it out. */
  wakeMinutes: number | null
  era: {
    title: string
    day: number
    lengthDays: number
    /** Consecutive days with a promise made (EraStats.promiseStreak). */
    streak: number
    /** Yesterday's promise: kept, broken, never answered, or none made. */
    yesterday: 'kept' | 'broken' | 'unanswered' | 'none'
    mission: string | null
    /** Already made today's promise (up early) — the call acknowledges it. */
    todaysPromise: string | null
    change: string
    why: string | null
  }
  /**
   * May the coach quote their day-1 words back today? The same rule as the
   * promise reply (lib/era/coach callbackAllowed): every callback day on
   * premium, days 1 and 7 on free.
   */
  quoteDayOne: boolean
}

export interface WakeCall {
  /** Push title — the opener. */
  title: string
  /** Push body. */
  body: string
  /** Everything the coach says, in order — also what's shown on the page. */
  script: string
}

/** The spoken script stays well under chat-voice's 600-character cap. */
export const WAKE_SCRIPT_MAX = 560

export function buildWakeCall(input: WakeCallInput): WakeCall {
  const voice = voiceFor(input.mindset)
  const { era } = input
  const title = voice.opener(input.name)
  const where = `Day ${era.day} of your ${eraName(era.title)}.`

  const yesterday =
    era.day <= 1 ? null
    // The streak counts days with a promise MADE (lib/era/logic computeStats),
    // not kept — so it's said as that, never as "kept N in a row".
    : era.yesterday === 'kept' ? (era.streak > 1 ? `You kept yesterday's promise. You've made one ${era.streak} days running.` : "You kept yesterday's promise.")
    : era.yesterday === 'broken' ? "Yesterday didn't go the way you promised. That was yesterday. Today is still yours."
    : era.yesterday === 'unanswered' ? "You never told me if you kept yesterday's promise. Tell me when you're up."
    : 'No promise yesterday. Today is a clean start.'

  // Their words quoted whole ("You said: …") rather than spliced into a
  // sentence of ours, where "because Because I'm tired…" would read wrong.
  const why = era.why?.trim()
  const callback = !input.quoteDayOne ? null
    : why ? `On day one you told me why this matters. You said: ${clip(why, 120)}.`
    : era.change.trim() ? `On day one you told me what you wanted to change. You said: ${clip(era.change, 120)}.`
    : null

  const today = era.todaysPromise
    ? `You already promised yourself today: ${clip(era.todaysPromise, 100)}. Go keep it.`
    : era.mission
      ? `Today's mission: ${clip(era.mission, 100)}. What are you promising yourself today?`
      : 'What are you promising yourself today?'

  const time = input.wakeMinutes === null ? null : `It's ${spokenTime(input.wakeMinutes)}.`
  const parts = [title, time, where, yesterday, callback, today, voice.closer]
  let script = parts.filter(Boolean).join(' ')
  // Never over the cap: the day-one quote is the first thing to go, since the
  // rest is what the call is for.
  if (script.length > WAKE_SCRIPT_MAX && callback) {
    script = parts.filter(p => p && p !== callback).join(' ')
  }
  if (script.length > WAKE_SCRIPT_MAX) script = clip(script, WAKE_SCRIPT_MAX)

  return {
    title,
    body: `${where} Tap to hear your coach.`,
    script,
  }
}
