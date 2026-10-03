import { describe, it, expect } from 'vitest'
import { eraScript, lawsScript, lessonScript, psychologyScript, FIRST_VISIT_ASK } from '@/lib/voice-guide/scripts'
import { LESSONS } from '@/lib/psychology/lessons'
import { VOXU_MAX_CHARS } from '@/lib/voice/voxu-audio'

const all = [
  ...eraScript({ title: 'Locked In', day: 13, lengthDays: 30, kept: 3, answered: 3, hasMission: true }),
  ...eraScript({ title: 'Locked In', day: 1, lengthDays: 30, kept: 0, answered: 0, hasMission: false }),
  ...lawsScript({ laws: 2, needed: 0, hasCharts: true, active: { title: 'Morning promise', day: 4 } }),
  ...lawsScript({ laws: 0, needed: 7, hasCharts: false, active: null }),
  ...lawsScript({ laws: 0, needed: 0, hasCharts: true, active: null }),
  ...psychologyScript({ forYou: 2 }),
  ...LESSONS.flatMap(lessonScript),
]

describe('voice guide scripts', () => {
  it('says the screen’s own numbers, exactly', () => {
    const era = eraScript({ title: 'Locked In', day: 13, lengthDays: 30, kept: 3, answered: 3, hasMission: true })
    expect(era[0].text).toBe('This is your era, Locked In. You\'re on day 13 of 30.')
    expect(era[1].text).toBe('So far you\'ve kept 3 of the 3 promises you\'ve checked in on.')
    expect(lawsScript({ laws: 0, needed: 7, hasCharts: false, active: null })[1].text).toMatch(/7 more answered promises/)
    expect(lawsScript({ laws: 1, needed: 0, hasCharts: false, active: null })[1].text).toMatch(/You have 1 law\./)
  })

  it('fits every line in one voice request', () => {
    for (const l of all) expect(l.text.length, l.text.slice(0, 40)).toBeLessThanOrEqual(VOXU_MAX_CHARS - 10)
  })

  // Voxu's own sentences about the person. Lesson text is quoted as written
  // and has its own content rules (psychology-lessons.test).
  it('never claims a cause, a guarantee, or a label about them', () => {
    for (const l of all.filter(x => !x.spot?.startsWith('lesson-'))) expect(l.text).not.toMatch(/\b(causes?|proven|guarantee\w*|always|you are a)\b/i)
  })

  it('only mentions the mission when there is one', () => {
    expect(eraScript({ title: 'X', day: 2, lengthDays: 30, kept: 0, answered: 0, hasMission: false }).some(l => l.spot === 'era-mission')).toBe(false)
  })

  it('asks before every first visit', () => {
    for (const ask of Object.values(FIRST_VISIT_ASK)) expect(ask).toMatch(/\?$/)
  })
})

describe('proof and profile scripts', () => {
  it('say the screen’s own numbers and claim nothing', async () => {
    const { proofScript, profileScript } = await import('@/lib/voice-guide/scripts')
    const proof = proofScript({ year: 2026, proofs: 6, promisesKept: 3, practicesKept: 2, sessions: 1, eraRecords: 0 })
    expect(proof[0].text).toBe('This is your proof: 6 days in 2026 where you did what you said you would.')
    expect(proof.some(l => l.text.includes('3 promises kept, 2 practices kept, and 1 session done'))).toBe(true)
    expect(proof.some(l => l.spot === 'proof-eras')).toBe(false)
    const profile = profileScript({ featured: 'XP Legend', recent: 3, earned: 12, total: 94 })
    expect(profile[0].text).toMatch(/XP Legend/)
    expect(profile.some(l => l.text === 'You\'ve earned 12 of 94 relics so far, by category.')).toBe(true)
    for (const l of [...proof, ...profile]) expect(l.text).not.toMatch(/\b(causes?|proven|guarantee\w*|always|you are a)\b/i)
  })
})
