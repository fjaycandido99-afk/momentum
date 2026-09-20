import { prisma } from '@/lib/prisma'
import { loadEraToday, patternLineFor, type EraTodayWire } from './service'
import { callbackAllowed } from './coach'
import { buildWakeCall, callName, parseWakeTime, type WakeCall } from './wake'

/**
 * Loads a user's wake-up call: the settings, and today's call built from
 * their era. One loader for the cron (the push) and the page (the voice),
 * so what the notification says and what the coach says always match.
 */

/** Today's weekday (0 = Sunday) in the user's own timezone. */
function weekdayInZone(timezone: string | null): number {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  try {
    const name = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: timezone || 'UTC' }).format(new Date())
    return Math.max(0, days.indexOf(name))
  } catch {
    return new Date().getUTCDay()
  }
}

export interface WakeSettings {
  enabled: boolean
  /** "06:30", or null if they never picked one. */
  time: string | null
}

export interface WakeCallState {
  settings: WakeSettings
  era: EraTodayWire | null
  call: WakeCall | null
  /**
   * Should the call go out today? Only while today's promise is still to
   * make: not for a finished era, and not for someone already up and
   * promised — waking them would be noise.
   */
  ring: boolean
}

export async function loadWakeCall(userId: string): Promise<WakeCallState> {
  const [prefs, user, era] = await Promise.all([
    prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { wake_call_enabled: true, wake_call_time: true, timezone: true, mindset: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    loadEraToday(userId),
  ])

  const settings: WakeSettings = {
    enabled: prefs?.wake_call_enabled ?? false,
    time: parseWakeTime(prefs?.wake_call_time) === null ? null : prefs!.wake_call_time!,
  }
  if (!era) return { settings, era: null, call: null, ring: false }

  const yesterday: 'kept' | 'broken' | 'unanswered' | null = !era.yesterday ? null
    : era.yesterday.kept === null ? 'unanswered'
    : era.yesterday.kept ? 'kept' : 'broken'

  const call = buildWakeCall({
    name: callName(user?.name),
    mindset: prefs?.mindset ?? null,
    // No time chosen yet (a preview): leave the time out rather than say the
    // current one, which would change the text every minute and miss the
    // voice cache on every replay.
    wakeMinutes: parseWakeTime(settings.time),
    era: {
      title: era.title,
      day: era.day,
      lengthDays: era.lengthDays,
      streak: era.stats.promiseStreak,
      yesterday: yesterday ?? 'none',
      mission: era.mission,
      todaysPromise: era.today?.text ?? null,
      change: era.change,
      why: era.why,
    },
    quoteDayOne: callbackAllowed(era.day, era.lengthDays, yesterday, era.isPremium),
    // On a day they usually slip, the call says so and shrinks the ask —
    // that's the whole point of knowing the pattern before the day starts.
    patternLine: await patternLineFor(userId, weekdayInZone(prefs?.timezone ?? null)),
  })

  return {
    settings,
    era,
    call,
    ring: era.step === 'promise' || era.step === 'check_yesterday',
  }
}
