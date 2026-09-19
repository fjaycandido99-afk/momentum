import { describe, expect, it } from 'vitest'
import {
  buildWakeCall,
  callName,
  formatWakeTime,
  isInWakeWindow,
  localMinutes,
  parseWakeTime,
  spokenTime,
  WAKE_SCRIPT_MAX,
  type WakeCallInput,
} from '../era/wake'

const base: WakeCallInput = {
  name: 'Francis',
  mindset: 'hustler',
  wakeMinutes: 6 * 60 + 30,
  era: {
    title: 'Locked In',
    day: 12,
    lengthDays: 30,
    streak: 11,
    yesterday: 'kept',
    mission: 'Do the hardest task before you open any app',
    todaysPromise: null,
    change: 'Stop drifting through my days',
    why: 'I want my kids to see me follow through',
  },
  quoteDayOne: false,
}

describe('wake times', () => {
  it('parses and formats HH:MM', () => {
    expect(parseWakeTime('06:30')).toBe(390)
    expect(parseWakeTime('6:05')).toBe(365)
    expect(parseWakeTime('23:59')).toBe(1439)
    expect(parseWakeTime('24:00')).toBeNull()
    expect(parseWakeTime('6:60')).toBeNull()
    expect(parseWakeTime('six')).toBeNull()
    expect(parseWakeTime(390)).toBeNull()
    expect(formatWakeTime(390)).toBe('06:30')
    expect(spokenTime(390)).toBe('6:30')
    expect(spokenTime(0)).toBe('12:00')
    expect(spokenTime(13 * 60 + 5)).toBe('1:05')
  })

  it('rings inside the window after the wake time, across midnight too', () => {
    expect(isInWakeWindow(390, 390)).toBe(true)
    expect(isInWakeWindow(405, 390)).toBe(true)
    expect(isInWakeWindow(410, 390)).toBe(false) // 20 minutes late — missed
    expect(isInWakeWindow(385, 390)).toBe(false) // never early
    expect(isInWakeWindow(5, 1435)).toBe(true) // 23:55 call, cron at 00:05
  })

  it('reads the clock in the user timezone', () => {
    const noonUtc = new Date('2026-09-19T12:00:00Z')
    expect(localMinutes('UTC', noonUtc)).toBe(720)
    expect(localMinutes('America/New_York', noonUtc)).toBe(8 * 60)
    expect(localMinutes('Pacific/Honolulu', noonUtc)).toBe(2 * 60)
  })

  it('calls people by first name, never an email', () => {
    expect(callName('Francis Candido')).toBe('Francis')
    expect(callName('  ')).toBeNull()
    expect(callName(null)).toBeNull()
    expect(callName('me@example.com')).toBeNull()
  })
})

describe('buildWakeCall', () => {
  it('opens in the mindset voice, says where they are, and asks for the promise', () => {
    const call = buildWakeCall(base)
    expect(call.title).toBe('Francis, get up.')
    expect(call.body).toBe('Day 12 of your Locked In era. Tap to hear your coach.')
    expect(call.script).toContain("It's 6:30.")
    expect(call.script).toContain("You kept yesterday's promise. You've made one 11 days running.")
    expect(call.script).not.toMatch(/kept.*in a row/)
    expect(call.script).toContain("Today's mission: Do the hardest task before you open any app.")
    expect(call.script).toContain('What are you promising yourself today?')
    expect(call.script.endsWith('Go.')).toBe(true)
  })

  it('quotes day one only when allowed, in their own words', () => {
    expect(buildWakeCall(base).script).not.toContain('day one')
    const quoted = buildWakeCall({ ...base, quoteDayOne: true }).script
    expect(quoted).toContain('On day one you told me why this matters. You said: I want my kids to see me follow through.')
    const noWhy = buildWakeCall({ ...base, quoteDayOne: true, era: { ...base.era, why: null } }).script
    expect(noWhy).toContain('what you wanted to change. You said: Stop drifting through my days.')
  })

  it('is honest about yesterday', () => {
    const say = (yesterday: WakeCallInput['era']['yesterday']) => buildWakeCall({ ...base, era: { ...base.era, yesterday } }).script
    expect(say('broken')).toContain("Yesterday didn't go the way you promised.")
    expect(say('unanswered')).toContain("You never told me if you kept yesterday's promise.")
    expect(say('none')).toContain('No promise yesterday.')
    expect(buildWakeCall({ ...base, era: { ...base.era, day: 1, yesterday: 'none' } }).script).not.toContain('yesterday')
  })

  it("acknowledges a promise already made instead of asking again", () => {
    const script = buildWakeCall({ ...base, era: { ...base.era, todaysPromise: 'Gym before work' } }).script
    expect(script).toContain('You already promised yourself today: Gym before work. Go keep it.')
    expect(script).not.toContain('What are you promising')
  })

  it('works without a name, and for unknown mindsets', () => {
    const call = buildWakeCall({ ...base, name: null, mindset: 'nonsense' })
    expect(call.title).toBe('Good morning.')
    expect(call.script.startsWith('Good morning. It')).toBe(true)
  })

  it('never says "Era era" and stays under the voice cap with long input', () => {
    const long = 'word '.repeat(200)
    const call = buildWakeCall({
      ...base,
      quoteDayOne: true,
      era: { ...base.era, title: 'Study Era', why: long, change: long, mission: long },
    })
    expect(call.body).toContain('Day 12 of your Study Era.')
    expect(call.script).not.toMatch(/era era/i)
    expect(call.script.length).toBeLessThanOrEqual(WAKE_SCRIPT_MAX)
  })

  it('is deterministic, so a replay hits the voice cache', () => {
    expect(buildWakeCall(base).script).toBe(buildWakeCall(base).script)
  })

  it('leaves the time out when none is set, instead of saying the current one', () => {
    const script = buildWakeCall({ ...base, wakeMinutes: null }).script
    expect(script).not.toContain("It's")
    expect(script.startsWith('Francis, get up. Day 12')).toBe(true)
  })
})
