/**
 * The reminders the iPhone schedules ITSELF — only for a phone that isn't
 * registered for server push. A registered phone already gets the server's
 * reminders (which respect Quiet/Coach/Strict and the era loop), so local
 * copies there are duplicates and are cleared.
 *
 * Pure. Mirrors exactly the four "Today's audio reminders" in Settings, with
 * their own switches and times — nothing else.
 */

import { bedtimeReminderMin } from '@/lib/rhythm/plan'

/** IDs this plan owns. Sync cancels ONLY these — never other local
 *  notifications (routine steps, practice alerts) on the phone. */
export const LOCAL_REMINDER_IDS = {
  morning: 1,
  midday: 9,
  winddown: 10,
  bedtime: 8,
} as const
/** Retired IDs from the old scheduler, cleared once on the next sync. */
export const RETIRED_LOCAL_IDS = [2, 3, 4, 5, 6, 7] as const

export interface LocalReminderPrefs {
  daily_reminder?: boolean | null
  reminder_time?: string | null
  midday_reminder_enabled?: boolean | null
  midday_reminder_time?: string | null
  winddown_reminder_enabled?: boolean | null
  winddown_reminder_time?: string | null
  bedtime_reminder_enabled?: boolean | null
  bedtime_reminder_time?: string | null
  wake_time?: string | null
  bedtime?: string | null
}

export interface PlannedReminder {
  id: number
  hour: number
  minute: number
  title: string
  body: string
  route: string
}

function hm(t: string | null | undefined, fallback: string): { hour: number; minute: number } {
  const [h, m] = (t || fallback).split(':').map(Number)
  if (!Number.isFinite(h)) return hm(fallback, fallback)
  return { hour: ((h % 24) + 24) % 24, minute: Number.isFinite(m) ? m : 0 }
}

export function planLocalReminders(p: LocalReminderPrefs): PlannedReminder[] {
  const out: PlannedReminder[] = []
  if (p.daily_reminder !== false) {
    out.push({ id: LOCAL_REMINDER_IDS.morning, ...hm(p.reminder_time, '07:00'), title: 'Morning Prime', body: 'Your morning session is ready.', route: '/?session=morning_prime' })
  }
  if (p.midday_reminder_enabled !== false) {
    out.push({ id: LOCAL_REMINDER_IDS.midday, ...hm(p.midday_reminder_time, '13:00'), title: 'Midday Reset', body: 'A few minutes to recharge and refocus.', route: '/?session=midday_reset' })
  }
  if (p.winddown_reminder_enabled !== false) {
    out.push({ id: LOCAL_REMINDER_IDS.winddown, ...hm(p.winddown_reminder_time, '19:00'), title: 'Wind Down', body: 'Close the day out.', route: '/?session=wind_down' })
  }
  if (p.bedtime_reminder_enabled) {
    // Same rule as the server: their reminder time, else 30 min before their
    // bedtime, else 8 hours before waking (lib/rhythm/plan).
    const m = bedtimeReminderMin(p)
    const at = { hour: Math.floor(m / 60), minute: m % 60 }
    out.push({ id: LOCAL_REMINDER_IDS.bedtime, ...at, title: 'Bedtime Story', body: 'Wind down for bed.', route: '/?session=bedtime_story' })
  }
  return out
}
