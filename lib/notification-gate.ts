import { prisma } from '@/lib/prisma'
import type { NotificationType } from './push-service'

/**
 * The single send-gate every push passes through: quiet hours → dedupe →
 * daily budget.
 *
 * Notifications fall into three lanes, because they are not the same kind of
 * thing and must not compete for one allowance:
 *
 *  - `exempt`      time-critical, ignores the budget AND does not spend it.
 *  - `scheduled`   the user set this time themselves in Settings. Always
 *                  delivered (dedupe and quiet hours still apply); does not
 *                  spend the budget either.
 *  - everything else is opportunistic — content WE decided to send — and
 *    shares a small per-day allowance.
 *
 * This split exists because of a real starvation bug. The budget used to be a
 * flat cap of 2 that every type shared, so `streak_at_risk` — which bypassed
 * the cap but still logged a send — burned the allowance 20 days out of 21
 * and left nothing for the reminders the user had actually configured. Over
 * three weeks Midday Reset and Wind Down fired zero times.
 *
 * The window is the user's CALENDAR day, not a rolling 24h. A rolling window
 * let yesterday evening's sends block this morning's reminder, and the
 * deficit ratcheted forward instead of resetting overnight.
 */

// Max opportunistic pushes per local calendar day.
const DAILY_CAP = 2
// Don't send the SAME type twice inside this window. Shorter than 24h so
// genuine daily reminders (~24h apart) are never suppressed.
const DEDUPE_WINDOW_MS = 18 * 60 * 60 * 1000
// Default do-not-disturb window, in the user's LOCAL hours. This matters most
// for content pushes scheduled on a single global cron (e.g. daily_quote at
// 09:00 server time = the middle of the night for users in other timezones).
const QUIET_START = 22 // 10pm
const QUIET_END = 7 //  7am

type Lane = 'exempt' | 'scheduled' | 'opportunistic'

const LANE: Record<NotificationType, Lane> = {
  // Time-critical.
  streak_at_risk: 'exempt',
  win_back: 'exempt',

  // Times the user picked in Settings — never starve these.
  morning_reminder: 'scheduled',
  midday_reset: 'scheduled',
  wind_down: 'scheduled',
  bedtime_reminder: 'scheduled',

  // Ours to ration.
  evening_reminder: 'opportunistic',
  checkpoint: 'opportunistic',
  weekly_review: 'opportunistic',
  coach_checkin: 'opportunistic',
  coach_accountability: 'opportunistic',
  insight: 'opportunistic',
  daily_quote: 'opportunistic',
  daily_affirmation: 'opportunistic',
  motivational_nudge: 'opportunistic',
  daily_motivation: 'opportunistic',
  feature_discovery: 'opportunistic',
  // Nudging someone to answer a question we chose to ask. It stops sending
  // itself once their profile is complete, but while it runs it must queue
  // behind anything they actually scheduled.
  daily_read: 'opportunistic',
  custom: 'opportunistic',
}

// Current hour (0-23) in the user's timezone; falls back to server time.
function hourInZone(timezone: string | null | undefined): number {
  if (!timezone) return new Date().getHours()
  try {
    const s = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: timezone }).format(new Date())
    const h = parseInt(s, 10)
    if (!Number.isFinite(h)) return new Date().getHours()
    return h === 24 ? 0 : h
  } catch {
    return new Date().getHours()
  }
}

// YYYY-MM-DD in the user's timezone. Comparing these strings is what makes
// the budget reset at their local midnight.
function localDay(date: Date, timezone: string | null | undefined): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

const isQuietHour = (h: number) => h >= QUIET_START || h < QUIET_END

export interface GateResult {
  allow: boolean
  reason?: 'quiet_hours' | 'duplicate' | 'daily_cap'
}

export async function shouldSendNotification(userId: string, type: NotificationType): Promise<GateResult> {
  // Manual / broadcast sends are intentional — never throttle them.
  if (type === 'custom') return { allow: true }

  const lane = LANE[type] ?? 'opportunistic'

  let timezone: string | null = null
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { timezone: true },
    })
    timezone = prefs?.timezone ?? null
  } catch {
    // Couldn't resolve timezone — don't block on it.
  }

  // 1. Quiet hours (user-local) — but only for content WE chose to send. A
  //    scheduled reminder is a time the user typed into Settings themselves,
  //    so a default do-not-disturb window has no business overriding it: a
  //    06:30 morning reminder would otherwise be silently dropped forever.
  //    Everything else, time-critical included, still stays out of the night.
  if (lane !== 'scheduled' && isQuietHour(hourInZone(timezone))) {
    return { allow: false, reason: 'quiet_hours' }
  }

  // 2. Dedupe + budget, from the send log. FAILS OPEN on any error, so this
  //    is safe to ship before the table exists.
  try {
    // 48h covers the widest timezone offset either side of a local day.
    const recent = await prisma.notificationSendLog.findMany({
      where: { user_id: userId, sent_at: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) } },
      select: { type: true, sent_at: true },
    })

    const dedupeSince = Date.now() - DEDUPE_WINDOW_MS
    if (recent.some(r => r.type === type && r.sent_at.getTime() >= dedupeSince)) {
      return { allow: false, reason: 'duplicate' }
    }

    // Only opportunistic sends spend the budget, and only opportunistic
    // sends are limited by it.
    if (lane === 'opportunistic') {
      const today = localDay(new Date(), timezone)
      const spentToday = recent.filter(
        r => (LANE[r.type as NotificationType] ?? 'opportunistic') === 'opportunistic'
          && localDay(r.sent_at, timezone) === today
      ).length
      if (spentToday >= DAILY_CAP) {
        return { allow: false, reason: 'daily_cap' }
      }
    }
  } catch {
    return { allow: true } // log unavailable (e.g. pre-migration) — allow
  }

  return { allow: true }
}

/**
 * Record that a push went out so the gate can throttle.
 *
 * Awaited, not fire-and-forget: a serverless function can finish before a
 * detached promise flushes, and a budget built on a log that silently drops
 * rows is not a budget. Never throws.
 */
export async function logNotificationSent(userId: string, type: NotificationType): Promise<void> {
  try {
    await prisma.notificationSendLog.create({ data: { user_id: userId, type } })
  } catch {
    // Logging must never break a send that already succeeded.
  }
}
