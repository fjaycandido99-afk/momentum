'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlarmClock, Loader2, Play, X } from 'lucide-react'
import { eraName } from '@/lib/era/presets'
import { isNativeApp, isPushSupported, subscribeToPush } from '@/lib/push-notifications'
import { trackFeature } from '@/lib/analytics/track'

export interface WakeCallSettings {
  enabled: boolean
  time: string | null
}

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Makes sure this device can receive the call. Asks for permission if it
 * hasn't been asked; never hangs — a registration that doesn't answer in a
 * few seconds is treated as done, since the token may already be on file.
 */
async function ensurePush(): Promise<'ok' | 'denied' | 'unsupported'> {
  if (!isPushSupported()) return 'unsupported'
  try {
    await Promise.race([subscribeToPush(), new Promise(resolve => setTimeout(resolve, 8000))])
    return 'ok'
  } catch (err) {
    return /denied/i.test((err as Error)?.message ?? '') ? 'denied' : 'ok'
  }
}

/**
 * Set the era wake-up call: a time, on or off, and a way to hear today's.
 *
 * Says plainly that it's a notification, not an alarm — it won't ring
 * through Silent or a Focus mode, and promising otherwise would cost a
 * missed morning and the trust that goes with it.
 */
export function WakeCallSheet({
  eraTitle,
  initial,
  hidePreview = false,
  onClose,
  onSaved,
}: {
  eraTitle: string
  initial: WakeCallSettings
  /** On the call page itself, "Hear today's call" would just reload it. */
  hidePreview?: boolean
  onClose: () => void
  onSaved: (settings: WakeCallSettings) => void
}) {
  const [time, setTime] = useState(initial.time ?? '06:30')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pushNote, setPushNote] = useState<string | null>(null)

  const save = async (enabled: boolean) => {
    setBusy(true)
    setError(null)
    setPushNote(null)
    try {
      const res = await fetch('/api/era/wake', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          time,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.settings) {
        setError(data?.error || 'Could not save. Try again.')
        return
      }
      onSaved(data.settings)
      // Turning it OFF is the signal worth having, so both are tracked.
      trackFeature('era', enabled ? 'enable' : 'disable', 'wake_call')
      if (!enabled) return onClose()

      const push = await ensurePush()
      if (push === 'denied') {
        setPushNote(isNativeApp()
          ? 'Saved — but notifications are off for Voxu, so the call can’t reach you. Turn them on in Settings → Voxu → Notifications.'
          : 'Saved — but notifications are blocked for this site, so the call can’t reach you.')
        return
      }
      if (push === 'unsupported') {
        setPushNote('Saved. This browser can’t receive notifications — the call will reach you in the Voxu app.')
        return
      }
      onClose()
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col justify-end" role="dialog" aria-modal="true" aria-label="Wake-up call">
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45 flex items-center gap-1.5">
              <AlarmClock className="w-3 h-3" /> Wake-up call
            </p>
            <h2 className="text-[26px] text-white leading-tight mt-1.5" style={{ ...SERIF, fontWeight: 600 }}>
              Let your coach wake you up.
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-white/70 leading-relaxed mt-2">
          At this time your coach calls you by name, tells you where you are in your {eraName(eraTitle)}, and asks
          for today&rsquo;s promise. Tap the notification to hear it.
        </p>

        <label htmlFor="wake-time" className="block mt-5 text-[11px] uppercase tracking-[0.2em] text-white/45">
          Wake me at
        </label>
        <input
          id="wake-time"
          type="time"
          step={300}
          value={time}
          onChange={e => setTime(e.target.value)}
          className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[34px] leading-none text-white [color-scheme:dark] focus:outline-none focus:border-white/40"
          style={{ ...SERIF, fontWeight: 500 }}
        />

        {error && <p className="text-xs text-white/80 mt-3" role="alert">{error}</p>}
        {pushNote && <p className="text-xs text-white/80 mt-3 leading-relaxed" role="status">{pushNote}</p>}

        <div className="mt-5 space-y-2.5">
          <button
            onClick={() => save(true)}
            disabled={busy || !time}
            className="w-full py-4 rounded-2xl bg-white text-black text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {initial.enabled ? 'Save' : 'Set my wake-up call'}
          </button>
          {!hidePreview && (
            <Link
              href="/era/wake"
              className="w-full py-3.5 rounded-2xl border border-white/20 text-white/85 text-sm flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" /> Hear today&rsquo;s call
            </Link>
          )}
          {initial.enabled && (
            <button onClick={() => save(false)} disabled={busy} className="w-full py-2.5 text-xs text-white/55 underline-offset-2 hover:underline">
              Turn off the wake-up call
            </button>
          )}
        </div>

        <p className="text-[11px] text-white/40 text-center mt-3 leading-relaxed">
          It&rsquo;s a notification, not an alarm — it won&rsquo;t ring through Silent or a Focus mode.
        </p>
      </div>
    </div>
  )
}
