import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { adaptPlan, bedtimeReminderMin, focusPromptLine, focusRange, inWindow, isWorkTime, quietWindow, timelinePoints, toMin } from '@/lib/rhythm/plan'

const base = { wake_time: '05:30', work_start_time: '09:00', work_end_time: '17:00', work_days: [1, 2, 3, 4, 5] }

describe('Daily Rhythm rules', () => {
  it('windows wrap past midnight', () => {
    expect(inWindow(toMin('23:00')!, toMin('22:00')!, toMin('07:00')!)).toBe(true)
    expect(inWindow(toMin('06:59')!, toMin('22:00')!, toMin('07:00')!)).toBe(true)
    expect(inWindow(toMin('07:00')!, toMin('22:00')!, toMin('07:00')!)).toBe(false)
  })

  it('quiet hours default to 10 PM – 7 AM, and theirs win', () => {
    expect(quietWindow({})).toEqual({ start: 1320, end: 420 })
    expect(quietWindow({ quiet_start: '23:30', quiet_end: '06:00' })).toEqual({ start: 1410, end: 360 })
  })

  it('work time = their work days, inside their workday only', () => {
    expect(isWorkTime(base, 2, toMin('10:00')!)).toBe(true)
    expect(isWorkTime(base, 6, toMin('10:00')!)).toBe(false)
    expect(isWorkTime(base, 2, toMin('17:00')!)).toBe(false)
  })

  it('bedtime reminder: theirs, else 30 min before bedtime, else the old 8h-before-waking', () => {
    expect(bedtimeReminderMin({ ...base, bedtime_reminder_time: '21:15', bedtime: '22:30' })).toBe(toMin('21:15'))
    expect(bedtimeReminderMin({ ...base, bedtime: '22:30' })).toBe(toMin('22:00'))
    expect(bedtimeReminderMin({ ...base, bedtime: '00:10' })).toBe(toMin('23:40'))
    expect(bedtimeReminderMin(base)).toBe(toMin('21:00'))
  })

  it('a morning focus window sits between waking and work', () => {
    expect(focusRange({ ...base, focus_window: 'morning' })).toEqual({ start: toMin('07:00'), end: toMin('09:00') })
    expect(focusRange({ ...base, focus_window: null })).toBeNull()
    expect(focusPromptLine({ ...base, focus_window: 'morning' })).toMatch(/7:00 AM–9:00 AM/)
    expect(focusPromptLine(base)).toBe('')
  })

  it('"How Voxu will adapt" shows only what is switched on, in day order from waking', () => {
    const plan = adaptPlan({ ...base, focus_window: 'morning', bedtime: '22:30', bedtime_reminder_enabled: true, midday_reminder_enabled: false })
    expect(plan.map(r => r.key)).toEqual(['morning', 'focus', 'winddown', 'bedtime', 'quiet'])
    expect(adaptPlan({ ...base, work_mode: true }).some(r => r.key === 'work')).toBe(true)
    expect(timelinePoints({ ...base, focus_window: 'morning', bedtime: '22:30' }).map(p => p.key)).toEqual(['wake', 'focus', 'work', 'winddown', 'sleep'])
  })

  it('the send gate really reads quiet hours and opt-in work mode', () => {
    const g = readFileSync(join(process.cwd(), 'lib/notification-gate.ts'), 'utf8')
    expect(g).toMatch(/quietWindow\(rhythm/)
    expect(g).toMatch(/lane === 'opportunistic' && rhythm\?\.work_mode/)
  })
})
