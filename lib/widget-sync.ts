import { Capacitor, registerPlugin } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { getJourney } from '@/lib/journey'
import type { MindsetId } from '@/lib/mindset/types'

// Native bridge (WidgetBridgePlugin.swift) — refreshes the home-screen widget
// immediately after new data is written. Absent until the native rebuild; calls
// are wrapped in try/catch so it's a safe no-op until then.
interface WidgetBridgePlugin {
  reload(): Promise<void>
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
