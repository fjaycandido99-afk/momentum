'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface UseVoiceCoachArgs {
  // Called with the user's spoken input (drives the coach's sendMessage).
  onTranscript: (text: string) => void
}

// Hands-free voice loop for the coach: listen (Web Speech) → onTranscript →
// (coach replies) → speak() the reply via /api/tts (browser-speech fallback)
// → re-listen. Recognition is paused while the coach speaks so it never hears
// itself; mic-permission errors stop the loop cleanly instead of spinning.
export function useVoiceCoach({ onTranscript }: UseVoiceCoachArgs) {
  const [voiceMode, setVoiceMode] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [supported, setSupported] = useState(true)

  const recognitionRef = useRef<any>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const voiceModeRef = useRef(false)

  // Keep onTranscript in a ref so startListening stays stable across renders.
  const onTranscriptRef = useRef(onTranscript)
  useEffect(() => { onTranscriptRef.current = onTranscript })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) setSupported(false)
  }, [])

  const stopListening = useCallback(() => {
    setIsListening(false)
    try { recognitionRef.current?.stop() } catch { /* no-op */ }
    recognitionRef.current = null
  }, [])

  const startListening = useCallback(() => {
    if (!voiceModeRef.current) return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    try { recognitionRef.current?.stop() } catch { /* no-op */ }
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    let got = false
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0]?.transcript || '').join(' ').trim()
      if (transcript) {
        got = true
        setIsListening(false)
        onTranscriptRef.current(transcript)
      }
    }
    recognition.onerror = (e: any) => {
      // Permission denied → stop the loop, don't spin forever.
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        voiceModeRef.current = false
        setVoiceMode(false)
        setIsListening(false)
      }
    }
    recognition.onend = () => {
      // Re-arm only if still hands-free and we didn't just capture a turn
      // (after a turn, speak() re-arms once the reply finishes).
      if (voiceModeRef.current && !got) startListening()
    }
    recognitionRef.current = recognition
    setIsListening(true)
    try { recognition.start() } catch { /* already started */ }
  }, [])

  // Speak a coach reply aloud with ElevenLabs ONLY, then re-arm listening.
  // No robotic browser-speech fallback — if ElevenLabs has no audio (quota /
  // no key), the reply is still shown as text and we just continue the loop.
  const speak = useCallback(async (text: string) => {
    if (!voiceModeRef.current || !text) return
    stopListening()
    setIsSpeaking(true)
    const finish = () => { setIsSpeaking(false); if (voiceModeRef.current) startListening() }
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const ct = res.headers.get('content-type') || ''
      if (res.ok && ct.includes('audio')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        const done = () => { URL.revokeObjectURL(url); finish() }
        audio.onended = done
        audio.onerror = done
        await audio.play().catch(done)
        return
      }
      finish() // ElevenLabs unavailable — no robotic fallback, reply stays text-only
    } catch {
      finish()
    }
  }, [stopListening, startListening])

  const toggle = useCallback(() => {
    setVoiceMode(prev => {
      const next = !prev
      voiceModeRef.current = next
      if (next) {
        startListening()
      } else {
        stopListening()
        try { audioRef.current?.pause() } catch { /* no-op */ }
        try { window.speechSynthesis?.cancel() } catch { /* no-op */ }
        setIsSpeaking(false)
      }
      return next
    })
  }, [startListening, stopListening])

  useEffect(() => () => {
    voiceModeRef.current = false
    try { recognitionRef.current?.stop() } catch { /* no-op */ }
    try { audioRef.current?.pause() } catch { /* no-op */ }
    try { window.speechSynthesis?.cancel() } catch { /* no-op */ }
  }, [])

  return { voiceMode, isListening, isSpeaking, supported, toggle, speak }
}
