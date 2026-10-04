'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AudioLines, Loader2, Send, Volume2, VolumeX, X } from 'lucide-react'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { CrisisBanner, type CrisisContent } from '@/components/journal/CrisisBanner'
import { fetchVoxuAudio } from '@/lib/voice/voxu-audio'
import { SpeakingRing } from './SpeakingRing'
import { isCommand } from '@/lib/voice-guide/intents'
import { trackFeature } from '@/lib/analytics/track'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'

/**
 * Voxu Guide phase 4 — "Talk it through".
 *
 * A conversation with the coach (/api/ai/journal-conversation, mode
 * 'guide'): the same daily message limit, the same crisis handling, the
 * same memory and laws — told which screen they came from, using that
 * screen's own walkthrough lines and real numbers. Replies are spoken in
 * Voxu's voice (metered per line) with the words always on screen; a
 * speaker toggle turns the voice off.
 *
 * Voxu speaks first with a line written from the data, not by the model
 * (lib/voice-guide/scripts talkOpener) — from week three of an era, the
 * callback to their own day-one words.
 *
 * Something phrased as a command ("take me to my laws", "make today
 * easier") is handed back to the panel instead of the coach. Nothing here
 * is saved: it's a conversation, not a journal entry.
 */

interface Msg { role: 'user' | 'assistant'; content: string }

const VOICE_KEY = 'voxu.talk.voice'

export function TalkSheet({
  opener,
  screen,
  screenSummary,
  onCommand,
  onClose,
}: {
  opener: string
  screen: string
  /** The screen's own walkthrough lines — what they're looking at, with its numbers. */
  screenSummary: string
  onCommand: (text: string) => void
  onClose: () => void
}) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: 'assistant', content: opener }])
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [crisis, setCrisis] = useState<CrisisContent | null>(null)
  /** Ran into a daily limit — Premium lifts it (free users only see the offer). */
  const [limited, setLimited] = useState(false)
  const sub = useSubscriptionOptional()
  const [voiceOn, setVoiceOn] = useState(() => {
    try { return localStorage.getItem(VOICE_KEY) !== 'off' } catch { return true }
  })
  const audio = useRef<HTMLAudioElement | null>(null)
  const list = useRef<HTMLDivElement | null>(null)

  const hush = () => { audio.current?.pause(); audio.current = null }

  const speak = useCallback(async (text: string) => {
    hush()
    if (!voiceOn) return
    const res = await fetchVoxuAudio(text)
    if (!res.ok) {
      if (res.reason === 'locked') { setNote('Spoken replies are used up for now, so here it is in words.'); setLimited(true) }
      return
    }
    audio.current = res.audio
    res.audio.play().catch(() => { /* blocked: the words are on screen */ })
  }, [voiceOn])

  // Voxu speaks first. Opening the sheet was their tap, so sound is allowed.
  useEffect(() => {
    trackFeature('voice_guide', 'use', `talk:${screen}`)
    void speak(opener)
    return hush
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  const toggleVoice = () => {
    const next = !voiceOn
    setVoiceOn(next)
    if (!next) hush()
    try { localStorage.setItem(VOICE_KEY, next ? 'on' : 'off') } catch { /* storage blocked */ }
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    setTyped('')
    if (isCommand(text)) { hush(); onCommand(text); return }

    hush()
    setNote(null)
    const history = msgs
    setMsgs(m => [...m, { role: 'user', content: text }])
    setBusy(true)
    try {
      const res = await fetch('/api/ai/journal-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversation: history, mode: 'guide', screen: screenSummary }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setNote(data?.reason === 'exhausted'
          ? (data?.period === 'week'
            ? 'That’s this week’s conversations. They come back Monday — and I can still explain things and take you places.'
            : 'That’s today’s messages used. They come back tomorrow.')
          : data?.reason === 'locked'
            ? 'Talking with Voxu is part of Premium.'
            : data?.error ?? 'Couldn’t reach Voxu just now.')
        if (data?.upgrade) setLimited(true)
        return
      }
      if (data?.crisis) setCrisis(data.crisis)
      // A degraded reply is the journal's canned prompt ("Take a moment to
      // sit with that thought…"), which reads as a non-answer to a question
      // about the app. Say plainly that Voxu couldn't answer instead.
      if (data?.degraded) {
        setNote('Voxu couldn’t answer just now. Try again in a moment.')
        return
      }
      const reply: string = data?.reply ?? ''
      if (reply) {
        setMsgs(m => [...m, { role: 'assistant', content: reply }])
        void speak(reply)
      }
      // Free, weekly: say it gently before the wall, never as a running count.
      const q = data?.quota
      if (q?.period === 'week' && typeof q.remaining === 'number' && q.remaining <= 5) {
        setNote(q.remaining === 0
          ? 'That was this week’s last conversation. They come back Monday.'
          : 'You’ve used most of this week’s conversations. I can still explain things and take you places.')
        setLimited(true)
      }
    } catch {
      setNote('Couldn’t reach Voxu. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Talk with Voxu" className="fixed inset-0 z-[70] flex items-end md:items-center justify-center">
      <ScrollLock />
      <button aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { hush(); onClose() }} />
      <div
        className="relative w-full max-w-lg max-h-[85dvh] overflow-x-hidden flex flex-col rounded-t-3xl md:rounded-3xl border border-white/[0.14] bg-[#0b0d14]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)' }}
      >
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.08]">
          <span className="relative w-8 h-8 shrink-0" aria-hidden>
            <SpeakingRing always size={42} />
          </span>
          <p className="flex-1 text-px-15 text-white">Talk with Voxu</p>
          <button onClick={toggleVoice} aria-label={voiceOn ? 'Turn spoken replies off' : 'Turn spoken replies on'} aria-pressed={voiceOn} className="tap-44 p-2 rounded-full hover:bg-white/10">
            {voiceOn ? <Volume2 className="w-4 h-4 text-white" /> : <VolumeX className="w-4 h-4 text-white/60" />}
          </button>
          <button onClick={() => { hush(); onClose() }} aria-label="Close" className="tap-44 p-2 rounded-full hover:bg-white/10">
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        <div ref={list} className="flex-1 min-h-[30dvh] overflow-y-auto overflow-x-hidden overscroll-contain px-4 py-3 space-y-2.5" aria-live="polite">
          {msgs.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
              <p className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-px-14 leading-snug break-words ${
                m.role === 'user' ? 'bg-white text-black rounded-br-md' : 'bg-white/[0.07] text-white rounded-bl-md'
              }`}>
                {m.content}
              </p>
            </div>
          ))}
          {busy && (
            <div className="flex"><span className="px-3.5 py-2.5 rounded-2xl bg-white/[0.07]"><Loader2 className="w-4 h-4 animate-spin text-white/60" /></span></div>
          )}
          {crisis && <CrisisBanner content={crisis} />}
          {note && <p className="text-px-12 text-white/60">{note}</p>}
          {limited && sub && !sub.isPremium && (
            <button onClick={() => { hush(); sub.openUpgradeModal('talk') }} className="tap-44 px-3.5 py-2 rounded-full bg-white text-black text-px-13 font-medium">
              Keep talking with Premium
            </button>
          )}
        </div>

        <form
          className="flex items-center gap-2 px-4 pt-3 border-t border-white/[0.08]"
          onSubmit={e => { e.preventDefault(); void send(typed) }}
        >
          <VoiceInput onTranscript={t => void send(t)} disabled={busy} />
          <input
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder="Say or type…"
            aria-label="Message Voxu"
            className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-white/15 text-px-15 text-white placeholder:text-white/40"
          />
          <button type="submit" disabled={busy || !typed.trim()} aria-label="Send" className="tap-44 p-2.5 rounded-xl bg-white text-black disabled:opacity-40">
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>,
    document.body,
  )
}
