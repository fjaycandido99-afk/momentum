import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { getJourney } from '@/lib/journey'
import type { MindsetId } from '@/lib/mindset/types'
import type { EraTodayWire } from '@/lib/era/service'
import { buildWidgetSnapshot } from '@/lib/widget-snapshot'
import type { Pulse } from '@/lib/pulse/engine'

// Native bridge (WidgetBridgePlugin.swift) — refreshes the home-screen widget
// immediately after new data is written. Absent until the native rebuild; calls
// are wrapped in try/catch so it's a safe no-op until then.
interface WidgetBridgePlugin {
  reload(): Promise<void>
  /**
   * Writes the widget's JSON snapshot into the App Group's UserDefaults.
   * Resolves { written: false } when the build has no App Group entitlement
   * yet — Preferences can't do this: its "group" option is only a key
   * prefix inside the app's OWN defaults, which a widget cannot read.
   */
  write(options: { json: string }): Promise<{ written: boolean }>
}
const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge')

// Pushes the values the iOS home-screen widget reads (streak + journey stage)
// into shared storage. No-op on web. On native it writes via
// @capacitor/preferences — which targets the App Group once that's configured in
// capacitor.config (`Preferences: { group: 'group.com.voxu.app' }`); until then
// it writes to the default store harmlessly. See ios/App/VoxuWidget/README.md.
export async function syncWidgetData(streak: number, mindset?: MindsetId): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const name = mindset ? MINDSET_CONFIGS[mindset]?.name : undefined
    const j = getJourney(mindset, name, streak)
    await Preferences.set({ key: 'widget_streak', value: String(Math.max(0, streak || 0)) })
    await Preferences.set({ key: 'widget_stage', value: j.isBeginning ? '' : j.stage })
    // Refresh the widget now rather than waiting for its timeline policy.
    try { await WidgetBridge.reload() } catch { /* bridge not in this build yet */ }
  } catch {
    /* widget data is best-effort — never block the app on it */
  }
}

/** Last snapshot written, so re-renders that change nothing don't touch disk. */
let lastWritten = ''

/**
 * Sends today's era — day, promise, mission, streak — to the home-screen
 * widget (lib/widget-snapshot.ts). Called from useEra whenever the era loads
 * or changes, so every screen that shows the era keeps the widget current.
 * No-op on web, and a safe no-op on builds without the widget.
 */
export async function syncWidgetEra(era: EraTodayWire | null): Promise<void> {
  lastEra = era
  eraLoaded = true
  await writeSnapshot()
}

/**
 * Sends Pulse's right-now and today's list to the widget. Called by home's
 * Pulse section each time it loads. Merged with the last era rather than
 * written alone, so neither half ever wipes the other.
 */
export async function syncWidgetPulse(pulse: Pulse | null): Promise<void> {
  lastPulse = pulse
  // Nothing until the era has been read once: writing now would put a
  // snapshot with no era on the widget for the moment before it arrives.
  if (eraLoaded) await writeSnapshot()
}

/** Set once a write reached the widget — this build HAS one. Remembered on the device. */
const READY_KEY = 'voxu.widget.ready'
export const WIDGET_READY_EVENT = 'voxu:widget-ready'

/** Has this phone's build got a working widget? (A write to the App Group succeeded.) */
export function widgetReady(): boolean {
  try { return localStorage.getItem(READY_KEY) === '1' } catch { return false }
}

function markWidgetReady() {
  try {
    if (localStorage.getItem(READY_KEY) === '1') return
    localStorage.setItem(READY_KEY, '1')
  } catch { /* storage off: the tip just won't show */ }
  window.dispatchEvent(new Event(WIDGET_READY_EVENT))
}

let lastEra: EraTodayWire | null = null
let lastPulse: Pulse | null = null
let eraLoaded = false

/**
 * What happened the last time the app tried to reach the widget — shown in
 * Settings (components/widget/WidgetSetup), because every failure here used
 * to be silent and the widget just fell back to a quote:
 *
 *   written    the snapshot is in the App Group; if the widget still shows a
 *              quote, the WIDGET's build can't read the group
 *   refused    the bridge ran but this app build has no App Group container
 *   no-bridge  this build has no WidgetBridge at all
 */
export type WidgetWriteResult = 'written' | 'refused' | 'no-bridge'
export interface WidgetStatus {
  at: string
  result: WidgetWriteResult
  hasEra: boolean
  hasToday: boolean
}
const STATUS_KEY = 'voxu.widget.status'
export const WIDGET_STATUS_EVENT = 'voxu:widget-status'

export function widgetStatus(): WidgetStatus | null {
  try { const v = localStorage.getItem(STATUS_KEY); return v ? JSON.parse(v) as WidgetStatus : null } catch { return null }
}
function recordStatus(result: WidgetWriteResult) {
  const status: WidgetStatus = { at: new Date().toISOString(), result, hasEra: !!lastEra, hasToday: !!lastPulse }
  try { localStorage.setItem(STATUS_KEY, JSON.stringify(status)) } catch { /* storage off */ }
  try { window.dispatchEvent(new Event(WIDGET_STATUS_EVENT)) } catch { /* ignore */ }
}

async function writeSnapshot(force = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  const json = JSON.stringify(buildWidgetSnapshot(lastEra, new Date(), lastPulse))
  if (json === lastWritten && !force) return
  let res: { written: boolean } | null = null
  try {
    res = await WidgetBridge.write({ json })
  } catch {
    // No bridge in this build — best-effort, never block the app.
    recordStatus('no-bridge')
    return
  }
  if (!res?.written) { recordStatus('refused'); return }
  lastWritten = json
  markWidgetReady()
  recordStatus('written')
  try { await WidgetBridge.reload() } catch { /* the write still landed */ }
}

/** Settings' "Refresh widget": write the current day again and redraw now. */
export async function refreshWidget(): Promise<WidgetStatus | null> {
  // Opened from Settings before Today this session, nothing is loaded yet —
  // and an empty snapshot is exactly what makes the widget show a quote.
  // Read the day first.
  try {
    const [e, p] = await Promise.all([
      fetch('/api/era', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)),
      fetch('/api/pulse', { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)),
    ])
    if (e && 'era' in e) { lastEra = e.era ?? null; eraLoaded = true }
    if (p?.pulse) lastPulse = p.pulse
  } catch { /* write what we have */ }
  await writeSnapshot(true)
  return widgetStatus()
}
