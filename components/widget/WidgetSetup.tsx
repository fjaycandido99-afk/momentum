'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid } from 'lucide-react'
import { WidgetGuideSheet } from './WidgetGuideSheet'
import { Capacitor } from '@capacitor/core'
import { isDismissed, setDismissed } from '@/lib/ui/dismiss'
import { widgetReady } from '@/lib/widget-sync'

/** How to add it — iOS gives apps no way to add a widget for you. */
export function WidgetSteps() {
  return (
    <ol className="space-y-2 text-px-13 text-white/80 leading-snug list-decimal pl-5">
      <li>Long-press an empty spot on your home screen.</li>
      <li>Tap <span className="text-white">+</span> in the top corner and search <span className="text-white">Voxu</span>.</li>
      <li>Pick a size and tap <span className="text-white">Add Widget</span>.</li>
      <li className="text-white/65">
        Lock screen: long-press it, tap <span className="text-white/85">Customize</span>, then the space under the clock.
      </li>
    </ol>
  )
}

/**
 * Settings → one quiet row: "Home screen widget · Show me how". In the app
 * only. (The diagnostics that lived here — last write, Refresh — were for
 * fixing the widget, and are gone now that it works.)
 */
export function WidgetSettingsRow() {
  const [native, setNative] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => { setNative(Capacitor.isNativePlatform()) }, [])
  if (!native) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full card-surface rounded-2xl p-4 flex items-center gap-3 text-left">
        <LayoutGrid className="w-5 h-5 text-white/75 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block text-px-15 text-white">Home screen widget</span>
          <span className="block text-px-12 text-white/60">Today&rsquo;s promise on your home screen</span>
        </span>
        <span className="text-px-13 text-white/70 underline underline-offset-4 shrink-0">Show me how</span>
      </button>
      {open && <WidgetGuideSheet onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * The one-time nudge: right after a KEPT promise (the moment the widget is
 * most useful), in the app, on a build that really has the widget, and only
 * once ever. Never over another popup — it waits for the screen to clear.
 */
export const WIDGET_NUDGE_ID = 'widget-nudge'
export function shouldNudgeWidget(): boolean {
  return Capacitor.isNativePlatform() && widgetReady() && !isDismissed(WIDGET_NUDGE_ID)
}
export function markWidgetNudged(): void { setDismissed(WIDGET_NUDGE_ID) }
