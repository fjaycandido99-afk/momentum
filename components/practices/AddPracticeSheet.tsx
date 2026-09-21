'use client'

import { useState } from 'react'
import { ChevronLeft, Loader2, X } from 'lucide-react'
import {
  DOMAINS,
  PRACTICE_LIMITS,
  PRESETS_BY_KEY,
  presetsForDomain,
  type PracticeDomain,
} from '@/lib/practices/presets'
import { daysLabel } from '@/lib/practices/logic'
import { BLOCKERS } from '@/lib/era/reasons'
import { domainArt } from '@/lib/practices/domain-art'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const DAY_NAMES = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * Adding a practice: domain, then preset, then the two things that matter —
 * which days, and the smallest version that still counts.
 *
 * Three taps to a working practice, and the floor is the only thing anyone
 * has to type. The skip reason at the end is optional and reuses the era's
 * BLOCKERS list, so a skipped practice and a missed promise can be counted
 * together instead of in two private vocabularies.
 */
export function AddPracticeSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: () => void
}) {
  const [domain, setDomain] = useState<PracticeDomain | null>(null)
  const [presetKey, setPresetKey] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [minimum, setMinimum] = useState('')
  const [days, setDays] = useState<number[]>([])
  const [blocker, setBlocker] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const preset = presetKey ? PRESETS_BY_KEY.get(presetKey) ?? null : null

  const choosePreset = (key: string) => {
    haptic('light')
    const p = PRESETS_BY_KEY.get(key)
    setPresetKey(key)
    setLabel(p?.key === 'custom' ? '' : p?.label ?? '')
    setMinimum(p?.minimum ?? '')
    setDays(p?.days ?? [])
    setError(null)
  }

  const toggleDay = (d: number) => {
    haptic('light')
    setDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()))
  }

  const save = async () => {
    if (!presetKey) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/practices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', presetKey, label, minimum, days, blocker }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setError(data?.error ?? 'Could not add that')
        return
      }
      haptic('medium')
      onAdded()
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
      aria-label="Add a practice"
    >
      <button className="flex-1" aria-label="Close" onClick={onClose} />
      <div
        className="rounded-t-3xl border-t border-white/15 bg-[#0b0b0b] px-5 pt-5 max-h-[88vh] overflow-y-auto overflow-x-hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {(domain || presetKey) && (
              <button
                onClick={() => (presetKey ? setPresetKey(null) : setDomain(null))}
                aria-label="Back"
                className="p-1.5 rounded-full hover:bg-white/10"
              >
                <ChevronLeft className="w-4 h-4 text-white/70" />
              </button>
            )}
            <div>
              <p className="text-[10px] tracking-[0.24em] uppercase text-white/45">Add a practice</p>
              <h2 className="text-[24px] text-white leading-tight mt-1" style={{ ...SERIF, fontWeight: 600 }}>
                {!domain ? 'What do you already care about?' : !preset ? 'How often?' : 'What counts as done?'}
              </h2>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 shrink-0">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {!domain && (
          <>
            <p className="text-sm text-white/60 leading-relaxed mt-3">
              Voxu doesn&rsquo;t replace your gym app or your books. It keeps you consistent with them.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {DOMAINS.map(d => {
                const art = domainArt(d.id)
                return (
                  <button
                    key={d.id}
                    onClick={() => { haptic('light'); setDomain(d.id) }}
                    className="rounded-xl border border-white/15 hover:bg-white/[0.06] overflow-hidden text-left"
                  >
                    {/* The room, where there's a shot of it. A domain
                        without art gets height instead of a stand-in, so
                        the grid stays even. */}
                    {art ? (
                      <span className="block aspect-[16/9] relative">
                        <img src={art} alt="" aria-hidden className="w-full h-full object-cover" loading="lazy" />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                      </span>
                    ) : (
                      <span className="block aspect-[16/9] bg-white/[0.03]" />
                    )}
                    <span className="block px-3 py-2.5 text-sm text-white">{d.label}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}

        {domain && !preset && domainArt(domain) && (
          <div className="mt-4 rounded-xl overflow-hidden border border-white/[0.1]">
            <img
              src={domainArt(domain)!}
              alt=""
              aria-hidden
              className="w-full aspect-[16/7] object-cover"
              loading="lazy"
            />
          </div>
        )}

        {domain && !preset && (
          <div className="mt-4 space-y-2">
            {presetsForDomain(domain).map(p => (
              <button
                key={p.key}
                onClick={() => choosePreset(p.key)}
                className="w-full text-left p-3.5 rounded-xl border border-white/15 hover:bg-white/[0.06]"
              >
                <p className="text-[15px] text-white leading-snug">{p.label}</p>
                <p className="text-[12px] text-white/50 mt-1">
                  {daysLabel(p.days)}
                  {p.minimum ? ` · minimum ${p.minimum}` : ''}
                </p>
                <p className="text-[12px] text-white/40 mt-1">{p.hint}</p>
              </button>
            ))}
          </div>
        )}

        {preset && (
          <div className="mt-4 space-y-5">
            <div>
              <label htmlFor="practice-label" className="block text-[11px] uppercase tracking-[0.2em] text-white/45">
                Call it
              </label>
              <input
                id="practice-label"
                value={label}
                onChange={e => setLabel(e.target.value)}
                maxLength={PRACTICE_LIMITS.label}
                placeholder={preset.key === 'custom' ? 'Piano, cold showers, Spanish…' : preset.label}
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/30"
              />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">Which days</p>
              <div className="flex gap-1.5 mt-2">
                {DAY_NAMES.map((name, d) => {
                  const on = days.length === 0 || days.includes(d)
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      aria-pressed={on}
                      className={`flex-1 py-2.5 rounded-xl border text-[13px] ${
                        on ? 'bg-white text-black border-white font-medium' : 'border-white/15 text-white/60'
                      }`}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-white/40 mt-2">{daysLabel(days)}</p>
            </div>

            <div>
              <label htmlFor="practice-min" className="block text-[11px] uppercase tracking-[0.2em] text-white/45">
                Minimum that still counts
              </label>
              <input
                id="practice-min"
                value={minimum}
                onChange={e => setMinimum(e.target.value)}
                maxLength={PRACTICE_LIMITS.minimum}
                placeholder="20 minutes"
                className="w-full mt-2 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-[15px] text-white placeholder:text-white/30"
              />
              {/* The floor is the point: set it now, calmly, so the tired
                  version of you has something to obey instead of decide. */}
              <p className="text-[12px] text-white/45 mt-2 leading-relaxed">
                On the days you don&rsquo;t want to, Voxu asks for this and nothing more.
              </p>
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                What usually makes you skip? <span className="text-white/30">Optional</span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {BLOCKERS.map(b => (
                  <button
                    key={b.key}
                    onClick={() => { haptic('light'); setBlocker(blocker === b.key ? null : b.key) }}
                    className={`text-[13px] rounded-full px-3 py-1.5 border ${
                      blocker === b.key ? 'bg-white text-black border-white' : 'border-white/15 text-white/70'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-white/80" role="alert">{error}</p>}

            <button
              onClick={save}
              disabled={busy}
              className="w-full py-3.5 rounded-xl bg-white text-black text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              Add this practice
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
