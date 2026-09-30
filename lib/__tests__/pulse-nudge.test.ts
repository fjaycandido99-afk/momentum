import { describe, it, expect } from 'vitest'
import { pickNudge, nudgeKey } from '@/lib/pulse/nudge'
import { pickMoment } from '@/lib/home/moment'
import type { Pulse, RightNow } from '@/lib/pulse/engine'

const rn = (kind: RightNow['kind'], id = 'gym'): RightNow => ({
  kind,
  eyebrow: 'x',
  title: 't',
  quote: null,
  context: null,
  action: kind === 'era' || kind === 'done' ? null : { label: 'Open', target: { type: 'practice', id } },
})
const pulse = (r: RightNow | null): Pulse => ({ rightNow: r, today: { items: [], done: 0, total: 0 }, next: null })
const never = () => false

describe('pickNudge', () => {
  it('interrupts only for a discipline slipping or due now', () => {
    expect(pickNudge(pulse(rn('slipping')), never)?.primary).toBe('Do the minimum')
    expect(pickNudge(pulse(rn('due_now')), never)?.primary).toBe('Start now')
    for (const k of ['era', 'due_today', 'mission', 'done'] as const) {
      expect(pickNudge(pulse(rn(k)), never)).toBeNull()
    }
  })

  it('never interrupts the same way twice in a day', () => {
    const spent = new Set([nudgeKey(rn('due_now'))!])
    expect(pickNudge(pulse(rn('due_now')), k => spent.has(k))).toBeNull()
    // …but slipping later that day is a different moment.
    expect(pickNudge(pulse(rn('slipping')), k => spent.has(k))).not.toBeNull()
  })

  it('has nothing to say without a Pulse', () => {
    expect(pickNudge(null, never)).toBeNull()
  })
})

describe('the one moment per open', () => {
  it('gives the slot to the nudge when there is one', () => {
    expect(pickMoment({ loopStep: 'promise', hasJournalToday: false, lastKind: null, pulseNudge: true })).toBe('pulse')
  })

  it('behaves exactly as before without one', () => {
    expect(pickMoment({ loopStep: 'promise', hasJournalToday: false, lastKind: null })).toBe('era')
    expect(pickMoment({ loopStep: 'act', hasJournalToday: false, lastKind: null })).toBe('journal')
  })
})
