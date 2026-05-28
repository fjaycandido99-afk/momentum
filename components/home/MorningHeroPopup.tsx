'use client'

/* ============================================================================
   Morning Hero Popup — the immersive hero served as a centered modal on the
   first app open of the morning. Frames the day's Morning Prime as a ritual
   you walk through, not a card you scroll past. Auto-dismisses for the day
   once the user begins the session or taps X (LocalStorage-keyed by date).

   Show conditions:
   - Local time is morning (5–10am).
   - Morning Prime hasn't been done today yet.
   - The popup hasn't already been dismissed today (per-day LocalStorage).

   The same ImmersiveHero component renders inside, so the design lives in
   one place — the popup just gives it the modal frame + backdrop.
   ============================================================================ */

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { ImmersiveHero } from './ImmersiveHero'

interface MorningHeroPopupProps {
  /** Has the user already completed Morning Prime today? */
  morningPrimeDone: boolean
  /** Triggered when the user taps the hero's Begin CTA — opens Daily Guide. */
  onBegin: () => void
}

const DISMISS_KEY = 'voxu.morning-hero.dismissed-on'

function isMorningLocal(): boolean {
  const h = new Date().getHours()
  return h >= 5 && h < 11
}

function todayLocalKey(): string {
  // YYYY-MM-DD in LOCAL time (not toISOString — that's UTC and would roll
  // the day at the wrong hour for non-UTC users).
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function MorningHeroPopup({ morningPrimeDone, onBegin }: MorningHeroPopupProps) {
  // Start closed; flip open after we've mounted + checked the conditions.
  // Mounting-gated so SSR never tries to read localStorage.
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (morningPrimeDone) return
    if (!isMorningLocal()) return
    try {
      if (localStorage.getItem(DISMISS_KEY) === todayLocalKey()) return
    } catch {
      /* localStorage unavailable — show anyway, it's harmless */
    }
    // Tiny delay so the popup doesn't crash into the initial page paint
    // / loading screen — feels like the app brought the ritual up *after*
    // it loaded rather than blocking on it.
    const t = setTimeout(() => setOpen(true), 700)
    return () => clearTimeout(t)
  }, [morningPrimeDone])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, todayLocalKey())
    } catch {
      /* fine — at worst the popup shows again next launch */
    }
    setOpen(false)
  }

  const handleBegin = () => {
    dismiss()
    onBegin()
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="This morning"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
    >
      {/* Tap-anywhere-to-dismiss backdrop. backdrop-blur softens the home
          behind it so the hero owns the focus. */}
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute inset-0 bg-black/75 backdrop-blur-xl cursor-default"
      />

      {/* Modal surface. Sized to the hero's natural width; on mobile it
          fills near-edge-to-edge with the safe-area padding. */}
      <div className="relative w-full max-w-xl rounded-3xl bg-black/70 border border-white/10 backdrop-blur-2xl shadow-[0_40px_120px_rgba(0,0,0,0.8)] overflow-hidden animate-fade-in-up">
        {/* Dismiss X — small, top-right, doesn't fight the hero composition */}
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 flex items-center justify-center transition-colors press-scale"
        >
          <X className="w-4 h-4 text-white/85" />
        </button>

        <ImmersiveHero
          session="morning_prime"
          isCompleted={false}
          onBegin={handleBegin}
        />
      </div>
    </div>,
    document.body,
  )
}
