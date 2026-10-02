'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, X } from 'lucide-react'
import { AchievementBadge, METAL, METAL_RGB } from '@/components/progress/AchievementBadge'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { ACHIEVEMENTS, getAchievementById } from '@/lib/achievements'
import { achievementLine } from '@/lib/achievement-lines'
import { chainFor, remainingLabel, SECRET_CLUES } from '@/lib/relic-paths'
import { MAX_EQUIPPED, type RelicsPayload } from '@/lib/relics'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export interface RelicStatus {
  id: string
  unlocked: boolean
  unlockedAt: string | null
  progress?: { current: number; target: number } | null
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * One relic, up close: the coin large, what it means, what it took, when it
 * was earned (or how far away it is), and its CHAIN — the same goal at every
 * threshold, with this one marked (lib/relic-paths). An earned relic can be
 * worn from here; it goes in the header and joins the three worn.
 *
 * Every word is the coin's own: its line, its real requirement. Nothing is
 * renamed or re-explained.
 */
export function RelicDetailSheet({
  id,
  statusOf,
  onClose,
}: {
  id: string
  /** Earned/progress state for any achievement id (for the chain). */
  statusOf: (id: string) => RelicStatus | undefined
  onClose: () => void
}) {
  const a = getAchievementById(id)
  const me = statusOf(id)
  const [busy, setBusy] = useState(false)
  const [worn, setWorn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!a || !me) return null

  const hiddenSecret = a.category === 'secret' && !me.unlocked
  // Retired coins still show in a chain for whoever holds them.
  const held = new Set(ACHIEVEMENTS.filter(x => x.retired && statusOf(x.id)?.unlocked).map(x => x.id))
  const chain = chainFor(id, held)
  const metal = METAL[a.rarity]

  const wear = async () => {
    setBusy(true)
    setError(null)
    try {
      const cur: RelicsPayload = await fetch('/api/relics', { cache: 'no-store' }).then(r => r.json())
      const equipped = [id, ...cur.equipped.filter(x => x !== id)].slice(0, MAX_EQUIPPED)
      const res = await fetch('/api/relics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featured: id, equipped }),
      })
      if (!res.ok) { setError('Couldn’t wear it. Try again.'); return }
      haptic('medium')
      setWorn(true)
    } catch {
      setError('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label={hiddenSecret ? 'Secret relic' : a.title}>
      <ScrollLock />
      <button className="absolute inset-0 bg-black/85 backdrop-blur-sm" aria-label="Close" onClick={onClose} />
      <div
        className="relative w-full md:max-w-[520px] max-h-[88dvh] overflow-y-auto overflow-x-hidden overscroll-contain rounded-t-3xl md:rounded-3xl bg-[#0b0b0b] border border-white/[0.12] px-5 pt-5"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex justify-end">
          <button onClick={onClose} aria-label="Close" className="tap-44 p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="flex flex-col items-center text-center -mt-2">
          <AchievementBadge id={a.id} category={a.category} icon={a.icon} rarity={a.rarity} unlocked={me.unlocked} plain size={176} />
          <h2 className="text-px-30 text-white leading-tight mt-5" style={{ ...SERIF, fontWeight: 600 }}>
            {hiddenSecret ? '???' : a.title}
          </h2>

          {hiddenSecret ? (
            <>
              <p className="text-px-11 uppercase tracking-[0.2em] text-white/60 mt-2">Secret</p>
              <p className="text-px-17 text-white/85 leading-snug mt-3 px-4" style={SERIF}>
                {SECRET_CLUES[a.id] ?? 'There’s another way to earn this. Keep exploring.'}
              </p>
            </>
          ) : (
            <>
              {achievementLine(a.id) && (
                <p className="text-px-18 text-white/90 leading-snug mt-2 px-4" style={SERIF}>{achievementLine(a.id)}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <span
                  className="px-2.5 py-1 rounded-full border text-px-11 uppercase tracking-[0.14em]"
                  style={{ color: `rgb(${METAL_RGB[metal]})`, borderColor: `rgb(${METAL_RGB[metal]} / 0.4)` }}
                >
                  {a.rarity}
                </span>
              </div>
              <p className="text-px-13 text-white/70 mt-3">{a.description}</p>
              {me.unlocked && me.unlockedAt ? (
                <p className="text-px-12 text-white/60 mt-1">Earned {longDate(me.unlockedAt)}</p>
              ) : me.progress && me.progress.current > 0 ? (
                <div className="w-full max-w-xs mt-3">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-[#d6aa76]/80" style={{ width: `${Math.round((me.progress.current / me.progress.target) * 100)}%` }} />
                  </div>
                  <p className="text-px-12 text-white/70 mt-1.5 tabular-nums">
                    {me.progress.current} / {me.progress.target} · {remainingLabel(a, me.progress)}
                  </p>
                </div>
              ) : (
                <p className="text-px-12 text-white/60 mt-1">Not earned yet</p>
              )}
            </>
          )}
        </div>

        {/* The chain: the same goal at every threshold, this one marked. */}
        {!hiddenSecret && chain.length > 1 && (
          <div className="mt-7">
            <p className="text-px-11 uppercase tracking-[0.2em] text-white/60">The path</p>
            <ol className="mt-3 flex gap-3 overflow-x-auto overflow-y-hidden pb-1 -mx-1 px-1" aria-label="This relic's chain">
              {chain.map(step => {
                const s = statusOf(step.id)
                const here = step.id === a.id
                return (
                  <li key={step.id} className="flex flex-col items-center gap-1.5 shrink-0 w-16" aria-current={here ? 'step' : undefined}>
                    <span className={`rounded-full ${here ? 'ring-2 ring-white/80 ring-offset-2 ring-offset-[#0b0b0b]' : ''}`}>
                      <AchievementBadge id={step.id} category={step.category} icon={step.icon} rarity={step.rarity} unlocked={!!s?.unlocked} plain size={48} />
                    </span>
                    <span className={`text-px-10 text-center leading-tight line-clamp-2 ${here ? 'text-white' : s?.unlocked ? 'text-white/80' : 'text-white/55'}`}>
                      {step.title}
                    </span>
                    <span className="sr-only">{s?.unlocked ? 'earned' : 'not earned'}</span>
                  </li>
                )
              })}
            </ol>
          </div>
        )}

        {error && <p className="text-px-12 text-white/75 mt-4 text-center" role="alert">{error}</p>}
        {me.unlocked && (
          <button
            onClick={wear}
            disabled={busy || worn}
            className="mt-6 w-full py-3.5 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : worn ? <Check className="w-4 h-4" /> : null}
            {worn ? 'Wearing it — in your header' : 'Wear this relic'}
          </button>
        )}
      </div>
    </div>,
    document.body,
  )
}
