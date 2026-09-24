/**
 * Putting a routine on the phone.
 *
 * The thin, impure half of lib/routines/schedule: the plan is computed there
 * and this hands it to Capacitor. Everything worth getting right — which
 * notifications, when, saying what — is decided in the pure module and tested
 * without a device; this file only does what it is told.
 *
 * Three things it is careful about:
 *
 * It CANCELS THE WHOLE BLOCK first. A routine that went from five days to two
 * has three notifications nobody wants any more, and they would otherwise
 * keep firing for months with no screen anywhere to admit they exist.
 *
 * It schedules in ONE call. Up to 48 round trips through a plugin bridge on
 * the save of a routine is a visible pause on a phone.
 *
 * It never asks for permission on its own. Saving a routine is the one moment
 * where "remind me at 07:00" is the thing the person just asked for, so the
 * caller asks there; anywhere else, an unprompted system dialog is a toll
 * booth. When permission has not been given, this returns false and says so
 * rather than failing silently.
 */

import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { allStepNotificationIds } from './steps'
import type { PlannedNotification } from './schedule'

export type ScheduleResult =
  | { ok: true; scheduled: number }
  | { ok: false; reason: 'web' | 'denied' | 'error' }

/** Granted already? Never prompts — see the note above. */
export async function routinePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const { display } = await LocalNotifications.checkPermissions()
    return display === 'granted'
  } catch {
    return false
  }
}

/** The one place a routine may prompt: straight after a save. */
export async function askRoutinePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    if (await routinePermission()) return true
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  } catch {
    return false
  }
}

/**
 * Replace every routine notification on the device with this plan.
 *
 * An empty plan is a valid one: it cancels everything and schedules nothing,
 * which is exactly what a deleted or disabled routine should do.
 */
export async function applyRoutineSchedule(plan: PlannedNotification[]): Promise<ScheduleResult> {
  if (!Capacitor.isNativePlatform()) return { ok: false, reason: 'web' }

  try {
    // Only the routine's own id block — cancelling everything pending would
    // take the morning reminder with it.
    await LocalNotifications.cancel({
      notifications: allStepNotificationIds().map(id => ({ id })),
    })

    if (plan.length === 0) return { ok: true, scheduled: 0 }

    if (!(await routinePermission())) return { ok: false, reason: 'denied' }

    await LocalNotifications.schedule({
      notifications: plan.map(n => ({
        id: n.id,
        title: n.title,
        body: n.body,
        schedule: {
          on: { hour: n.hour, minute: n.minute, ...(n.weekday ? { weekday: n.weekday } : {}) },
          repeats: true,
          allowWhileIdle: true,
        },
        sound: 'default',
        actionTypeId: 'DAILY_REMINDER',
        extra: { route: n.route, source: 'routine' },
      })),
    })

    return { ok: true, scheduled: plan.length }
  } catch (error) {
    console.error('[Routine] Schedule error:', error)
    return { ok: false, reason: 'error' }
  }
}
