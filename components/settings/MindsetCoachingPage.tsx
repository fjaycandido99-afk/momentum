'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AudioLines, BarChart3, BookOpen, Brain, ChevronDown, ChevronRight, Flame, Gauge, Heart, MessageSquare,
  Mic, Mountain, RefreshCw, RotateCcw, Shield, TextQuote, Wind, Zap, type LucideIcon,
} from 'lucide-react'
import { useMindset } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { MINDSET_VOICES } from '@/lib/mindset/voice-samples'
import { PORTRAIT_VERSION } from '@/components/mindset/MindsetSelectionScreen'
import { INTENSITIES, SITUATIONS, defaultStyle, type CoachStyle, type Situation } from '@/lib/coach/style'
import { ACCENT, ACCENT_TEXT, CARD, Toggle } from './DailyRhythmPage'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const TONE_LABEL: Record<string, string> = { calm: 'Calm', direct: 'Direct', neutral: 'Neutral' }
const TALK_VOICE_KEY = 'voxu.talk.voice'

const SITUATION_LOOK: Record<Situation['key'], { icon: LucideIcon; color: string; sub: string }> = {
  procrastinating: { icon: Zap, color: '#F5B941', sub: 'When something keeps slipping' },
  overwhelmed: { icon: Brain, color: '#B9A8FF', sub: 'When it’s all too much' },
  missed: { icon: RefreshCw, color: '#9CC3FF', sub: 'After a day you didn’t keep' },
  doubting: { icon: Heart, color: '#F2557A', sub: 'When your confidence dips' },
  doing_well: { icon: BarChart3, color: '#5B8CFF', sub: 'When things are going right' },
}
const PRINCIPLE_ICONS: LucideIcon[] = [Mountain, Shield, Wind, Flame]

function Label({ children }: { children: ReactNode }) {
  return <p className="mt-7 mb-2 px-1 text-px-11 tracking-[0.22em] uppercase text-white/55">{children}</p>
}

function Row({ icon: Icon, color, title, sub, right, href, onClick }: { icon: LucideIcon; color?: string; title: string; sub?: string; right?: ReactNode; href?: string; onClick?: () => void }) {
  const inner = (
    <>
      <Icon className="w-5 h-5 shrink-0" style={{ color: color ?? 'rgba(255,255,255,0.75)' }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-px-15 text-white leading-snug">{title}</span>
        {sub && <span className="block text-px-12 text-white/55 leading-snug">{sub}</span>}
      </span>
      {right}
    </>
  )
  const cls = 'w-full flex items-center gap-3.5 px-4 py-3.5 text-left active:bg-white/[0.04]'
  if (href) return <Link href={href} className={cls}>{inner}</Link>
  if (onClick) return <button type="button" onClick={onClick} className={cls}>{inner}</button>
  return <div className={cls}>{inner}</div>
}

const Chevron = () => <ChevronRight className="w-4 h-4 shrink-0 text-white/35" aria-hidden />

/**
 * Settings › Mindset & Coaching — Francis's "Mindset Coaching Night" mockup.
 * Every choice reaches the coach's prompts (lib/coach/style says where).
 * Order: your coach → respond when… → intensity → voice & communication →
 * philosophy → reset.
 */
export function MindsetCoachingPage() {
  const router = useRouter()
  const { mindset } = useMindset()
  const [style, setStyle] = useState<CoachStyle | null>(null)
  const [tone, setTone] = useState('calm')
  const [autoplay, setAutoplay] = useState(true)
  const [open, setOpen] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try { setAutoplay(localStorage.getItem(TALK_VOICE_KEY) !== 'off') } catch { /* default on */ }
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
      {/* Your coach */}
      <p className="mb-2 px-1 text-px-11 tracking-[0.22em] uppercase text-white/55">Your coach</p>
      <div className={`${CARD} relative overflow-hidden flex min-h-[11rem]`}>
        <div className="relative w-[32%] shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/portraits/cards/${mindset}.jpg?v=${PORTRAIT_VERSION}`} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover object-[50%_25%] grayscale" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#0a1019]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 py-4 pr-4 pl-1">
          <p className="text-px-28 text-white leading-none" style={{ ...SERIF, fontWeight: 600 }}>{config.coachName}</p>
          <p className="mt-1.5 text-px-13 text-white/70">{config.name} · {TONE_LABEL[tone] ?? 'Calm'} · {intensity.title}</p>
          <p className="mt-2 text-px-13 text-white/80 leading-snug">{config.description}</p>
          <Link href="/mindset-selection" className="tap-44 mt-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-px-13 text-white border whitespace-nowrap" style={{ borderColor: ACCENT, background: `${ACCENT}26` }}>
            Change philosophy <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* How Voxu should respond when… */}
      <Label>How Voxu should respond when…</Label>
      <div className={`${CARD} overflow-hidden divide-y divide-white/[0.06]`}>
        {SITUATIONS.map(s => {
          const look = SITUATION_LOOK[s.key]
          const chosen = s.options.find(o => o.key === style.responses[s.key]) ?? s.options[0]
          const isOpen = open === s.key
          return (
            <div key={s.key}>
              <button onClick={() => setOpen(isOpen ? null : s.key)} aria-expanded={isOpen} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
                <look.icon className="w-5 h-5 shrink-0" style={{ color: look.color }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-px-15 text-white leading-snug">{s.title}</span>
                  <span className="block text-px-12 text-white/50 leading-snug">{look.sub}</span>
                  {/* The answer sits under the question, so it never squeezes it at 320px. */}
                  <span className="mt-1.5 inline-block px-2.5 py-1 rounded-lg bg-white/[0.08] text-px-12 text-white">{chosen.label}</span>
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4 shrink-0 text-white/35 rotate-180" aria-hidden /> : <Chevron />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 -mt-1 pl-12 flex flex-wrap gap-2" role="radiogroup" aria-label={s.title}>
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
      </div>

      {/* Coaching intensity */}
      <Label>Coaching intensity</Label>
      <div className={`${CARD} overflow-hidden divide-y divide-white/[0.06]`}>
        <div className="px-4 py-3.5">
          <p className="flex items-center gap-3 text-px-15 text-white"><Gauge className="w-5 h-5 text-[#F5B941]" aria-hidden /> How hard should Voxu push you?</p>
          <div role="radiogroup" aria-label="Coaching intensity" className="mt-3 grid grid-cols-3 gap-2">
            {INTENSITIES.map(i => {
              const on = i.key === style.intensity
              return (
                <button key={i.key} role="radio" aria-checked={on} onClick={() => { haptic('light'); save({ ...style, intensity: i.key }) }}
                  className={`tap-44 py-3 px-1.5 rounded-xl text-center ${on ? 'text-white' : 'text-white/70 bg-white/[0.04]'}`}
                  style={on ? { background: ACCENT, boxShadow: `0 0 18px ${ACCENT}55` } : undefined}>
                  <span className="block text-px-15 font-medium">{i.title}</span>
                  <span className={`block text-px-11 leading-tight mt-0.5 ${on ? 'text-white/85' : 'text-white/45'}`}>{i.line}</span>
                </button>
              )
            })}
          </div>
        </div>
        <Row icon={Flame} color="#F2557A" title="Call out my excuses" sub="Kindly, but plainly — then ask what you’ll do instead"
          right={<Toggle on={style.callout} label="Call out my excuses" onChange={v => save({ ...style, callout: v })} />} />
      </div>
      {note && <p className="mt-3 px-1 text-px-13 text-white/75" role="status">{note}</p>}

      {/* Voice & communication */}
      <Label>Voice &amp; communication</Label>
      <div className={`${CARD} overflow-hidden divide-y divide-white/[0.06]`}>
        <Row icon={Mic} title="Voice" sub="Voxu" href="/settings?s=voice" right={<Chevron />} />
        <Row icon={MessageSquare} title="Tone" sub={TONE_LABEL[tone] ?? 'Calm'} href="/settings?s=voice" right={<Chevron />} />
        <Row icon={TextQuote} title="Response length" sub={style.length === 'short' ? 'Short' : 'Normal'}
          onClick={() => { haptic('light'); save({ ...style, length: style.length === 'short' ? 'normal' : 'short' }) }}
          right={<span className="text-px-12" style={{ color: ACCENT_TEXT }}>Tap to switch</span>} />
        <Row icon={AudioLines} title="Auto-play responses" sub="Voxu speaks its replies in Talk"
          right={<Toggle on={autoplay} label="Auto-play responses" onChange={v => { setAutoplay(v); try { localStorage.setItem(TALK_VOICE_KEY, v ? 'on' : 'off') } catch { /* ignore */ } }} />} />
      </div>

      {/* Your philosophy */}
      <Label>Your philosophy</Label>
      <div className={`${CARD} overflow-hidden`}>
        <Link href={`/mindset-selection/${mindset}`} className="flex items-center gap-3.5 px-4 py-4 active:bg-white/[0.04]">
          <span className="min-w-0 flex-1">
            <span className="block text-px-20 text-white leading-tight" style={{ ...SERIF, fontWeight: 600 }}>{config.name}</span>
            <span className="block text-px-13 text-white/65">{config.subtitle}.</span>
          </span>
          <Chevron />
        </Link>
        <div className="px-3 pb-3 grid grid-cols-4 gap-2">
          {detail.principles.slice(0, 4).map((pr, i) => {
            const Icon = PRINCIPLE_ICONS[i % PRINCIPLE_ICONS.length]
            return (
              <div key={pr.title} className="rounded-xl bg-white/[0.04] border border-white/[0.06] px-1.5 py-2.5 text-center">
                <Icon className="w-5 h-5 mx-auto" style={{ color: i === 0 ? ACCENT_TEXT : 'rgba(255,255,255,0.8)' }} aria-hidden />
                <p className="mt-1.5 text-px-11 text-white/85 leading-tight">{pr.title}</p>
              </div>
            )
          })}
        </div>
        <div className="mx-3 mb-3 rounded-xl bg-white/[0.04] border border-white/[0.06] p-3.5 flex gap-3">
          <BookOpen className="w-5 h-5 shrink-0 text-white/70 mt-0.5" aria-hidden />
          <div>
            <p className="text-px-14 text-white">How Voxu uses this</p>
            <p className="mt-0.5 text-px-12 text-white/65 leading-relaxed">Your coach&rsquo;s replies, recaps and reflections speak in this voice — {voice.tagline.toLowerCase()}. Answering a promise to start something hard:</p>
            <p className="mt-1.5 text-px-14 text-white/90 italic leading-snug" style={SERIF}>&ldquo;{voice.reply}&rdquo;</p>
          </div>
        </div>
      </div>

      {/* Reset — a quiet, red-tinted row */}
      {!confirmReset ? (
        <button onClick={() => setConfirmReset(true)} className="mt-6 w-full flex items-center gap-3.5 px-4 py-3.5 rounded-2xl border border-red-400/20 bg-red-500/[0.08] text-left">
          <span className="w-9 h-9 shrink-0 rounded-full bg-red-500/15 flex items-center justify-center"><RotateCcw className="w-4 h-4 text-red-300" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-px-15 text-red-200">Reset coaching setup</span>
            <span className="block text-px-12 text-white/55">Start over with a new philosophy and preferences</span>
          </span>
          <Chevron />
        </button>
      ) : (
        <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-500/[0.08] p-4">
          <p className="text-px-15 text-white">Start over?</p>
          <p className="mt-1 text-px-12 text-white/65 leading-snug">Your coaching choices go back to the defaults and you pick a philosophy again. Your eras, journal and record stay exactly as they are.</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setConfirmReset(false)} className="tap-44 flex-1 py-2.5 rounded-full border border-white/20 text-px-13 text-white">Keep my setup</button>
            <button onClick={async () => { await save(defaultStyle(), true); router.push('/mindset-selection') }}
              className="tap-44 flex-1 py-2.5 rounded-full text-px-13 text-white bg-red-500/30 border border-red-400/40">Reset</button>
          </div>
        </div>
      )}
    </div>
  )
}
