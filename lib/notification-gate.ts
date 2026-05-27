import { prisma } from '@/lib/prisma'
import type { NotificationType } from './push-service'

// Max NON-high-priority pushes in a rolling 24h window. High-priority types
// (streak-at-risk, future win-back) bypass the cap — they're time-critical.
const DAILY_CAP = 2
const CAP_WINDOW_MS = 24 * 60 * 60 * 1000
// Don't send the SAME type twice inside this window. Shorter than 24h so
// genuine daily reminders (~24h apart) are never suppressed.
const DEDUPE_WINDOW_MS = 18 * 60 * 60 * 1000
// Default do-not-disturb window, in the user's LOCAL hours. This matters most
// for content pushes scheduled on a single global cron (e.g. daily_quote at
// 09:00 server time = the middle of the night for users in other timezones).
const QUIET_START = 22 // 10pm
const QUIET_END = 7 //  7am

type Priority = 'high' | 'normal' | 'low'

const PRIORITY: Record<NotificationType, Priority> = {
  streak_at_risk: 'high',
  morning_reminder: 'normal',
  evening_reminder: 'normal',
  bedtime_reminder: 'normal',
  checkpoint: 'normal',
  weekly_review: 'normal',
  coach_checkin: 'normal',
  coach_accountability: 'normal',
  insight: 'low',
  daily_quote: 'low',
  daily_affirmation: 'low',
  motivational_nudge: 'low',
  daily_motivation: 'low',
  custom: 'normal',
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

const isQuietHour = (h: number) => h >= QUIET_START || h < QUIET_END

export interface GateResult {
  allow: boolean
  reason?: 'quiet_hours' | 'duplicate' | 'daily_cap'
}

// The single send-gate every push passes through: quiet hours → dedupe →
// daily cap (high-priority bypasses the cap). FAILS OPEN — if anything errors
// (e.g. the log table isn't migrated yet), the notification is allowed, so
// this is safe to ship before `npm run db:push`.
export async function shouldSendNotification(userId: string, type: NotificationType): Promise<GateResult> {
  // Manual / broadcast sends are intentional — never throttle them.
  if (type === 'custom') return { allow: true }

  const priority = PRIORITY[type] ?? 'normal'

  // 1. Quiet hours (user-local). Bedtime is meant for the night, so exempt it.
  try {
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { timezone: true },
    })
    if (type !== 'bedtime_reminder' && isQuietHour(hourInZone(prefs?.timezone))) {
      return { allow: false, reason: 'quiet_hours' }
    }
  } catch {
    // Couldn't resolve timezone — don't block on it.
  }

  // 2. Dedupe + daily cap, from the rolling send log. FAIL OPEN on any error.
  try {
    const recent = await prisma.notificationSendLog.findMany({
      where: { user_id: userId, sent_at: { gte: new Date(Date.now() - CAP_WINDOW_MS) } },
      select: { type: true, sent_at: true },
    })

    const dedupeSince = Date.now() - DEDUPE_WINDOW_MS
    if (recent.some(r => r.type === type && r.sent_at.getTime() >= dedupeSince)) {
      return { allow: false, reason: 'duplicate' }
    }

    if (priority !== 'high' && recent.length >= DAILY_CAP) {
      return { allow: false, reason: 'daily_cap' }
    }
  } catch {
    return { allow: true } // log unavailable (e.g. pre-migration) — allow
  }

  return { allow: true }
}

// Fire-and-forget — record that a push went out so the gate can throttle.
// Never throws / never blocks the send path.
export function logNotificationSent(userId: string, type: NotificationType): void {
  prisma.notificationSendLog.create({ data: { user_id: userId, type } }).catch(() => {})
}
