/**
 * How much Voxu nudges — the user's choice (Settings → Notifications).
 *
 * It sets the daily allowance of OPPORTUNISTIC pushes only: content we
 * choose to send (quotes, coach check-ins, comebacks). Reminders they set
 * themselves, and the few time-critical ones, are never counted against it
 * (lib/notification-gate lanes) — that split exists because a shared cap
 * once starved their own reminders for three weeks.
 */
export const NOTIFICATION_MODES = ['quiet', 'coach', 'strict'] as const
export type NotificationMode = (typeof NOTIFICATION_MODES)[number]

export const DEFAULT_MODE: NotificationMode = 'coach'

/** Opportunistic pushes per local day. Coach is the long-standing default. */
export const MODE_CAP: Record<NotificationMode, number> = { quiet: 1, coach: 2, strict: 4 }

export const MODE_COPY: Record<NotificationMode, { title: string; line: string }> = {
  quiet: { title: 'Quiet', line: 'Your own reminders, plus at most one nudge a day.' },
  coach: { title: 'Coach', line: 'Your reminders, plus up to two nudges a day.' },
  strict: { title: 'Strict', line: 'Your reminders, plus up to four — for holding you to it.' },
}

export function parseMode(v: unknown): NotificationMode | null {
  return typeof v === 'string' && (NOTIFICATION_MODES as readonly string[]).includes(v) ? (v as NotificationMode) : null
}

export function capFor(mode: unknown): number {
  return MODE_CAP[parseMode(mode) ?? DEFAULT_MODE]
}
