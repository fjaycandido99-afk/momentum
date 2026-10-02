import { describe, it, expect } from 'vitest'
import { buildPulse, timeLabel, type PulseInput, type PulseEra, type PulsePractice } from '@/lib/pulse/engine'

const H = (h: number, m = 0) => h * 60 + m

const era = (step: PulseEra['loop']['step'], over: Partial<PulseEra> = {}): PulseEra => ({
  loop: { step, line: `line:${step}` },
  today: step === 'promise' || step === 'state' ? null : { text: 'Finish the report', kept: null },
  mission: 'Say no once',
  missionDone: false,
  ...over,
})

const gym: PulsePractice = { id: 'gym', label: 'Gym', state: 'due', todaysMinimum: '30 minutes', weakDay: null }
const read: PulsePractice = { id: 'read', label: 'Read 10 pages', state: 'due', todaysMinimum: '5 pages', weakDay: null }

const input = (over: Partial<PulseInput>): PulseInput => ({
  now: H(10),
  weekday: 3,
  era: era('act'),
  practices: [],
  steps: [],
  ...over,
})

describe('right now', () => {
  it('asks about yesterday before anything else', () => {
    const p = buildPulse(input({ era: era('check_yesterday'), practices: [gym], steps: [{ kind: 'practice', ref: 'gym', label: null, time: '07:00' }] }))
    expect(p.rightNow?.title).toBe('line:check_yesterday')
  })

  it('offers the minimum when a timed discipline is more than an hour late', () => {
    const p = buildPulse(input({ now: H(18, 45), practices: [gym], steps: [{ kind: 'practice', ref: 'gym', label: null, time: '17:30' }] }))
    expect(p.rightNow).toMatchObject({ kind: 'slipping', action: { target: { type: 'practice', id: 'gym' } } })
    expect(p.rightNow?.context).toContain('5:30 PM')
    expect(p.rightNow?.context).toContain('30 minutes')
  })

  it('says due now inside the window', () => {
    const p = buildPulse(input({ now: H(17, 20), practices: [gym], steps: [{ kind: 'practice', ref: 'gym', label: null, time: '17:30' }] }))
    expect(p.rightNow?.kind).toBe('due_now')
  })

  it('warns on their hardest weekday — only with weakDay behind it, and only after 3pm', () => {
    const weak = { ...gym, weakDay: { weekday: 5, missed: 3, of: 4 } }
    expect(buildPulse(input({ now: H(16), weekday: 5, practices: [weak] })).rightNow?.kind).toBe('slipping')
    expect(buildPulse(input({ now: H(10), weekday: 5, practices: [weak] })).rightNow?.kind).toBe('due_today')
    expect(buildPulse(input({ now: H(16), weekday: 4, practices: [weak] })).rightNow?.kind).toBe('due_today')
  })

  it('puts making the promise ahead of an untimed discipline', () => {
    expect(buildPulse(input({ era: era('promise'), practices: [read] })).rightNow?.title).toBe('line:promise')
  })

  it('once promised, something to do beats "go and do it"', () => {
    expect(buildPulse(input({ era: era('act'), practices: [read] })).rightNow).toMatchObject({ kind: 'due_today', title: 'Read 10 pages is due today.' })
  })

  it('does not make a discipline hours away the thing to do now', () => {
    const p = buildPulse(input({ now: H(10), era: era('act'), practices: [gym], steps: [{ kind: 'practice', ref: 'gym', label: null, time: '17:30' }] }))
    expect(p.rightNow?.kind).toBe('era')
    expect(p.rightNow?.quote).toBe('Finish the report')
    expect(p.next).toEqual({ title: 'Gym', time: '17:30' })
  })

  it('ends on the mission, then done', () => {
    expect(buildPulse(input({ era: era('ready') })).rightNow?.kind).toBe('mission')
    expect(buildPulse(input({ era: era('ready', { missionDone: true }) })).rightNow?.kind).toBe('done')
  })

  it('has nothing to say with no era and nothing due', () => {
    expect(buildPulse(input({ era: null })).rightNow).toBeNull()
  })

  it('never guilts: no "missed" or "failed" in anything it says', () => {
    const cases = [
      input({ now: H(19), practices: [gym], steps: [{ kind: 'practice', ref: 'gym', label: null, time: '17:30' }] }),
      input({ now: H(16), weekday: 5, practices: [{ ...gym, weakDay: { weekday: 5, missed: 3, of: 4 } }] }),
    ]
    for (const c of cases) {
      const r = buildPulse(c).rightNow!
      expect(`${r.title} ${r.context}`).not.toMatch(/miss|fail|broke|behind/i)
    }
  })
})

describe('today', () => {
  it('orders timed things by the clock, then the rest', () => {
    const p = buildPulse(input({
      now: H(9),
      practices: [read, gym],
      steps: [
        { kind: 'practice', ref: 'gym', label: null, time: '17:30' },
        { kind: 'reflect', ref: null, label: 'Reflection', time: '21:30' },
      ],
    }))
    expect(p.today.items.map(i => i.title)).toEqual(['Gym', 'Reflection', 'Today’s promise', 'Read 10 pages', 'Today’s mission'])
  })

  it('only ticks what was recorded, and counts only what can be answered', () => {
    const p = buildPulse(input({
      era: era('ready', { today: { text: 'x', kept: true }, missionDone: true }),
      practices: [{ ...read, state: 'minimum' }, gym],
      steps: [{ kind: 'reflect', ref: null, label: 'Reflection', time: '21:30' }],
    }))
    expect(p.today.done).toBe(3) // promise kept, reading (minimum), mission
    expect(p.today.total).toBe(4) // + gym; the routine step is not answerable
  })

  it('never shows a past routine step — it records nothing, so it could only be a claim', () => {
    const p = buildPulse(input({ now: H(12), steps: [{ kind: 'wake', ref: null, label: 'Wake up', time: '07:00' }] }))
    expect(p.today.items.some(i => i.kind === 'step')).toBe(false)
  })

  it('leaves rest days out', () => {
    const p = buildPulse(input({ practices: [{ ...gym, state: 'rest' }] }))
    expect(p.today.items.some(i => i.title === 'Gym')).toBe(false)
  })
})

describe('timeLabel', () => {
  it('reads like a clock', () => {
    expect(timeLabel('17:30')).toBe('5:30 PM')
    expect(timeLabel('00:00')).toBe('12 AM')
    expect(timeLabel('12:05')).toBe('12:05 PM')
  })
})

describe('the guided session on today', () => {
  it('lists the era guide, ticked once a guided session is finished', () => {
    const open = buildPulse(input({ guide: { id: 'focus_meditation', name: 'Focus', done: false } }))
    const item = open.today.items.find(i => i.kind === 'guide')
    expect(item?.title).toBe('Focus · guided')
    expect(item?.status).toBe('open')
    expect(item?.target).toEqual({ type: 'guide', id: 'focus_meditation', name: 'Focus' })
    const done = buildPulse(input({ guide: { id: 'focus_meditation', name: 'Focus', done: true } }))
    expect(done.today.items.find(i => i.kind === 'guide')?.status).toBe('done')
  })

  it('stays off the list without an era, or once the era is complete', () => {
    expect(buildPulse(input({ era: null, guide: { id: 'x', name: 'X', done: false } })).today.items.some(i => i.kind === 'guide')).toBe(false)
    expect(buildPulse(input({ era: era('complete'), guide: { id: 'x', name: 'X', done: false } })).today.items.some(i => i.kind === 'guide')).toBe(false)
  })
})
