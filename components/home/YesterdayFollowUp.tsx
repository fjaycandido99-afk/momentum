'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, Wind, PenLine, ChevronRight, X, Check } from 'lucide-react'
import { authFetch } from '@/lib/auth-fetch'
import { useReset } from '@/contexts/ResetContext'

// "Coach remembers you" — the continuity hook. On open, it looks at YESTERDAY's
// entry and follows up: the intention you set, a low mood you logged, or a
// reflection you wrote. This is what turns the app from a tool into a coach that
// knows you. Renders nothing when there's no yesterday to follow up on, and
// dismisses for the day once acted on (so it never nags).

const LOW_MOODS = new Set(['awful', 'low'])
const MOOD_LABEL: Record<string, string> = {
  awful: 'low', low: 'low', okay: 'okay', good: 'good', great: 'great', medium: 'okay', high: 'great',
}

type FollowUp =
  | { kind: 'intention'; text: string }
  | { kind: 'mood'; moodLabel: string }
  | { kind: 'reflected' }

function dateStr(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().split('T')[0]
}

export function YesterdayFollowUp() {
  const { openReset } = useReset()
  const [followUp, setFollowUp] = useState<FollowUp | null>(null)
  const [hidden, setHidden] = useState(true)
  const [ackMsg, setAckMsg] = useState<string | null>(null)

  const ackKey = `voxu_yesterday_ack_${dateStr(0)}`

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(ackKey)) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch(`/api/daily-guide/journal?date=${dateStr(-1)}`)
        if (!res.ok || cancelled) return
        const d = await res.json()
        const intention: string | null = (d.daily_intention || d.journal_intention || '') || null
        const mood: string | null = d.journal_mood || null
        const reflected = !!(d.journal_freetext || d.journal_win || d.journal_gratitude || d.journal_conversation || d.journal_dream)

        if (intention && intention.trim()) setFollowUp({ kind: 'intention', text: intention.trim() })
        else if (mood && LOW_MOODS.has(mood)) setFollowUp({ kind: 'mood', moodLabel: MOOD_LABEL[mood] || 'low' })
        else if (reflected) setFollowUp({ kind: 'reflected' })

        if (!cancelled) setHidden(false)
      } catch { /* no-op — just don't show the card */ }
    })()
    return () => { cancelled = true }
  }, [ackKey])

  const persistDismiss = () => { try { localStorage.setItem(ackKey, '1') } catch {} }
  const dismiss = () => { persistDismiss(); setHidden(true) }
  const ackThenDismiss = (msg: string) => {
    setAckMsg(msg)
    persistDismiss()
    setTimeout(() => setHidden(true), 2000)
  }

  if (hidden || !followUp) return null

  return (
    <div className="px-6 mb-4">
      <div className="relative p-5 card-surface-lg overflow-hidden animate-fade-in-up">
        {/* soft ambient glow — monochrome */}
        <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-white/[0.05] blur-3xl pointer-events-none" aria-hidden />

        {!ackMsg && (
          <button onClick={dismiss} aria-label="Dismiss" className="absolute top-3 right-3 p-1 rounded-full text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-white/60" />
            <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">Yesterday</span>
          </div>

          {ackMsg ? (
            <div className="mt-3 flex items-center gap-2.5 animate-fade-in">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.12]">
                <Check className="w-4 h-4 text-white" />
              </div>
              <p className="text-[15px] text-white leading-snug">{ackMsg}</p>
            </div>
          ) : followUp.kind === 'intention' ? (
            <>
              <p className="mt-3 text-[15px] text-white/90 leading-snug">
                You set out to <span className="text-white font-medium">&ldquo;{followUp.text}&rdquo;</span>. How&rsquo;d it go?
              </p>
              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => ackThenDismiss('Love that — momentum is everything. Keep it rolling today.')}
                  className="flex-1 py-2.5 rounded-xl bg-white text-black text-sm font-medium press-scale"
                >
                  Nailed it
                </button>
                <button
                  onClick={() => ackThenDismiss('No worries — today is a clean slate. Let’s set a fresh intention.')}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.08] border border-white/15 text-white text-sm font-medium press-scale"
                >
                  Not today
                </button>
              </div>
            </>
          ) : followUp.kind === 'mood' ? (
            <>
              <p className="mt-3 text-[15px] text-white/90 leading-snug">
                You were feeling <span className="text-white font-medium">{followUp.moodLabel}</span> yesterday. Want to journal about today?
              </p>
              <Link
                href="/journal"
                onClick={dismiss}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/15 text-white text-sm font-medium press-scale"
              >
                Open journal
              </Link>
            </>
          ) : (
            <>
              <p className="mt-3 text-[15px] text-white/90 leading-snug">
                You took a moment to reflect yesterday. Pick up where you left off?
              </p>
              <Link
                href="/journal"
                onClick={dismiss}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/15 text-white text-sm font-medium press-scale"
              >
                <PenLine className="w-4 h-4" /> Open your journal <ChevronRight className="w-4 h-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
