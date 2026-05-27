'use client'

import { useState } from 'react'
import { Sparkles, Loader2, ArrowRight } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS, getCoachName } from '@/lib/mindset/configs'
import { getDailyMindsetQuote } from '@/lib/mindset/quotes'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { authFetch } from '@/lib/auth-fetch'

// First-run activation — the magic moment. Shown once: a coach-voiced welcome +
// first wisdom, then ONE tiny prompt whose payoff is an instant AI reflection
// (free for the first entries). Within ~60s a new user has been *seen* by the
// coach — and seeded their first journal entry + reflection, so the home
// continuity card and streak start populated. Shown once per device.
const KEY = 'voxu_first_moment_done_v1'
type Stage = 'welcome' | 'prompt' | 'reflecting' | 'reflected'

export function FirstMomentOverlay() {
  const mindsetCtx = useMindsetOptional()
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem(KEY) === '1'
  })
  const [stage, setStage] = useState<Stage>('welcome')
  const [text, setText] = useState('')
  const [reflection, setReflection] = useState<string | null>(null)

  if (hidden || !mindsetCtx?.mindset) return null

  const mindset = mindsetCtx.mindset
  const name = MINDSET_CONFIGS[mindset]?.name || 'your'
  const coach = getCoachName(mindset)
  const todayStr = new Date().toISOString().split('T')[0]
  const quote = getDailyMindsetQuote(mindset, todayStr)

  const finish = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setHidden(true) }

  const reflect = async () => {
    if (!text.trim()) { finish(); return }
    setStage('reflecting')
    try {
      const res = await authFetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: todayStr, journal_freetext: text.trim() }),
      })
      const data = await res.json().catch(() => null)
      setReflection(data?.data?.journal_ai_reflection || null)
    } catch { /* graceful — show the warm fallback */ }
    setStage('reflected')
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black flex flex-col items-center justify-center px-7 animate-fade-in">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full bg-white/[0.06] blur-3xl pointer-events-none animate-breathe" aria-hidden />

      <div className="relative w-full max-w-sm">
        {stage === 'welcome' && (
          <div className="text-center animate-fade-in-up">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.12] grid place-items-center mb-5">
              <MindsetIcon mindsetId={mindset} className="w-7 h-7 text-white" />
            </div>
            <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">A moment to begin</p>
            <h1 className="text-2xl font-bold text-white mt-2 tracking-tight">I&rsquo;m {coach}.</h1>
            <p className="text-sm text-white/70 mt-2 leading-relaxed">Your guide on the {name} path. Before the noise, one quiet moment.</p>
            {quote && (
              <>
                <p className="text-base italic text-white/85 mt-6 leading-relaxed">&ldquo;{quote.text}&rdquo;</p>
                <p className="text-xs text-white/45 mt-2">— {quote.author}</p>
              </>
            )}
            <button onClick={() => setStage('prompt')} className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-medium press-scale">
              Begin <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {stage === 'prompt' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white/60" />
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">First moment</span>
            </div>
            <h2 className="text-xl font-bold text-white text-center mt-3 tracking-tight">What&rsquo;s on your mind right now?</h2>
            <p className="text-sm text-white/60 text-center mt-2">A sentence is enough — {coach} will reflect it back.</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              autoFocus
              rows={3}
              placeholder="Right now I&rsquo;m…"
              maxLength={500}
              className="mt-5 w-full bg-white/[0.04] border border-white/15 rounded-2xl p-4 text-white text-base placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
            />
            <button onClick={reflect} className="mt-4 w-full py-3 rounded-2xl bg-white text-black text-sm font-medium press-scale">
              {text.trim() ? 'Reflect on this' : 'Skip for now'}
            </button>
          </div>
        )}

        {stage === 'reflecting' && (
          <div className="text-center animate-fade-in">
            <Loader2 className="w-6 h-6 text-white/70 animate-spin mx-auto" />
            <p className="text-sm text-white/60 mt-4">Reading your words…</p>
          </div>
        )}

        {stage === 'reflected' && (
          <div className="text-center animate-fade-in-up">
            <div className="flex items-center gap-2 justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white/60" />
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">{coach}</span>
            </div>
            {reflection ? (
              <p className="text-lg text-white mt-4 leading-relaxed italic">&ldquo;{reflection}&rdquo;</p>
            ) : (
              <p className="text-lg text-white mt-4 leading-relaxed">Whenever you&rsquo;re ready, I&rsquo;m here. This is your space.</p>
            )}
            <button onClick={finish} className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black text-sm font-medium press-scale">
              Enter Voxu <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {(stage === 'welcome' || stage === 'prompt') && (
        <button onClick={finish} className="absolute bottom-8 text-xs text-white/40 hover:text-white/70 transition-colors">Skip</button>
      )}
    </div>
  )
}
