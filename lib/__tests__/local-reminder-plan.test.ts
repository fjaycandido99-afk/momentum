import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { planLocalReminders, LOCAL_REMINDER_IDS } from '@/lib/notifications/local-plan'

describe("the phone's own reminders mirror Settings", () => {
  it('uses each reminder’s own switch and time', () => {
    const plan = planLocalReminders({
      daily_reminder: true, reminder_time: '06:45',
      midday_reminder_enabled: false, midday_reminder_time: '12:00',
      winddown_reminder_enabled: true, winddown_reminder_time: '20:15',
      bedtime_reminder_enabled: true, bedtime_reminder_time: '22:30',
    })
    expect(plan.map(p => [p.id, p.hour, p.minute])).toEqual([
      [LOCAL_REMINDER_IDS.morning, 6, 45],
      [LOCAL_REMINDER_IDS.winddown, 20, 15],
      [LOCAL_REMINDER_IDS.bedtime, 22, 30],
    ])
  })

  it('bedtime with no time = 8 hours before waking, like the server', () => {
    const plan = planLocalReminders({ daily_reminder: false, midday_reminder_enabled: false, winddown_reminder_enabled: false, bedtime_reminder_enabled: true, wake_time: '05:30' })
    expect(plan).toHaveLength(1)
    expect([plan[0].hour, plan[0].minute]).toEqual([21, 0])
  })

  it('bedtime stays off unless switched on', () => {
    expect(planLocalReminders({}).some(p => p.id === LOCAL_REMINDER_IDS.bedtime)).toBe(false)
  })

  it('sync never wipes every local notification (routine steps live there too)', () => {
    const src = readFileSync(join(process.cwd(), 'lib/notifications.ts'), 'utf8')
    const sync = src.slice(src.indexOf('export async function syncLocalReminders'), src.indexOf('export async function syncLocalReminders') + 1200)
    expect(sync).not.toMatch(/cancelAllReminders|getPending\(\)/)
  })

  it('the four audio reminders follow only their own switches on the server', () => {
    const src = readFileSync(join(process.cwd(), 'lib/push-service.ts'), 'utf8')
    for (const t of ['morning_reminder', 'midday_reset', 'wind_down', 'bedtime_reminder']) {
      expect(src).toMatch(new RegExp(`OWN_SWITCH_TYPES[^\n]*'${t}'`))
    }
  })
})
