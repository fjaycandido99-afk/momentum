'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AudioLines, ChevronDown, ChevronRight, Compass, Flame, MessageSquareQuote, RotateCcw, type LucideIcon } from 'lucide-react'
import { useMindset } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { MINDSET_VOICES } from '@/lib/mindset/voice-samples'
import { PORTRAIT_VERSION } from '@/components/mindset/MindsetSelectionScreen'
import { INTENSITIES, SITUATIONS, defaultStyle, type CoachStyle } from '@/lib/coach/style'
import { ACCENT, Section, Toggle } from './DailyRhythmPage'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const CARD = 'rounded-2xl border border-white/[0.08] bg-[#0b1020]/85 backdrop-blur-sm'
const TONE_LABEL: Record<string, string> = { calm: 'Calm', direct: 'Direct', neutral: 'Neutral' }

function Pills<T extends string>({ options, value, onChange, label }: { options: { key: T; label: string; sub?: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1 p-1 rounded-xl bg-black/30 border border-white/[0.06]" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map(o => {
        const on = o.key === value
        return (
          <button key={o.key} role="radio" aria-checked={on} onClick={() => { haptic('light'); onChange(o.key) }}
            className={`tap-44 py-2 px-1 rounded-lg text-center ${on ? 'text-white' : 'text-white/65'}`}
            style={on ? { background: ACCENT } : undefined}>
            <span className="block text-px-13 font-medium">{o.label}</span>
            {o.sub && <span className={`block text-px-10 leading-tight ${on ? 'text-white/85' : 'text-white/45'}`}>{o.sub}</span>}
          </button>
        )
      })}
    </div>
  )
}

function LinkRow({ icon: Icon, title, value, href }: { icon: LucideIcon; title: string; value?: string; href: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.04]">
      <Icon className="w-5 h-5 shrink-0 text-white/70" aria-hidden />
      <span className="flex-1 text-px-15 text-white">{title}</span>
      {value && <span className="text-px-13 text-white/55">{value}</span>}
      <ChevronRight className="w-4 h-4 text-white/35" aria-hidden />
    </Link>
  )
}

/**
 * Settings › Mindset & Coaching — configuring your mentor, not one setting.
 * Every choice reaches the coach's prompts (lib/coach/style says where).
 * Order: current coach → how to respond → intensity → philosophy → reset.
 */
export function MindsetCoachingPage() {
  const router = useRouter()
  const { mindset } = useMindset()
  const [style, setStyle] = useState<CoachStyle | null>(null)
  const [tone, setTone] = useState('calm')
  const [open, setOpen] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    fetch('/api/coach/style', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => { setStyle(d?.style ?? defaultStyle()); if (d?.tone) setTone(d.tone) })
      .catch(() => setStyle(defaultStyle()))
  }, [])

  const save = (next: CoachStyle, now = false) => {
    setStyle(next)
    if (timer.current) clearTimeout(timer.current)
    const go = () => fetch('/api/coach/style', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ style: next }) })
      .then(r => setNote(r.ok ? null : r.status === 401 ? 'Save your account to keep your coaching choices.' : 'Couldn’t save that. Try again.'))
      .catch(() => setNote('Couldn’t reach Voxu. Check your connection.'))
    if (now) return go()
    timer.current = setTimeout(go, 400)
  }

  const config = MINDSET_CONFIGS[mindset]
  const detail = MINDSET_DETAILS[mindset]
  const voice = MINDSET_VOICES[mindset]
  if (!style) return <div className="h-40" aria-busy="true" />
  const intensity = INTENSITIES.find(i => i.key === style.intensity)!

  return (
    <div className="pb-8">

      {/* Current coach */}
      <div className={`${CARD} relative overflow-hidden`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/portraits/cards/${mindset}.jpg?v=${PORTRAIT_VERSION}`} alt="" aria-hidden className="absolute right-0 top-0 h-full w-[55%] object-cover object-[50%_30%] grayscale opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1020] via-[#0b1020]/80 to-[#0b1020]/10" aria-hidden />
        <div className="relative p-4 pr-[38%]">
          <p className="text-px-10 tracking-[0.24em] uppercase" style={{ color: ACCENT }}>Your coach</p>
          <p className="mt-1 text-px-30 text-white leading-none uppercase" style={{ ...SERIF, fontWeight: 600 }}>{config.coachName}</p>
          <p className="mt-1.5 text-px-12 text-white/65">{config.name} · {TONE_LABEL[tone] ?? 'Calm'} · {intensity.title}</p>
          <p className="mt-2 text-px-13 text-white/80 leading-snug">{config.description}</p>
          <Link href="/mindset-selection" className="tap-44 mt-3 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-white/20 text-px-13 text-white">
            Change philosophy <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* How should Voxu respond when… */}
      <Section icon={MessageSquareQuote} title="How should Voxu respond when…" sub="Tap one to choose.">
        {SITUATIONS.map(s => {
          const chosen = s.options.find(o => o.key === style.responses[s.key]) ?? s.options[0]
          const isOpen = open === s.key
          return (
            <div key={s.key}>
              <button onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <span className="flex-1 text-px-15 text-white">{s.title}</span>
                <span className="text-px-13 font-medium text-right" style={{ color: ACCENT }}>{chosen.label}</span>
                <ChevronDown className={`w-4 h-4 text-white/35 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 -mt-1 flex flex-wrap gap-2" role="radiogroup" aria-label={s.title}>
                  {s.options.map(o => {
                    const on = o.key === chosen.key
                    return (
                      <button key={o.key} role="radio" aria-checked={on}
                        onClick={() => { haptic('light'); save({ ...style, responses: { ...style.responses, [s.key]: o.key } }); setOpen(null) }}
                        className={`tap-44 px-3.5 py-2 rounded-full text-px-13 border ${on ? 'text-white border-transparent' : 'text-white/75 border-white/15'}`}
                        style={on ? { background: ACCENT } : undefined}>
                        {o.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </Section>

      {/* Intensity */}
      <Section icon={Flame} title="How hard should Voxu push?" sub="Applies to Talk, your journal and promise replies.">
        <div className="px-4 py-3.5">
          <Pills label="Coaching intensity" value={style.intensity} onChange={v => save({ ...style, intensity: v })}
            options={INTENSITIES.map(i => ({ key: i.key, label: i.title, sub: i.line }))} />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="min-w-0 flex-1">
            <span className="block text-px-15 text-white">Call out my excuses</span>
            <span className="block text-px-12 text-white/50">Kindly, but plainly — then ask what you&rsquo;ll do instead</span>
          </span>
          <Toggle on={style.callout} label="Call out my excuses" onChange={v => save({ ...style, callout: v })} />
        </div>
        <div className="px-4 py-3.5">
          <p className="text-px-15 text-white mb-2">Response length</p>
          <Pills label="Response length" value={style.length} onChange={v => save({ ...style, length: v })}
            options={[{ key: 'short', label: 'Short' }, { key: 'normal', label: 'Normal' }]} />
        </div>
        <LinkRow icon={AudioLines} title="Voice & tone" value={TONE_LABEL[tone]} href="/settings?s=voice" />
      </Section>
      {note && <p className="mt-3 px-1 text-px-13 text-white/75" role="status">{note}</p>}

      {/* Philosophy */}
      <Section icon={Compass} title="Your philosophy" sub={config.name}>
        <div className="px-4 py-4">
          <p className="text-px-13 text-white/75 leading-relaxed">{config.subtitle}.</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {detail.principles.slice(0, 4).map(pr => (
              <span key={pr.title} className="px-2.5 py-1 rounded-full text-px-12 text-white/85 border border-white/12 bg-white/[0.04]">{pr.title}</span>
            ))}
          </div>
          <p className="mt-4 text-px-11 tracking-[0.2em] uppercase text-white/45">How Voxu uses this</p>
          <p className="mt-1 text-px-13 text-white/70 leading-relaxed">Your coach&rsquo;s replies, recaps and reflections speak in this voice — {voice.tagline.toLowerCase()}. Answering a promise to start something hard, it sounds like:</p>
          <p className="mt-2 pl-3 border-l-2 text-px-15 text-white/90 italic leading-snug" style={{ ...SERIF, borderColor: ACCENT }}>&ldquo;{voice.reply}&rdquo;</p>
        </div>
      </Section>

      {/* Reset — deliberately quiet */}
      <div className="mt-8 px-1">
        {!confirmReset ? (
          <button onClick={() => setConfirmReset(true)} className="tap-44 inline-flex items-center gap-2 text-px-13 text-white/55">
            <RotateCcw className="w-4 h-4" /> Reset coaching setup
          </button>
        ) : (
          <div className={`${CARD} p-4`}>
            <p className="text-px-14 text-white">Start over?</p>
            <p className="mt-1 text-px-12 text-white/60 leading-snug">Your coaching choices go back to the defaults and you pick a philosophy again. Your eras, journal and record stay exactly as they are.</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="tap-44 flex-1 py-2.5 rounded-full border border-white/20 text-px-13 text-white">Keep my setup</button>
              <button onClick={async () => { await save(defaultStyle(), true); router.push('/mindset-selection') }}
                className="tap-44 flex-1 py-2.5 rounded-full text-px-13 text-white border border-red-400/40 bg-red-500/10">Reset</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
