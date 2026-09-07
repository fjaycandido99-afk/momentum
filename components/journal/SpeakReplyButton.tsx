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

import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, Loader2, VolumeX } from 'lucide-react'

type State = 'idle' | 'loading' | 'playing' | 'unavailable'

export function SpeakReplyButton({
  text,
  onUpgrade,
  autoPlay = false,
}: {
  text: string
  onUpgrade?: () => void
  /**
   * Speak this reply without being asked.
   *
   * Only ever set when the user SPOKE their message — a conversation you
   * talk to has to talk back, or it isn't one. Typed messages keep
   * tap-to-play: someone journalling on a train has not consented to their
   * phone talking, and every playback costs ElevenLabs characters.
   */
  autoPlay?: boolean
}) {
  const [state, setState] = useState<State>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const autoPlayedRef = useRef(false)

  const stop = useCallback(() => {
    audioRef.current?.pause()
    audioRef.current = null
    setState('idle')
  }, [])

  const play = useCallback(async (userInitiated: boolean) => {
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
        //
        // Only pitch the upgrade if the user ASKED to hear this. In Talking
        // mode playback is automatic, so upselling here would throw a modal
        // over a conversation nobody interrupted — the app interrupting you
        // to sell you something you didn't just reach for. Autoplay simply
        // goes quiet and the button stays there to tap.
        setState('idle')
        if (userInitiated) onUpgrade?.()
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

  // Autoplay once per reply, and only once: re-renders must not restart it,
  // and a failed attempt must not retry in a loop burning credits.
  useEffect(() => {
    if (!autoPlay || autoPlayedRef.current) return
    autoPlayedRef.current = true
    void play(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay])

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
      onClick={() => play(true)}
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
