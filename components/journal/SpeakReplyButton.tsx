'use client'

/**
 * Speaks one AI reply aloud in the user's chosen Voice Tone.
 *
 * Tap-to-play rather than autoplay, for three reasons: mobile browsers
 * block unprompted audio anyway, people journal in public, and every
 * playback costs ElevenLabs characters — so the user asking for it is
 * also the cheapest possible policy.
 *
 * Failure is quiet by design. If voice is unavailable (credits spent,
 * provider down, free tier) the button says so once and stops offering;
 * the text reply is already there and is the actual product.
 */

import { useCallback, useRef, useState } from 'react'
import { Volume2, Loader2, VolumeX } from 'lucide-react'

type State = 'idle' | 'loading' | 'playing' | 'unavailable'

export function SpeakReplyButton({ text, onUpgrade }: { text: string; onUpgrade?: () => void }) {
  const [state, setState] = useState<State>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setState('idle')
  }, [])

  const play = useCallback(async () => {
    if (state === 'loading') return
    if (state === 'playing') return stop()

    setState('loading')
    try {
      const res = await fetch('/api/ai/chat-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      if (res.status === 403) {
        // Locked on this tier, or the day's spoken replies are used up.
        setState('idle')
        onUpgrade?.()
        return
      }
      if (!res.ok) {
        setState('unavailable')
        return
      }

      const data = await res.json()
      if (!data?.audio) {
        setState('unavailable')
        return
      }

      const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`)
      audioRef.current = audio
      audio.onended = () => setState('idle')
      audio.onerror = () => setState('unavailable')
      await audio.play()
      setState('playing')
    } catch {
      setState('unavailable')
    }
  }, [text, state, stop, onUpgrade])

  if (state === 'unavailable') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-white/35">
        <VolumeX className="h-3 w-3" />
        voice unavailable
      </span>
    )
  }

  return (
    <button
      onClick={play}
      aria-label={state === 'playing' ? 'Stop' : 'Play this reply aloud'}
      className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-white/40 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
    >
      {state === 'loading' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Volume2 className={`h-3.5 w-3.5 ${state === 'playing' ? 'text-white' : ''}`} />
      )}
    </button>
  )
}
