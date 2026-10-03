import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { buildWidgetSnapshot, clip, localDay, WIDGET_SNAPSHOT_VERSION } from '@/lib/widget-snapshot'
import type { EraTodayWire } from '@/lib/era/service'

// Only the fields the snapshot reads; the rest of the wire is irrelevant here.
const era = (over: Partial<EraTodayWire> = {}) =>
  ({
    title: 'Locked In',
    day: 9,
    lengthDays: 30,
    stage: { key: 'building', label: 'Building', line: '' },
    today: { text: 'Finish the report before lunch.', kept: null, coachReply: null, confidence: null, blocker: null, helper: null },
    mission: 'Say no to one request.',
    missionDone: false,
    stats: { made: 9, answered: 8, kept: 6, keptPercent: 75, promiseStreak: 6 },
    ...over,
  }) as unknown as EraTodayWire

const noon = new Date(2026, 8, 29, 12, 0, 0)

describe('buildWidgetSnapshot', () => {
  it('carries the era day, promise, mission and streak', () => {
    const s = buildWidgetSnapshot(era(), noon)
    expect(s).toEqual({
      v: WIDGET_SNAPSHOT_VERSION,
      date: '2026-09-29',
      era: { title: 'Locked In', day: 9, length: 30, stage: 'Building' },
      promise: { text: 'Finish the report before lunch.', kept: null },
      mission: { text: 'Say no to one request.', done: false },
      streak: 6,
      pulse: null,
      accent: '#ffffff',
      tomorrowReady: false,
      // Today's guided session and newest law, for the guided and noticed widgets.
      guide: null,
      law: null,
    })
  })

  it('carries Pulse — right now and today — trimmed for a widget', () => {
    const pulse = {
      rightNow: { kind: 'due_now' as const, eyebrow: 'Due now', title: 'Gym is due now.', quote: null, context: 'x', action: null },
      today: {
        done: 1,
        total: 3,
        items: Array.from({ length: 9 }, (_, i) => ({
          key: String(i), kind: 'discipline' as const, title: `Item ${i}`, time: i === 0 ? '17:30' : null,
          status: 'due' as const, target: null,
        })),
      },
      next: null,
    }
    const s = buildWidgetSnapshot(era(), noon, pulse)
    expect(s.pulse?.rightNow).toEqual({ eyebrow: 'Due now', title: 'Gym is due now.', quote: null })
    expect(s.pulse?.items).toHaveLength(6)
    expect(s.pulse?.items[0]).toEqual({ title: 'Item 0', time: '17:30', status: 'due', kind: 'discipline' })
    expect([s.pulse?.done, s.pulse?.total]).toEqual([1, 3])
  })

  it('has no promise before one is made — the widget asks for one', () => {
    expect(buildWidgetSnapshot(era({ today: null }), noon).promise).toBeNull()
  })

  it('says nothing about an era that does not exist', () => {
    const s = buildWidgetSnapshot(null, noon)
    expect(s.era).toBeNull()
    expect(s.promise).toBeNull()
    expect(s.streak).toBe(0)
  })

  it('dates by the LOCAL day, not UTC', () => {
    // 11pm local is still today, whatever UTC says.
    expect(localDay(new Date(2026, 8, 29, 23, 30))).toBe('2026-09-29')
  })

  it('keeps the day inside the era', () => {
    expect(buildWidgetSnapshot(era({ day: 34 }), noon).era?.day).toBe(30)
  })

  it('never carries anything from the journal', () => {
    // The widget sits on a lock screen other people can see.
    // Code only — the file's own comment promising this mentions the word.
    const src = fs
      .readFileSync(path.join(process.cwd(), 'lib/widget-snapshot.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
    expect(src).not.toMatch(/journal|entry\.content|dream/i)
  })
})

describe('clip', () => {
  it('leaves short text alone', () => {
    expect(clip('Short.', 40)).toBe('Short.')
  })
  it('cuts at a word with an ellipsis', () => {
    const out = clip('I will finish the thing I have been avoiding before lunch today', 30)
    expect(out.length).toBeLessThanOrEqual(30)
    expect(out.endsWith('…')).toBe(true)
    expect(out).not.toMatch(/\s…$/)
  })
})

describe('the Swift side reads the same shape', () => {
  it('decodes every field the snapshot writes', () => {
    const swift = fs.readFileSync(path.join(process.cwd(), 'ios/App/VoxuWidget/VoxuWidget.swift'), 'utf8')
    for (const field of ['let v: Int', 'let date: String', 'let era: Era?', 'let promise: Promise?', 'let mission: Mission?', 'let streak: Int', 'let pulse: PulseSnap?', 'let rightNow: RightNow?', 'let items: [Item]']) {
      expect(swift).toContain(field)
    }
    expect(swift).toContain('"widget_snapshot"')
    const bridge = fs.readFileSync(path.join(process.cwd(), 'ios/App/App/WidgetBridgePlugin.swift'), 'utf8')
    expect(bridge).toContain('"widget_snapshot"')
    expect(bridge).toContain('"group.com.voxu.app"')
  })
})

describe('widgetGuide', () => {
  it('carries today\'s guided session for the widget\'s play button, or nothing', async () => {
    const { widgetGuide } = await import('@/lib/widget-snapshot')
    const pulse = { today: { items: [{ kind: 'guide', target: { type: 'guide', id: 'focus', name: 'Focus' } }] } } as never
    expect(widgetGuide(pulse)).toEqual({ id: 'focus', name: 'Focus' })
    expect(widgetGuide({ today: { items: [] } } as never)).toBeNull()
    expect(widgetGuide(null)).toBeNull()
  })
})
