/**
 * What the iPhone home-screen widget shows, as one small JSON document.
 *
 * The app writes it into the shared App Group (WidgetBridge.write) every time
 * the era is loaded or changes — the promise made or kept, the mission done —
 * and the widget (ios/App/VoxuWidget) reads it. The widget cannot sign in or
 * call the API as the user, so this snapshot is everything it knows.
 *
 * ── RULES ────────────────────────────────────────────────────────────
 *
 * - Only what the user sees on their own home screen already: the era's
 *   title and day, today's promise in their own words, today's mission, and
 *   the promise streak. Nothing from the journal, ever.
 * - Dated with the LOCAL day it was written. The widget moves the day
 *   counter forward itself and drops yesterday's promise, so a phone that has
 *   not opened the app since yesterday still says the right day — and never
 *   shows yesterday's promise as today's.
 *
 * Pure, so the shape is pinned by tests; the Swift side decodes exactly this.
 */

import type { EraTodayWire } from '@/lib/era/service'
import type { Pulse, TodayStatus } from '@/lib/pulse/engine'
import { eraAccentHex } from '@/lib/era/skins'

export const WIDGET_SNAPSHOT_VERSION = 1

export interface WidgetSnapshot {
  v: typeof WIDGET_SNAPSHOT_VERSION
  /** Local YYYY-MM-DD the snapshot describes. */
  date: string
  era: {
    title: string
    day: number
    length: number
    /** The era's stage label, e.g. "Building" — may be empty. */
    stage: string
  } | null
  /** Today's promise, in their words. `kept` is null until answered. */
  promise: { text: string; kept: boolean | null } | null
  mission: { text: string; done: boolean } | null
  /** Consecutive days with a promise made, ending today or yesterday. */
  streak: number
  /**
   * Pulse (lib/pulse/engine.ts): the one thing right now, and today's list.
   * The widget moves timed items to "due now" / "slipping" by itself at
   * their times, so it changes through the day without the app open.
   * Optional so a snapshot written before Pulse still decodes.
   */
  pulse?: WidgetPulse | null
  /** The era skin's accent, "#rrggbb" (lib/era/skins.ts) — fills and glow only. */
  accent?: string
}

export interface WidgetPulse {
  rightNow: { eyebrow: string; title: string; quote: string | null } | null
  done: number
  total: number
  items: { title: string; time: string | null; status: TodayStatus; kind: string }[]
}

/** How many of today's items the widget carries — the large size shows five. */
export const WIDGET_ITEMS = 6

export function widgetPulse(pulse: Pulse | null | undefined): WidgetPulse | null {
  if (!pulse) return null
  return {
    rightNow: pulse.rightNow
      ? {
          eyebrow: pulse.rightNow.eyebrow,
          title: clip(pulse.rightNow.title, 60),
          quote: pulse.rightNow.quote ? clip(pulse.rightNow.quote, 90) : null,
        }
      : null,
    done: pulse.today.done,
    total: pulse.today.total,
    items: pulse.today.items.slice(0, WIDGET_ITEMS).map(i => ({
      title: clip(i.title, 28),
      time: i.time,
      status: i.status,
      kind: i.kind,
    })),
  }
}

/** The user's LOCAL date — never toISOString(), which is UTC. */
export function localDay(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Widgets are small: cut long text at a word, with an ellipsis. */
export function clip(text: string, max: number): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max - 1)
  const space = cut.lastIndexOf(' ')
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`
}

export function buildWidgetSnapshot(era: EraTodayWire | null, now: Date = new Date(), pulse?: Pulse | null): WidgetSnapshot {
  const date = localDay(now)
  const p = widgetPulse(pulse)
  if (!era) return { v: WIDGET_SNAPSHOT_VERSION, date, era: null, promise: null, mission: null, streak: 0, pulse: p, accent: eraAccentHex(null) }
  return {
    v: WIDGET_SNAPSHOT_VERSION,
    date,
    era: {
      title: clip(era.title, 40),
      day: Math.max(1, Math.min(era.day, era.lengthDays)),
      length: era.lengthDays,
      stage: era.stage?.label ?? '',
    },
    promise: era.today?.text ? { text: clip(era.today.text, 140), kept: era.today.kept ?? null } : null,
    mission: era.mission ? { text: clip(era.mission, 120), done: !!era.missionDone } : null,
    streak: Math.max(0, era.stats?.promiseStreak ?? 0),
    pulse: p,
    accent: eraAccentHex(era.key),
  }
}
