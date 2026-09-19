import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { routeForCondition } from '../challenge-routes'
import { getDailyChallenges, UNAVAILABLE_CHALLENGE_TYPES } from '../daily-challenges'
import { getWeeklyMissions, UNAVAILABLE_MISSION_TYPES } from '../weekly-missions'

// Every condition type written in the pools, read from source so a new
// challenge type can't ship without somewhere to send people.
const typesIn = (file: string) =>
  [...new Set([...readFileSync(file, 'utf8').matchAll(/condition: \{ type: '([a-z_]+)'/g)].map(m => m[1]))]

describe('challenge and mission routes', () => {
  it('every doable daily challenge type opens a screen', () => {
    for (const t of typesIn('lib/daily-challenges.ts')) {
      if (UNAVAILABLE_CHALLENGE_TYPES.includes(t)) continue
      expect(routeForCondition(t), t).toBeTruthy()
    }
  })

  it('every doable weekly mission type opens a screen', () => {
    for (const t of typesIn('lib/weekly-missions.ts')) {
      if (UNAVAILABLE_MISSION_TYPES.includes(t)) continue
      expect(routeForCondition(t), t).toBeTruthy()
    }
  })

  it('never hands out a challenge or mission that has no screen (routines)', () => {
    const mindsets = [null, 'stoic', 'existentialist', 'cynic', 'hedonist', 'samurai', 'scholar', 'manifestor', 'hustler'] as const
    for (let d = 0; d < 60; d++) {
      const day = new Date(Date.UTC(2026, 0, 1 + d)).toISOString().slice(0, 10)
      for (const m of mindsets) {
        for (const c of getDailyChallenges(day, m)) expect(UNAVAILABLE_CHALLENGE_TYPES, `${day} ${m} ${c.id}`).not.toContain(c.condition.type)
      }
      for (const mission of getWeeklyMissions(`2026-W${String((d % 52) + 1).padStart(2, '0')}`)) {
        expect(UNAVAILABLE_MISSION_TYPES, mission.id).not.toContain(mission.condition.type)
      }
    }
  })
})
