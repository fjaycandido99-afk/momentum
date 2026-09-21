'use client'

import { useState } from 'react'
import { Dumbbell, Loader2, Plus, X } from 'lucide-react'
import {
  PLAN_MAX_DETAIL_LENGTH,
  PLAN_MAX_ITEMS,
  PLAN_MAX_ITEM_LENGTH,
  planCopy,
  slotsFor,
  type PlanItem,
} from '@/lib/practices/plan'
import { PRESETS_BY_KEY } from '@/lib/practices/presets'
import type { PracticeWire } from '@/lib/practices/logic'
import { haptic } from '@/lib/haptics'
import { guideForDomain } from '@/lib/practices/guides'
import { PracticeGuideSheet } from './PracticeGuideSheet'
import { matchMovement } from '@/lib/movements/swap'
import { MovementSheet } from './MovementSheet'
import { MovementPicker } from '@/components/movements/MovementPicker'
import { PatternGlyph } from '@/components/movements/PatternGlyph'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/** A slot as the editor holds it while it's being typed. */
interface DraftSlot {
  items: PlanItem[]
  minimum: string
}

/**
 * The builder: what YOU do on each day of a discipline.
 *
 * It was a textarea, which read as a notes field — so it got treated like
 * one. Each day is now rows: what it is, and optionally how much ("3 x 8",
 * "20 pages", "easy pace"), plus this day's own floor, because a Friday
 * after a long week is not the same ask as a Monday.
 *
 * One list per slot: a named split gets Push/Pull/Legs, anything else gets
 * its scheduled days, and an every-day practice gets a single list. The
 * wording follows the domain — asking "what exercises?" about a book would
 * be the app not knowing what it's looking at.
 *
 * Voxu stores every word verbatim and parses none of it. It writes no
 * programmes, suggests no exercises, and reads no set, rep or load: it
 * doesn't know anyone's body, and PracticeGuideSheet says that out loud.
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
  const guide = guideForDomain(domain)

  const [draft, setDraft] = useState<Record<string, DraftSlot>>(() => {
    const initial: Record<string, DraftSlot> = {}
    for (const slot of slots) {
      const stored = practice.plan?.[slot.key]
      initial[slot.key] = {
        // One empty row to type into, so the first thing on screen is a
        // place to start rather than a button to find.
        items: stored?.items.length ? stored.items : [{ name: '' }],
        minimum: stored?.minimum ?? '',
      }
    }
    return initial
  })
  const [busy, setBusy] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * The row whose movement sheet is open.
   *
   * Only ever a row whose typed name matched the library exactly, so the
   * affordance never appears next to "3 rounds of whatever" — offering
   * swaps for a movement nobody named would be a guess.
   */
  const [swapRow, setSwapRow] = useState<{ slotKey: string; index: number } | null>(null)
  const swapping = swapRow ? matchMovement(draft[swapRow.slotKey]?.items[swapRow.index]?.name ?? '') : null
  /**
   * Which slot is picking from the library, if any.
   *
   * Gym only: the library is movements. Offering "pick an exercise" while
   * someone plans a book would be the app not knowing what it's looking at.
   */
  const [pickingFor, setPickingFor] = useState<string | null>(null)
  const canPick = domain === 'gym'

  const setItem = (slotKey: string, index: number, patch: Partial<PlanItem>) => {
    setDraft(d => {
      const slot = d[slotKey]
      const items = slot.items.map((item, i) => (i === index ? { ...item, ...patch } : item))
      return { ...d, [slotKey]: { ...slot, items } }
    })
  }

  const addRow = (slotKey: string) => {
    haptic('light')
    setDraft(d => {
      const slot = d[slotKey]
      if (slot.items.length >= PLAN_MAX_ITEMS) return d
      return { ...d, [slotKey]: { ...slot, items: [...slot.items, { name: '' }] } }
    })
  }

  const removeRow = (slotKey: string, index: number) => {
    haptic('light')
    setDraft(d => {
      const slot = d[slotKey]
      const items = slot.items.filter((_, i) => i !== index)
      return { ...d, [slotKey]: { ...slot, items: items.length ? items : [{ name: '' }] } }
    })
  }

  const save = async () => {
    setBusy(true)
    setError(null)
    // Blank rows are dropped here and again on the server; the server's
    // pass is the one that counts.
    const plan: Record<string, { items: PlanItem[]; minimum?: string }> = {}
    for (const [key, slot] of Object.entries(draft)) {
      const items = slot.items
        .map(item => {
          const detail = item.detail?.trim()
          return detail ? { name: item.name.trim(), detail } : { name: item.name.trim() }
        })
        .filter(item => item.name.length > 0)
      const minimum = slot.minimum.trim()
      if (items.length > 0 || minimum) plan[key] = minimum ? { items, minimum } : { items }
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
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">{practice.label}</p>
            <h2 className="text-[26px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
              {copy.ask}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <p className="text-sm text-white/60 leading-relaxed mt-2">{copy.hint}</p>

        {/* The how-to, right where someone is deciding what their sessions
            are. Writing "run 4 miles" and being told how to breathe while
            doing it belong on the same screen. */}
        <div className="mt-3 rounded-xl bg-white/[0.04] border border-white/[0.1] p-3">
          <p className="text-[13px] text-white/75 leading-snug">{guide.title}</p>
          <p className="text-[12px] text-white/45 mt-0.5 leading-snug">{guide.keystone}</p>
          <button
            onClick={() => setShowGuide(true)}
            className="text-[12px] text-white/70 hover:text-white underline underline-offset-4 decoration-white/20 mt-1.5"
          >
            Read the steps
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {slots.map(slot => {
            const slotDraft = draft[slot.key]
            return (
              <div key={slot.key}>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{slot.label}</p>

                <div className="mt-2 space-y-2">
                  {slotDraft.items.map((item, i) => {
                    const matched = matchMovement(item.name)
                    return (
                    <div key={i}>
                    <div className="flex gap-2">
                      <input
                        value={item.name}
                        onChange={e => setItem(slot.key, i, { name: e.target.value })}
                        maxLength={PLAN_MAX_ITEM_LENGTH}
                        placeholder={copy.rowPlaceholder}
                        aria-label={`${slot.label}: ${copy.noun} ${i + 1}`}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/25"
                      />
                      {copy.showsDetail && (
                        <input
                          value={item.detail ?? ''}
                          onChange={e => setItem(slot.key, i, { detail: e.target.value })}
                          maxLength={PLAN_MAX_DETAIL_LENGTH}
                          placeholder={copy.detailPlaceholder}
                          aria-label={`${slot.label}: how much, row ${i + 1}`}
                          className="w-24 shrink-0 px-2.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[14px] text-white placeholder:text-white/25 text-center"
                        />
                      )}
                      <button
                        onClick={() => removeRow(slot.key, i)}
                        aria-label={`Remove ${item.name || 'this row'}`}
                        className="shrink-0 px-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06]"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Only for a name the library actually recognises: the
                        mark for what it trains, and a way to other
                        movements that train the same thing. Not a way to
                        learn this one. */}
                    {matched && (
                      <button
                        onClick={() => { haptic('light'); setSwapRow({ slotKey: slot.key, index: i }) }}
                        className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-white/80 mt-1 ml-1"
                      >
                        <PatternGlyph pattern={matched.pattern} className="w-4 h-4 shrink-0" />
                        <span className="underline underline-offset-4 decoration-white/15">
                          No {matched.equipment[0]}? Something else instead
                        </span>
                      </button>
                    )}
                    </div>
                    )
                  })}
                </div>

                {slotDraft.items.length < PLAN_MAX_ITEMS && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                    <button
                      onClick={() => addRow(slot.key)}
                      className="flex items-center gap-1 text-[12px] text-white/55 hover:text-white"
                    >
                      <Plus className="w-3 h-3" /> Add {copy.noun}
                    </button>
                    {/* For the person who doesn't know what to write. It
                        writes a name into a row and nothing else. */}
                    {canPick && (
                      <button
                        onClick={() => { haptic('light'); setPickingFor(slot.key) }}
                        className="flex items-center gap-1 text-[12px] text-white/45 hover:text-white"
                      >
                        <Dumbbell className="w-3 h-3" /> Pick from the library
                      </button>
                    )}
                  </div>
                )}

                {/* This day's own floor. Optional — without one, the
                    practice's minimum applies. */}
                <input
                  value={slotDraft.minimum}
                  onChange={e => setDraft(d => ({ ...d, [slot.key]: { ...d[slot.key], minimum: e.target.value } }))}
                  maxLength={PLAN_MAX_ITEM_LENGTH}
                  placeholder={`Minimum for ${slot.label.toLowerCase()} — else “${practice.minimum}”`}
                  aria-label={`Minimum for ${slot.label}`}
                  className="w-full mt-3 px-3 py-2 rounded-xl bg-transparent border border-white/[0.12] text-[13px] text-white/80 placeholder:text-white/25"
                />
              </div>
            )
          })}
        </div>

        {error && <p className="text-sm text-white/80 mt-3" role="alert">{error}</p>}

        <p className="text-[11px] text-white/35 mt-4 leading-relaxed">
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

      {showGuide && (
        <PracticeGuideSheet
          presetKey={practice.presetKey}
          label={practice.label}
          onClose={() => setShowGuide(false)}
        />
      )}

      {/* A swap replaces the text in the row and nothing else: the plan is
          still whatever they saved, and it still isn't saved until they
          press Save. */}
      {swapRow && swapping && (
        <MovementSheet
          movement={swapping}
          onSwap={replacement => {
            setItem(swapRow.slotKey, swapRow.index, { name: replacement.name })
            setSwapRow(null)
          }}
          onClose={() => setSwapRow(null)}
        />
      )}

      {/* Picking writes the name into the first empty row of that day, or
          adds a row if every one is used — so nothing they typed is ever
          overwritten by a tap. */}
      {pickingFor && (
        <MovementPicker
          onPick={movement => {
            const slotKey = pickingFor
            setDraft(d => {
              const slot = d[slotKey]
              const blank = slot.items.findIndex(item => !item.name.trim())
              if (blank >= 0) {
                const items = slot.items.map((item, i) =>
                  i === blank ? { ...item, name: movement.name } : item
                )
                return { ...d, [slotKey]: { ...slot, items } }
              }
              if (slot.items.length >= PLAN_MAX_ITEMS) return d
              return { ...d, [slotKey]: { ...slot, items: [...slot.items, { name: movement.name }] } }
            })
            setPickingFor(null)
          }}
          onClose={() => setPickingFor(null)}
        />
      )}
    </div>
  )
}
