'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlarmClock, Loader2, Play, Square, X } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { WakeCallSheet, type WakeCallSettings } from '@/components/home/WakeCallSheet'
import { clockLabel } from '@/lib/era/wake'

/**
 * /era/wake — where the wake-up call notification lands.
 *
 * The coach says the call out loud as soon as it's ready. In the iPhone app
 * that works without a tap (the web view allows it); a browser that blocks
 * autoplay gets the big play button instead. Either way the words are on
 * screen, so a muted phone or a spent voice allowance still gets the call.
 *
 * The voice goes through /api/ai/chat-voice: the same daily meter as a
 * spoken coach reply (free gets one a day, and this is it), the same
 * monthly budget, and its cache — the script is the same all day, so
 * replaying it costs nothing.
 */

interface WakeResponse {
  settings: WakeCallSettings
  call: { title: string; body: string; script: string } | null
  ring: boolean
  eraTitle: string | null
  image: string | null
  complete: boolean
  promisedToday: boolean
}

type Voice = 'loading' | 'playing' | 'ready' | 'locked' | 'unavailable'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

export default function WakeCallPage() {
  const router = useRouter()
  const { openUpgradeModal } = useSubscription()
  const [data, setData] = useState<WakeResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [voice, setVoice] = useState<Voice>('loading')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const requested = useRef(false)

  useEffect(() => {
    fetch('/api/era/wake', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: WakeResponse) => setData(d))
      .catch(() => setFailed(true))
  }, [])

  const play = useCallback(async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      audio.currentTime = 0
      await audio.play()
      setVoice('playing')
    } catch {
      // Autoplay blocked: the audio is loaded, one tap plays it.
      setVoice('ready')
    }
  }, [])

  // Fetch the voice once, then try to play it straight away.
  useEffect(() => {
    const script = data?.call?.script
    if (!script || requested.current) return
    requested.current = true
    ;(async () => {
      try {
        const res = await fetch('/api/ai/chat-voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: script }),
        })
        if (res.status === 403) return setVoice('locked')
        const body = await res.json().catch(() => null)
        if (!res.ok || !body?.audio) return setVoice('unavailable')
        const audio = new Audio(`data:audio/mpeg;base64,${body.audio}`)
        audio.onended = () => setVoice('ready')
        audio.onerror = () => setVoice('unavailable')
        audioRef.current = audio
        await play()
      } catch {
        setVoice('unavailable')
      }
    })()
  }, [data, play])

  useEffect(() => () => { audioRef.current?.pause() }, [])

  const toggle = () => {
    if (voice === 'playing') {
      audioRef.current?.pause()
      setVoice('ready')
    } else if (voice === 'ready') {
      void play()
    } else if (voice === 'locked') {
      openUpgradeModal()
    }
  }

  const close = () => router.push('/')
  const call = data?.call
  // The opener is the headline; the rest is what the coach goes on to say.
  const rest = call && call.script.startsWith(call.title) ? call.script.slice(call.title.length).trim() : call?.script
  const time = clockLabel(data?.settings.time)

  return (
    <div className="fixed inset-0 z-[60] bg-black text-white flex flex-col">
      {data?.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.image} alt="" aria-hidden className="absolute inset-x-0 top-0 w-full h-[58vh] object-cover grayscale opacity-45" />
      )}
      <div className="absolute inset-x-0 top-0 h-[60vh] bg-gradient-to-b from-black/30 via-black/50 to-black" />

      <div className="relative flex items-center justify-between px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <p className="text-[10px] tracking-[0.28em] uppercase text-white/60 flex items-center gap-1.5">
          <AlarmClock className="w-3 h-3" /> Wake-up call{time ? ` · ${time}` : ''}
        </p>
        <button onClick={close} aria-label="Close" className="p-2 rounded-full bg-white/10 hover:bg-white/20">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 overflow-y-auto px-6 flex flex-col justify-end pb-4">
        {failed ? (
          <p className="text-sm text-white/70">Couldn&rsquo;t load your wake-up call. Check your connection.</p>
        ) : !data ? (
          <Loader2 className="w-6 h-6 animate-spin text-white/50 self-center mb-24" />
        ) : !call ? (
          <div className="mb-10">
            <h1 className="text-[40px] leading-[0.95]" style={{ ...SERIF, fontWeight: 600 }}>No era yet.</h1>
            <p className="text-sm text-white/70 mt-3">Your coach wakes you up during an era. Pick one to start.</p>
            <Link href="/era" className="inline-block mt-5 px-5 py-3 rounded-2xl bg-white text-black text-sm font-medium">Pick an era</Link>
          </div>
        ) : (
          <>
            <h1 className="text-[46px] leading-[0.95]" style={{ ...SERIF, fontWeight: 600 }}>{call.title}</h1>
            <p className="text-[19px] text-white/80 leading-snug mt-4" style={{ ...SERIF, fontWeight: 500 }}>{rest}</p>

            <div className="flex items-center gap-4 mt-7">
              <button
                onClick={toggle}
                disabled={voice === 'loading' || voice === 'unavailable'}
                aria-label={voice === 'playing' ? 'Stop' : 'Play your wake-up call'}
                className="relative w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shrink-0 disabled:opacity-40 active:scale-95 transition-transform"
              >
                {voice === 'playing' && <span className="absolute inset-0 rounded-full border border-white/60 animate-ping" aria-hidden />}
                {voice === 'loading' ? <Loader2 className="w-6 h-6 animate-spin" />
                  : voice === 'playing' ? <Square className="w-5 h-5 fill-black" />
                  : <Play className="w-6 h-6 fill-black ml-0.5" />}
              </button>
              <p className="text-xs text-white/60 leading-relaxed">
                {voice === 'loading' ? 'Your coach is getting ready…'
                  : voice === 'playing' ? 'Your coach is talking.'
                  : voice === 'ready' ? 'Tap to hear it.'
                  : voice === 'locked' ? 'You’ve used today’s spoken message. It’s all written above — or get unlimited voice with Premium.'
                  : 'Voice isn’t available right now — it’s all written above.'}
              </p>
            </div>
          </>
        )}
      </div>

      {data && call && (
        <div className="relative px-5 space-y-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
          <Link
            href="/"
            className="block w-full text-center py-4 rounded-2xl bg-white text-black text-sm font-medium active:scale-[0.98] transition-all"
          >
            {data.complete ? 'See your era' : data.promisedToday ? 'Go to today' : 'Make today’s promise'}
          </Link>
          <button onClick={() => setSettingsOpen(true)} className="w-full py-2.5 text-xs text-white/55">
            {data.settings.enabled ? 'Change wake-up time' : 'Set this as my wake-up call'}
          </button>
        </div>
      )}

      {settingsOpen && data?.eraTitle && (
        <WakeCallSheet
          eraTitle={data.eraTitle}
          initial={data.settings}
          hidePreview
          onClose={() => setSettingsOpen(false)}
          onSaved={settings => setData(d => (d ? { ...d, settings } : d))}
        />
      )}
    </div>
  )
}
