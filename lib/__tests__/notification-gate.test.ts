import { describe, it, expect, vi, beforeEach } from 'vitest'

// The user this suite reasons about lives in Honolulu (UTC-10, no DST), which
// is where the starvation bug was found: a rolling-24h budget meant evening
// sends in one local day blocked the next morning's reminder.
const TZ = 'Pacific/Honolulu'

let logRows: { type: string; sent_at: Date }[] = []
const findUniquePrefs = vi.fn(async () => ({ timezone: TZ }))
const findManyLog = vi.fn(async () => logRows)
const createLog = vi.fn(async () => ({}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    userPreferences: { findUnique: (...a: unknown[]) => findUniquePrefs(...(a as [])) },
    notificationSendLog: {
      findMany: (...a: unknown[]) => findManyLog(...(a as [])),
      create: (...a: unknown[]) => createLog(...(a as [])),
    },
  },
}))

const { shouldSendNotification } = await import('@/lib/notification-gate')

// A local wall-clock time in Honolulu, as a real Date.
function honolulu(day: string, hour: number): Date {
  return new Date(`${day}T${String(hour).padStart(2, '0')}:00:00-10:00`)
}

beforeEach(() => {
  logRows = []
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('notification gate', () => {
  it('delivers a reminder the user scheduled even when the budget is spent', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(honolulu('2026-09-04', 7))
    logRows = [
      { type: 'motivational_nudge', sent_at: honolulu('2026-09-04', 5) },
      { type: 'coach_checkin', sent_at: honolulu('2026-09-04', 6) },
    ]
    // Budget is full, so opportunistic content is refused...
    expect(await shouldSendNotification('u1', 'daily_quote')).toEqual({
      allow: false,
      reason: 'daily_cap',
    })
    // ...but the 07:00 reminder this user set in Settings still goes.
    expect(await shouldSendNotification('u1', 'morning_reminder')).toEqual({ allow: true })
  })

  it('does not let cap-exempt pushes spend the opportunistic budget', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(honolulu('2026-09-04', 14))
    // This is the shape that caused the outage: streak_at_risk fired daily,
    // bypassed the cap itself, and ate everyone else's allowance.
    logRows = [
      { type: 'streak_at_risk', sent_at: honolulu('2026-09-04', 8) },
      { type: 'win_back', sent_at: honolulu('2026-09-04', 9) },
    ]
    expect(await shouldSendNotification('u1', 'daily_quote')).toEqual({ allow: true })
  })

  it('resets the budget at the local midnight, not 24 rolling hours', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(honolulu('2026-09-04', 7))
    // Yesterday afternoon and evening — both inside a rolling 24h window,
    // both irrelevant to today's allowance.
    logRows = [
      { type: 'coach_checkin', sent_at: honolulu('2026-09-03', 15) },
      { type: 'motivational_nudge', sent_at: honolulu('2026-09-03', 20) },
    ]
    expect(await shouldSendNotification('u1', 'daily_quote')).toEqual({ allow: true })
  })

  it('still caps opportunistic content within one local day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(honolulu('2026-09-04', 16))
    logRows = [
      { type: 'coach_checkin', sent_at: honolulu('2026-09-04', 9) },
      { type: 'daily_motivation', sent_at: honolulu('2026-09-04', 12) },
    ]
    expect(await shouldSendNotification('u1', 'motivational_nudge')).toEqual({
      allow: false,
      reason: 'daily_cap',
    })
  })

  it('honours a scheduled time that falls inside default quiet hours', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(honolulu('2026-09-04', 6)) // before QUIET_END (7am)
    // The user typed 06:00 into Settings; a default DND window must not
    // silently discard it.
    expect(await shouldSendNotification('u1', 'morning_reminder')).toEqual({ allow: true })
    // Content we chose to send still waits for morning.
    expect(await shouldSendNotification('u1', 'daily_quote')).toEqual({
      allow: false,
      reason: 'quiet_hours',
    })
  })

  it('refuses the same type twice in a day', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(honolulu('2026-09-04', 13))
    logRows = [{ type: 'midday_reset', sent_at: honolulu('2026-09-04', 12) }]
    expect(await shouldSendNotification('u1', 'midday_reset')).toEqual({
      allow: false,
      reason: 'duplicate',
    })
  })
})
