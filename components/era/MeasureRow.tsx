'use client'

import { useState } from 'react'
import { MEASURE_AMOUNT_MAX, MEASURE_TAG_MAX, MEASURE_UNITS } from '@/lib/era/measure'

export interface MeasureDraft {
  tag: string
  amount: string
  unit: string
}

export const EMPTY_MEASURE: MeasureDraft = { tag: '', amount: '', unit: '' }

/**
 * "Make it countable" — optional, under the promise. What it counts toward
 * (their recent ones as chips) and, if they like, how much. Kept promises
 * add up to receipts on Proof; nothing here is ever required.
 */
export function MeasureRow({ value, onChange, recent }: {
  value: MeasureDraft
  onChange: (m: MeasureDraft) => void
  recent: { tag: string; unit: string | null }[]
}) {
  const [open, setOpen] = useState(!!value.tag)
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="tap-44 mt-2 text-px-12 text-white/60 underline underline-offset-4">
        Make it countable
      </button>
    )
  }
  const set = (patch: Partial<MeasureDraft>) => onChange({ ...value, ...patch })
  return (
    <div className="mt-3">
      <p className="text-px-11 text-white/45">Counts toward <span className="text-white/30">Optional</span></p>
      {recent.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {recent.map(r => (
            <button
              key={r.tag}
              type="button"
              aria-pressed={value.tag.toLowerCase() === r.tag.toLowerCase()}
              onClick={() => set({ tag: r.tag, unit: value.unit || r.unit || '' })}
              className={`px-2.5 py-1 rounded-full text-px-12 border ${value.tag.toLowerCase() === r.tag.toLowerCase() ? 'bg-white text-black border-white' : 'border-white/20 text-white/75'}`}
            >
              {r.tag}
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 grid grid-cols-[1fr_4.5rem_6.5rem] gap-1.5">
        <input
          aria-label="What it counts toward"
          value={value.tag}
          maxLength={MEASURE_TAG_MAX}
          onChange={e => set({ tag: e.target.value })}
          placeholder="Gym, Reading…"
          className="min-w-0 px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.15] text-base text-white placeholder:text-white/30"
        />
        <input
          aria-label="How much"
          inputMode="numeric"
          value={value.amount}
          onChange={e => set({ amount: e.target.value.replace(/\D/g, '').slice(0, String(MEASURE_AMOUNT_MAX).length) })}
          placeholder="20"
          className="min-w-0 px-2.5 py-2 rounded-lg bg-white/[0.05] border border-white/[0.15] text-base text-white placeholder:text-white/30"
        />
        <select
          aria-label="Unit"
          value={value.unit}
          onChange={e => set({ unit: e.target.value })}
          className="min-w-0 px-2 py-2 rounded-lg bg-[#111] border border-white/[0.15] text-px-13 text-white"
        >
          <option value="">unit</option>
          {MEASURE_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </div>
      <p className="text-px-11 text-white/40 mt-1.5">Kept ones add up on Proof — like &ldquo;Gym ×18&rdquo;.</p>
    </div>
  )
}

/** What to send: the tag alone, or with a whole amount and a unit — or nothing. */
export function measurePayload(m: MeasureDraft): { tag: string; amount?: number; unit?: string } | undefined {
  const tag = m.tag.trim()
  if (!tag) return undefined
  const amount = Number(m.amount)
  return Number.isInteger(amount) && amount > 0 && m.unit ? { tag, amount, unit: m.unit } : { tag }
}
