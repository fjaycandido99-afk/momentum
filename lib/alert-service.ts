import { prisma } from './prisma'
import type { NotificationType } from './push-service'

/**
 * Check if the current time falls within a quiet window (do-not-disturb).
 * Handles overnight spans like 22:00–07:00.
 */
export function isInQuietWindow(
  currentHHMM: string,
  quietStart: string | null,
  quietEnd: string | null
): boolean {
  if (!quietStart || !quietEnd) return false

  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
  }

  const now = toMinutes(currentHHMM)
  const start = toMinutes(quietStart)
  const end = toMinutes(quietEnd)

  // Overnight span (e.g. 22:00–07:00)
  if (start > end) {
    return now >= start || now < end
  }

  // Same-day span (e.g. 13:00–15:00)
  return now >= start && now < end
}

/**
 * Map an alert_type ID to the legacy NotificationType used by sendPushToUser().
 * Falls back to 'custom' for unknown types.
 */
const ALERT_TO_NOTIFICATION_MAP: Record<string, NotificationType> = {
  morning_reminder: 'morning_reminder',
  checkpoint: 'checkpoint',
  evening_reminder: 'evening_reminder',
  bedtime_reminder: 'bedtime_reminder',
  streak_at_risk: 'streak_at_risk',
  weekly_review: 'weekly_review',
  insight: 'insight',
  daily_quote: 'daily_quote',
  daily_affirmation: 'daily_affirmation',
  motivational_nudge: 'motivational_nudge',
  daily_motivation: 'daily_motivation',
  featured_music: 'featured_music',
  coach_checkin: 'coach_checkin',
  coach_accountability: 'coach_accountability',
}

export function mapAlertTypeToNotificationType(alertTypeId: string): NotificationType {
  return ALERT_TO_NOTIFICATION_MAP[alertTypeId] || 'custom'
}

/**
 * Calculate the next run date for a recurring alert.
 */
export function calculateNextRun(
  recurrence: string | null,
  recurrenceRule: string | null,
  fromDate: Date
): Date | null {
  if (!recurrence) return null

  const next = new Date(fromDate)

  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1)
      return next

    case 'weekly':
      next.setDate(next.getDate() + 7)
      return next

    case 'custom':
      if (!recurrenceRule) return null
      // Parse simple cron-like rules: support "every_N_hours" and "every_N_days"
      const hoursMatch = recurrenceRule.match(/^every_(\d+)_hours?$/)
      if (hoursMatch) {
        next.setHours(next.getHours() + parseInt(hoursMatch[1]))
        return next
      }
      const daysMatch = recurrenceRule.match(/^every_(\d+)_days?$/)
      if (daysMatch) {
        next.setDate(next.getDate() + parseInt(daysMatch[1]))
        return next
      }
      // Unsupported rule — no recurrence
      return null

    default:
      return null
  }
}

/**
 * Check if a user is within the cooldown window for an alert type.
 * Returns true if still in cooldown (should NOT send).
 */
export async function checkCooldown(
  userId: string,
  alertTypeId: string,
  cooldownMinutes: number
): Promise<boolean> {
  if (cooldownMinutes <= 0) return false

  const cutoff = new Date(Date.now() - cooldownMinutes * 60 * 1000)

  const recent = await prisma.alertHistory.findFirst({
    where: {
      user_id: userId,
      alert_type_id: alertTypeId,
      status: 'sent',
      sent_at: { gte: cutoff },
    },
    select: { id: true },
  })

  return !!recent
}

/**
 * Get the effective settings for a user + alert type.
 * Merges user preferences with alert type defaults.
 */
export async function getEffectiveSettings(userId: string, alertTypeId: string) {
  const [alertType, userPref] = await Promise.all([
    prisma.alertType.findUnique({ where: { id: alertTypeId } }),
    prisma.userAlertPreference.findUnique({
      where: { user_id_alert_type_id: { user_id: userId, alert_type_id: alertTypeId } },
    }),
  ])

  if (!alertType) return null

  return {
    alertType,
    enabled: userPref?.enabled ?? true,
    priority: userPref?.priority ?? alertType.default_priority,
    channel: userPref?.channel ?? alertType.default_channel,
    quietStart: userPref?.quiet_start ?? null,
    quietEnd: userPref?.quiet_end ?? null,
    cooldownMinutes: alertType.cooldown_minutes,
    premiumOnly: alertType.premium_only,
    isDefault: !userPref,
  }
}

/**
 * Get current time as HH:MM string.
 */
export function getCurrentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}
