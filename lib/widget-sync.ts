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

let lastEra: EraTodayWire | null = null
let lastPulse: Pulse | null = null
let eraLoaded = false

async function writeSnapshot(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const json = JSON.stringify(buildWidgetSnapshot(lastEra, new Date(), lastPulse))
    if (json === lastWritten) return
    const res = await WidgetBridge.write({ json })
    if (res?.written) {
      lastWritten = json
      await WidgetBridge.reload()
    }
  } catch {
    /* no bridge in this build yet — best-effort, never block the app */
  }
}
