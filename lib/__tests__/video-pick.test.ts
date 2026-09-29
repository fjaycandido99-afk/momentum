import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { dailyPick, mergePool, POOL_MAX } from '@/lib/video-pick'

const v = (n: number) => ({ id: `v${n}`, youtubeId: `yt${n}`, title: `Video ${n}`, channel: 'c' })
const pool = Array.from({ length: 30 }, (_, i) => v(i))

describe('dailyPick', () => {
  it('is the same all day for a topic', () => {
    expect(dailyPick(pool, 'Discipline', 8, 20260929)).toEqual(dailyPick(pool, 'Discipline', 8, 20260929))
  })

  it('changes from one day to the next', () => {
    // The whole bug: the same 8 videos every day.
    const today = dailyPick(pool, 'Discipline', 8, 20260929).map((x) => x.id)
    const tomorrow = dailyPick(pool, 'Discipline', 8, 20260930).map((x) => x.id)
    expect(tomorrow).not.toEqual(today)
  })

  it('gives each topic its own order on the same day', () => {
    const a = dailyPick(pool, 'Discipline', 8, 20260929).map((x) => x.id)
    const b = dailyPick(pool, 'Focus', 8, 20260929).map((x) => x.id)
    expect(a).not.toEqual(b)
  })

  it('still reorders a pool no bigger than what is shown', () => {
    // A stale 8-item list should not open on the same video every day.
    const small = pool.slice(0, 8)
    const days = [20260929, 20260930, 20261001, 20261002].map((d) => dailyPick(small, 'Focus', 8, d)[0].id)
    expect(new Set(days).size).toBeGreaterThan(1)
  })

  it('never invents or duplicates videos', () => {
    const picked = dailyPick(pool, 'Mindset', 8, 20260929)
    expect(picked).toHaveLength(8)
    expect(new Set(picked.map((x) => x.id)).size).toBe(8)
    for (const x of picked) expect(pool).toContainEqual(x)
  })

  it('copes with an empty pool', () => {
    expect(dailyPick([], 'Focus', 8)).toEqual([])
  })
})

describe('mergePool', () => {
  it('puts fresh results first and drops duplicates', () => {
    const merged = mergePool([v(1), v(2)], [v(2), v(3)])
    expect(merged.map((x) => x.id)).toEqual(['v1', 'v2', 'v3'])
  })

  it('caps the pool so old videos age out', () => {
    const merged = mergePool(pool, pool.map((x, i) => v(i + 100)))
    expect(merged).toHaveLength(POOL_MAX)
    expect(merged[0].id).toBe('v0')
  })

  it('starts a pool from nothing', () => {
    expect(mergePool([v(1)], null)).toEqual([v(1)])
  })
})

describe('the routes no longer re-date a stale list as today', () => {
  for (const route of ['app/api/motivation-videos/route.ts', 'app/api/music-videos/route.ts']) {
    it(route, () => {
      const src = fs.readFileSync(path.join(process.cwd(), route), 'utf8')
      // The old bug: setCachedVideos(type, key, fallback) stamped yesterday's
      // list with today's date, so it came back every day.
      expect(src).not.toMatch(/setCachedVideos\([^)]*fallback\)/)
      expect(src).toContain('rememberForToday(')
      expect(src).toContain('dailyPick(')
    })
  }
})
