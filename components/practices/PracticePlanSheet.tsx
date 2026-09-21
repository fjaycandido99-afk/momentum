'use client'

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { PLAN_MAX_ITEMS, PLAN_MAX_ITEM_LENGTH, planCopy, slotsFor } from '@/lib/practices/plan'
import { PRESETS_BY_KEY } from '@/lib/practices/presets'
import type { PracticeWire } from '@/lib/practices/logic'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * The plan: what THEY do on each day of a practice.
 *
 * One box per slot — a named split gets Push/Pull/Legs, anything else gets
 * its scheduled days, and an every-day practice gets a single box. The
 * wording follows the domain, because a training day is a list of exercises
 * and a run is one goal; asking "what exercises?" about a book would be the
 * app not knowing what it's looking at.
 *
 * Voxu never suggests the contents and never reads them back as data. It
 * stores the lines and shows the right ones on the right day.
 */
export function PracticePlanSheet({
  practice,
  onClose,
  onSaved,
}: {
  practice: PracticeWire
  onClose: () => void
  onSaved: () => void
}) {
  const domain = PRESETS_BY_KEY.get(practice.presetKey)?.domain
  const copy = planCopy(domain)
  const slots = slotsFor({ presetKey: practice.presetKey, days: practice.days })

  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const slot of slots) initial[slot.key] = (practice.plan?.[slot.key] ?? []).join('\n')
    return initial
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setBusy(true)
    setError(null)
    const plan: Record<string, string[]> = {}
    for (const [key, text] of Object.entries(draft)) {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean).slice(0, PLAN_MAX_ITEMS)
      if (lines.length > 0) plan[key] = lines
    }
    try {
      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'plan', practiceId: practice.id, plan }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(data?.error ?? 'Could not save that')
        return
      }
      haptic('medium')
      onSaved()
      onClose()
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Plan for ${practice.label}`}
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">{practice.label}</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {copy.ask}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 -mr-1 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mt-2">{copy.hint}</p>

        <div className="mt-4 space-y-4">
          {slots.map(slot => (
            <div key={slot.key}>
              <label
                htmlFor={`plan-${slot.key}`}
                className="block text-[11px] uppercase tracking-[0.2em] text-white/45"
              >
                {slot.label}
              </label>
              <textarea
                id={`plan-${slot.key}`}
                value={draft[slot.key] ?? ''}
                onChange={e => setDraft(d => ({ ...d, [slot.key]: e.target.value }))}
                rows={copy.multiline ? 4 : 2}
                maxLength={PLAN_MAX_ITEMS * (PLAN_MAX_ITEM_LENGTH + 1)}
                placeholder={copy.placeholder}
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/25 leading-relaxed resize-none"
              />
            </div>
          ))}
        </div>

        {error && <p className="text-sm text-white/80 mt-3" role="alert">{error}</p>}

        <p className="text-[11px] text-white/35 mt-3 leading-relaxed">
          Your words, shown back on the day. Voxu doesn&rsquo;t grade them, count them or write
          them for you — it doesn&rsquo;t know your body{domain === 'gym' ? ', your gym' : ''} or
          your shelf.
        </p>

        <button
          onClick={save}
          disabled={busy}
          className="w-full mt-4 py-3.5 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Save
        </button>
      </div>
    </div>
  )
}
