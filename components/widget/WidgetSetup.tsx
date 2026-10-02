'use client'

import { useEffect, useState } from 'react'
import { LayoutGrid, X } from 'lucide-react'
import { isDismissed, setDismissed } from '@/lib/ui/dismiss'
import { widgetReady, WIDGET_READY_EVENT } from '@/lib/widget-sync'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const TIP_ID = 'widget-setup-tip'

/** True once this phone's build has a widget that received data. */
function useWidgetReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(widgetReady())
    const on = () => setReady(true)
    window.addEventListener(WIDGET_READY_EVENT, on)
    return () => window.removeEventListener(WIDGET_READY_EVENT, on)
  }, [])
  return ready
}

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
 * A one-time card on Home: "Put Voxu on your home screen".
 *
 * Shown ONLY when this phone's build really has the widget — the native
 * bridge reports a successful write to the App Group (lib/widget-sync). An
 * older build has no widget, and telling someone to add one that isn't
 * there would send them hunting for nothing. Dismissed for good with one
 * tap; the same steps stay in Settings → Home screen widget.
 */
export function WidgetSetupTip() {
  const ready = useWidgetReady()
  const [hidden, setHidden] = useState(true)
  useEffect(() => { setHidden(isDismissed(TIP_ID)) }, [])
  if (!ready || hidden) return null

  const close = () => { setDismissed(TIP_ID); setHidden(true) }

  return (
    <section className="card-surface-lg p-4" aria-label="Add the Voxu widget">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 shrink-0 rounded-full scene-icon-ring flex items-center justify-center" aria-hidden>
          <LayoutGrid className="w-[18px] h-[18px] text-white/80" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="scene-eyebrow">New</p>
          <p className="text-px-18 text-white leading-snug mt-0.5" style={{ ...SERIF, fontWeight: 600 }}>
            Put Voxu on your home screen
          </p>
          <p className="text-px-13 text-white/70 mt-1 leading-snug">
            Your era day, today&rsquo;s promise and your streak, without opening the app.
          </p>
        </div>
        <button onClick={close} aria-label="Dismiss" className="tap-44 p-1.5 rounded-full hover:bg-white/10 shrink-0">
          <X className="w-4 h-4 text-white/60" />
        </button>
      </div>
      <div className="mt-3">
        <WidgetSteps />
      </div>
      <button onClick={close} className="mt-4 w-full py-2.5 rounded-xl border border-white/15 text-px-13 text-white/85">
        Got it
      </button>
    </section>
  )
}

/** Settings → Home screen widget: the steps, any time, once the widget exists. */
export function WidgetSettingsSection() {
  const ready = useWidgetReady()
  if (!ready) return null
  return (
    <div className="card-surface rounded-2xl p-4">
      <p className="text-px-14 text-white flex items-center gap-2">
        <LayoutGrid className="w-4 h-4 text-white/70" aria-hidden /> Home screen widget
      </p>
      <p className="text-px-12 text-white/65 mt-1 mb-3">
        Shows your era day, today&rsquo;s promise and your streak. It updates when you open Voxu, and turns the day over at midnight.
      </p>
      <WidgetSteps />
    </div>
  )
}
