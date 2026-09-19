import { describe, it, expect } from 'vitest'
import { eraSlug, eraKeyFromSlug, joinUrl, shareText } from '../era/share'
import { ERA_PRESETS } from '../era/presets'

describe('era share links', () => {
  it('round-trips every preset through its URL slug', () => {
    for (const p of ERA_PRESETS) expect(eraKeyFromSlug(eraSlug(p.key)), p.key).toBe(p.key)
    expect(eraSlug('locked_in')).toBe('locked-in')
    expect(eraKeyFromSlug('Locked-In')).toBe('locked_in')
  })

  it('only presets are joinable — a custom era never gets a join page', () => {
    expect(eraKeyFromSlug('custom')).toBeNull()
    expect(eraKeyFromSlug('dad-mode')).toBeNull()
    expect(joinUrl('custom', 'era123')).toBe('https://voxu.app/era')
  })

  it('carries the sharer’s era id, and nothing else about them', () => {
    expect(joinUrl('gym_arc', 'clx9abc')).toBe('https://voxu.app/join/gym-arc?from=clx9abc')
    expect(joinUrl('gym_arc')).toBe('https://voxu.app/join/gym-arc')
  })

  it('invites to join a preset, and to start your own for a custom era', () => {
    expect(shareText({ key: 'locked_in', title: 'Locked In', day: 14, lengthDays: 30 })).toBe('Day 14 of my Locked In era. One promise a day for 30 days. Join me:')
    expect(shareText({ key: 'custom', title: 'Dad Mode', day: 3, lengthDays: 30 })).toMatch(/Start yours:$/)
    expect(shareText({ key: 'study', title: 'Study Era', day: 30, lengthDays: 30, complete: true })).toMatch(/^I finished my Study Era —/)
  })

  it('never says "Era era"', () => {
    for (const p of ERA_PRESETS) expect(shareText({ key: p.key, title: p.title, day: 3, lengthDays: 30 }), p.key).not.toMatch(/era era/i)
  })
})
