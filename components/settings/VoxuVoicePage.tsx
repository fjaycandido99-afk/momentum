'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Loader2, Play, Square } from 'lucide-react'
import { SpeakingRing } from '@/components/voice-guide/SpeakingRing'
import { COACH_PREFS, type CoachPrefKey } from '@/lib/voice/coach-prefs'
import { VOICE_RATES, voiceRate, setVoiceRate, fetchVoxuAudio, sharedVoxuPlayer, installVoxuUnlock } from '@/lib/voice/voxu-audio'
import { haptic } from '@/lib/haptics'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
const TALK_VOICE_KEY = 'voxu.talk.voice'
const GUEST_KEY = 'voxu_guest_prefs'
function guestPrefs(): Record<string, unknown> {
  try { return JSON.parse(localStorage.getItem(GUEST_KEY) || '{}') } catch { return {} }
}
/** A fixed line, so it's voiced once and replayed from the cache for everyone. */
const TEST_LINE = 'This is how I sound. Change the speed, and I’ll match it.'
const TONES = [
  { key: 'calm', title: 'Calm', line: 'Steady and warm' },
  { key: 'direct', title: 'Direct', line: 'Plain and to the point' },
  { key: 'neutral', title: 'Neutral', line: 'Even, no push either way' },
] as const
const RATE_LABEL: Record<number, string> = { 0.85: 'Slower', 1: 'Normal', 1.15: 'Faster', 1.3: 'Fastest' }

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => { haptic('light'); onChange(!on) }}
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${on ? 'bg-white' : 'bg-white/15'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${on ? 'left-[22px] bg-black' : 'left-0.5 bg-white/70'}`} />
    </button>
  )
}

function List({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <p className="px-1 text-px-11 tracking-[0.22em] uppercase text-white/45">{label}</p>
      <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] divide-y divide-white/[0.06] overflow-hidden">{children}</div>
    </section>
  )
}

/**
 * Settings › Voxu Voice. One Voxu voice (by design — Francis, 2026-10-03);
 * what changes is how it talks:
 *   speed          on this phone (playbackRate) — free, cache-friendly
 *   speak replies  Talk's own on/off, same key
 *   tone           calm / direct / neutral (guide_tone — already shapes replies)
 *   conversation   preferences fed into the coach's prompt (coach_prefs)
 */
export function VoxuVoicePage() {
  const [rate, setRate] = useState(1)
  const [speakReplies, setSpeakReplies] = useState(true)
  const [tone, setTone] = useState<string>('calm')
  const [prefs, setPrefs] = useState<CoachPrefKey[]>([])
  const [testing, setTesting] = useState(false)
  /** Which tone's sample is loading or playing. */
  const [previewing, setPreviewing] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  // Guests have no account to save to: their tone lives in voxu_guest_prefs,
  // where Home's guest audio already reads it. Conversation needs an account.
  const [guest, setGuest] = useState(false)

  useEffect(() => {
    installVoxuUnlock()
    setRate(voiceRate())
    try { setSpeakReplies(localStorage.getItem(TALK_VOICE_KEY) !== 'off') } catch { /* default on */ }
    fetch('/api/voice/prefs', { cache: 'no-store' })
      .then(r => {
        if (r.status === 401) { setGuest(true); const t = guestPrefs().guide_tone; if (typeof t === 'string') setTone(t); return null }
        return r.ok ? r.json() : null
      })
      .then(d => { if (d) { setPrefs(d.coachPrefs ?? []); setTone(d.tone ?? 'calm') } })
      .catch(() => {})
  }, [])

  const save = (body: Record<string, unknown>) => {
    if (guest) {
      if (typeof body.tone === 'string') {
        try { localStorage.setItem(GUEST_KEY, JSON.stringify({ ...guestPrefs(), guide_tone: body.tone })) } catch { /* ignore */ }
      }
      return Promise.resolve()
    }
    return fetch('/api/voice/prefs', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(r => { if (!r.ok) setNote('Couldn’t save that. Try again.') })
      .catch(() => setNote('Couldn’t reach Voxu. Check your connection.'))
  }

  const test = async () => {
    setTesting(true)
    setNote(null)
    try {
      const res = await fetchVoxuAudio(TEST_LINE, 'explain')
      if (!res.ok) { setNote(res.reason === 'locked' ? 'Voxu’s voice is resting for now — try again later.' : 'Couldn’t play the voice just now.'); return }
      await sharedVoxuPlayer().play(res.audio.src)
    } finally {
      setTesting(false)
    }
  }

  // Each tone's narrator saying the same moment in that tone's words — a
  // fixed, cached sample (lib/voice/tone-preview). Doesn't change the setting.
  const preview = async (key: string) => {
    if (previewing === key) {
      // Stop: pause, and end the pending play() so nothing waits on it.
      const p = sharedVoxuPlayer(); p.el.pause(); p.el.onended?.(new Event('ended'))
      setPreviewing(null); return
    }
    setPreviewing(key)
    setNote(null)
    try {
      const res = await fetch(`/api/voice/tone-preview?tone=${key}`)
      const d = await res.json().catch(() => null)
      if (!res.ok || !d?.audio) { setNote('Couldn’t play that sample just now.'); setPreviewing(null); return }
      await sharedVoxuPlayer().play(`data:audio/mpeg;base64,${d.audio}`)
    } catch {
      setNote('Couldn’t play that sample just now.')
    }
    setPreviewing(p => (p === key ? null : p))
  }

  const togglePref = (k: CoachPrefKey, on: boolean) => {
    const next = on ? [...prefs, k] : prefs.filter(p => p !== k)
    setPrefs(next)
    void save({ coachPrefs: next })
  }

  return (
    <div className="pb-6">
      {/* One voice, alive — the same dial as everywhere else in Voxu. */}
      <div className="rounded-2xl border border-white/[0.1] bg-white/[0.03] p-4 flex items-center gap-4">
        <div className="relative w-20 h-20 shrink-0"><SpeakingRing always size={104} /></div>
        <div className="min-w-0">
          <p className="text-px-22 text-white leading-tight" style={{ ...SERIF, fontWeight: 600 }}>Voxu</p>
          <p className="text-px-13 text-white/65 leading-snug mt-0.5">One voice. You choose how it talks to you.</p>
          <button onClick={test} disabled={testing} className="tap-44 mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/20 text-px-13 text-white disabled:opacity-50">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Test voice
          </button>
        </div>
      </div>
      {note && <p className="mt-2 px-1 text-px-12 text-white/70" role="status">{note}</p>}

      <List label="Voice">
        <div className="px-4 py-3.5">
          <div className="flex items-baseline justify-between">
            <p className="text-px-15 text-white">Speaking speed</p>
            <p className="text-px-12 text-white/55">{RATE_LABEL[rate]}</p>
          </div>
          <div className="mt-2.5 grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/[0.05]" role="radiogroup" aria-label="Speaking speed">
            {VOICE_RATES.map(r => (
              <button
                key={r}
                role="radio"
                aria-checked={rate === r}
                onClick={() => { setRate(r); setVoiceRate(r); haptic('light') }}
                className={`tap-44 py-1.5 rounded-lg text-px-12 ${rate === r ? 'bg-white text-black font-medium' : 'text-white/70'}`}
              >
                {RATE_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-px-11 text-white/45">On this phone. Try it with Test voice.</p>
        </div>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <span className="min-w-0 flex-1">
            <span className="block text-px-15 text-white">Speak replies in Talk</span>
            <span className="block text-px-12 text-white/55">Voxu reads its answers aloud</span>
          </span>
          <Switch
            on={speakReplies}
            label="Speak replies in Talk"
            onChange={v => { setSpeakReplies(v); try { localStorage.setItem(TALK_VOICE_KEY, v ? 'on' : 'off') } catch { /* ignore */ } }}
          />
        </div>
      </List>

      <List label="Tone">
        {TONES.map(t => (
          <div key={t.key} className="flex items-center">
            <button
              type="button"
              onClick={() => preview(t.key)}
              aria-label={previewing === t.key ? `Stop the ${t.title} sample` : `Hear ${t.title}`}
              className="tap-44 ml-3 shrink-0 w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/85 active:bg-white/10"
            >
              {previewing === t.key ? <Square className="w-3 h-3 fill-current" /> : <Play className="w-3.5 h-3.5 translate-x-px" />}
            </button>
            <button
              role="radio"
              aria-checked={tone === t.key}
              onClick={() => { setTone(t.key); haptic('light'); void save({ tone: t.key }) }}
              className="flex-1 min-w-0 pl-3 pr-4 py-3.5 flex items-center gap-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-px-15 text-white">{t.title}</span>
                <span className="block text-px-12 text-white/55">{t.line}</span>
              </span>
              <span className={`w-5 h-5 rounded-full border flex items-center justify-center ${tone === t.key ? 'border-white' : 'border-white/35'}`} aria-hidden>
                {tone === t.key && <span className="w-2.5 h-2.5 rounded-full bg-white" />}
              </span>
            </button>
          </div>
        ))}
      </List>

      {guest ? (
        <p className="mt-6 px-1 text-px-13 text-white/60 leading-relaxed">Save your account to choose how Voxu talks to you in conversation &mdash; concise, challenging, encouraging or focused.</p>
      ) : (<>
      <p className="mt-2 px-1 text-px-12 text-white/50 leading-relaxed">Tone sets how Voxu words its replies, and which narrator reads your guided sessions. Tap play to hear one.</p>
      <List label="Conversation">
        {COACH_PREFS.map(p => (
          <div key={p.key} className="px-4 py-3.5 flex items-center gap-3">
            <span className="min-w-0 flex-1 text-px-15 text-white leading-snug">{p.title}</span>
            <Switch on={prefs.includes(p.key)} label={p.title} onChange={v => togglePref(p.key, v)} />
          </div>
        ))}
      </List>
      <p className="mt-2 px-1 text-px-12 text-white/50 leading-relaxed">These change how Voxu answers you in Talk and in your journal. If you&rsquo;re ever in a really hard place, Voxu sets them aside and just looks after you.</p>
      </>)}
    </div>
  )
}
