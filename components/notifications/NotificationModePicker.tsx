'use client'

import { useEffect, useState } from 'react'
import { haptic } from '@/lib/haptics'
import { MODE_COPY, NOTIFICATION_MODES, type NotificationMode } from '@/lib/notifications/modes'

/**
 * Quiet / Coach / Strict — how many nudges Voxu may send in a day. Their own
 * reminders always come through; this only rations what Voxu chooses to send.
 */
export function NotificationModePicker() {
  const [mode, setMode] = useState<NotificationMode | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/notifications/mode', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.mode) setMode(d.mode) })
      .catch(() => {})
  }, [])

  const choose = async (m: NotificationMode) => {
    if (m === mode || saving) return
    haptic('light')
    const before = mode
    setMode(m)
    setSaving(true)
    try {
      const res = await fetch('/api/notifications/mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: m }),
      })
      if (!res.ok) setMode(before)
    } catch {
      setMode(before)
    } finally {
      setSaving(false)
    }
  }

  if (!mode) return null
  return (
    <div className="rounded-xl border border-white/15 p-3.5">
      <p className="text-px-14 text-white">How much Voxu nudges you</p>
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-white/[0.05]" role="radiogroup" aria-label="How much Voxu nudges you">
        {NOTIFICATION_MODES.map(m => (
          <button
            key={m}
            role="radio"
            aria-checked={mode === m}
            onClick={() => choose(m)}
            className={`tap-44 py-2 rounded-lg text-px-13 ${mode === m ? 'bg-white text-black font-medium' : 'text-white/75'}`}
          >
            {MODE_COPY[m].title}
          </button>
        ))}
      </div>
      <p className="text-px-12 text-white/60 mt-2">{MODE_COPY[mode].line}</p>
    </div>
  )
}
