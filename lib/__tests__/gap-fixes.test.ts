import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { isDebriefHour } from '@/components/home/NightDebriefCard'
import { rescuePlan } from '@/lib/pulse/rescue'
import type { PulseInput } from '@/lib/pulse/engine'

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

describe('review fixes, 2026-09-29', () => {
  it('1. turning off nudges does not silence the rest of the moment slot', () => {
    const spark = read('components/home/DailySpark.tsx')
    expect(spark).toContain("const NUDGE_OFF_ID = 'pulse-nudge-off'")
    expect(spark).toContain("onOff={() => { setDismissed(NUDGE_OFF_ID, 'forever'); dismiss() }}")
  })

  it('2. the debrief never describes the new day after midnight', () => {
    expect(isDebriefHour(19)).toBe(true)
    expect(isDebriefHour(23)).toBe(true)
    expect(isDebriefHour(0)).toBe(false)
    expect(isDebriefHour(2)).toBe(false)
  })

  it('3. a failed Pulse refetch keeps what is on screen', () => {
    expect(read('components/home/PulseSection.tsx')).toContain('if (!p) return')
  })

  it('4. a voice stops when its button goes', () => {
    expect(read('components/journal/SpeakReplyButton.tsx')).toMatch(/useEffect\(\(\) => \(\) => \{\s*audioRef\.current\?\.pause\(\)/)
  })

  it('6. an accepted rescue holds until its last step', () => {
    const base: PulseInput = {
      now: 17 * 60, weekday: 3, era: null, steps: [],
      practices: [{ id: 'g', label: 'Gym', state: 'due', todaysMinimum: '20 minutes', weakDay: null }],
    }
    expect(rescuePlan(base)).toBeNull() // one open, not accepted: no rescue
    expect(rescuePlan({ ...base, rescueOn: true })?.steps).toHaveLength(1)
    expect(rescuePlan({ ...base, rescueOn: true })?.reason).toMatch(/^One thing is still open/)
  })

  it('7. audio in a stand-in voice is never cached as Voxu', () => {
    expect(read('app/api/ai/chat-voice/route.ts')).toContain('if (!fellBack) await setSharedCache(')
  })

  it('8. every video list a route returns is picked and SHOW long', () => {
    for (const r of ['app/api/motivation-videos/route.ts', 'app/api/music-videos/route.ts']) {
      const src = read(r)
      expect(src).toContain('const pick = <T,>(list: T[]) => dailyPick(')
      expect(src).not.toContain('videos: shuffled')
      expect(src).not.toMatch(/videos: fallback[,\s]/)
    }
  })
})
