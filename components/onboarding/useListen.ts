'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Listening for ONE answer, hands-free — the opener asks a question out loud
 * and then simply listens (components/onboarding/FirstLaunch).
 *
 * Unlike the journal's mic (VoiceInput), nobody taps to stop: it ends when
 * they stop talking.
 *
 *   speech   A browser with speech recognition (Chrome, Safari): one
 *            utterance, the browser decides when it's over, words appear as
 *            they're said.
 *   record   The app's web view (which has the API but won't run it) and
 *            anything without it: record, watch the voice level, stop after
 *            ~1.5s of quiet once they've spoken, then transcribe through the
 *            same /api/transcribe the journal uses.
 *
 * Gives up quietly — no speech within ~8s resolves '' — and never throws:
 * every failure becomes `error`, and typing is always on screen.
 */

type Phase = 'idle' | 'listening' | 'transcribing'

const QUIET_MS = 1500
const NO_SPEECH_MS = 8000
const MAX_MS = 25000
const SPEAKING_RMS = 0.035

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any

function speechApi(): (new () => AnyRecognition) | null {
  if (typeof window === 'undefined') return null
  // The iPhone app's web view exposes the API and refuses to run it.
  if ((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()) return null
  const w = window as unknown as { SpeechRecognition?: new () => AnyRecognition; webkitSpeechRecognition?: new () => AnyRecognition }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function useListen() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [interim, setInterim] = useState('')
  /** 0–1, how loud right now — the orb breathes with it. */
  const [level, setLevel] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const stopRef = useRef<(() => void) | null>(null)

  /** Stop early (a tap on the orb): whatever was said so far is used. */
  const stop = useCallback(() => { stopRef.current?.() }, [])

  const listen = useCallback((): Promise<string> => {
    setError(null)
    setInterim('')
    const SR = speechApi()
    if (SR) return listenSpeech(SR)
    if (typeof navigator !== 'undefined' && !!navigator.mediaDevices && typeof MediaRecorder !== 'undefined') {
      return listenRecord()
    }
    setError('Voice isn’t available here — type instead.')
    return Promise.resolve('')

    function listenSpeech(Ctor: new () => AnyRecognition): Promise<string> {
      return new Promise(resolve => {
        let finalText = ''
        let settled = false
        const done = (text: string) => {
          if (settled) return
          settled = true
          clearTimeout(noSpeech)
          stopRef.current = null
          setPhase('idle')
          setInterim('')
          resolve(text.trim())
        }
        const rec = new Ctor()
        rec.continuous = false
        rec.interimResults = true
        rec.lang = navigator.language || 'en-US'
        rec.onresult = (e: AnyRecognition) => {
          let live = ''
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript
            if (e.results[i].isFinal) finalText += t
            else live += t
          }
          setInterim((finalText + ' ' + live).trim())
        }
        rec.onerror = (e: AnyRecognition) => {
          if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') setError('Voxu needs the microphone to hear you — or type instead.')
          else if (e?.error !== 'no-speech' && e?.error !== 'aborted') setError('I didn’t catch that.')
          done(finalText)
        }
        rec.onend = () => done(finalText)
        const noSpeech = window.setTimeout(() => { try { rec.stop() } catch { /* ended */ } }, NO_SPEECH_MS + 4000)
        stopRef.current = () => { try { rec.stop() } catch { done(finalText) } }
        try {
          rec.start()
          setPhase('listening')
        } catch {
          setError('Tap the orb to talk — or type instead.')
          done('')
        }
      })
    }

    async function listenRecord(): Promise<string> {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setError(/denied|not\s*allowed|permission/i.test(msg)
          ? 'Voxu needs the microphone to hear you. Settings → Voxu → Microphone — or type instead.'
          : 'Couldn’t reach the microphone — type instead.')
        return ''
      }

      // Voice level, to know when they've finished.
      const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      const ctx = AC ? new AC() : null
      const analyser = ctx?.createAnalyser() ?? null
      if (ctx && analyser) {
        analyser.fftSize = 1024
        ctx.createMediaStreamSource(stream).connect(analyser)
      }
      const buf = new Uint8Array(analyser?.fftSize ?? 0)

      const chunks: Blob[] = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }

      const blob = await new Promise<Blob | null>(resolve => {
        const started = Date.now()
        let spoke = false
        let lastLoud = Date.now()
        const finish = () => {
          clearInterval(tick)
          stopRef.current = null
          if (recorder.state !== 'inactive') recorder.stop()
        }
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop())
          void ctx?.close().catch(() => {})
          setLevel(0)
          resolve(spoke || !analyser ? new Blob(chunks, { type: recorder.mimeType || 'audio/mp4' }) : null)
        }
        const tick = window.setInterval(() => {
          const now = Date.now()
          if (analyser) {
            analyser.getByteTimeDomainData(buf)
            let sum = 0
            for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
            const rms = Math.sqrt(sum / buf.length)
            setLevel(Math.min(1, rms * 6))
            if (rms > SPEAKING_RMS) { spoke = true; lastLoud = now }
          }
          if (spoke && now - lastLoud > QUIET_MS) finish()
          else if (!spoke && now - started > NO_SPEECH_MS) finish()
          else if (now - started > MAX_MS) finish()
        }, 100)
        stopRef.current = () => { spoke = true; finish() }
        recorder.start()
        setPhase('listening')
      })

      if (!blob || blob.size === 0) { setPhase('idle'); return '' }
      setPhase('transcribing')
      try {
        const form = new FormData()
        form.append('audio', blob, `voice.${(recorder.mimeType || 'audio/mp4').includes('webm') ? 'webm' : 'mp4'}`)
        const res = await fetch('/api/transcribe', { method: 'POST', body: form })
        const data = res.ok ? await res.json().catch(() => null) : null
        if (!res.ok) setError('I couldn’t make that out. Try again, or type it.')
        return typeof data?.text === 'string' ? data.text.trim() : ''
      } catch {
        setError('I couldn’t make that out. Try again, or type it.')
        return ''
      } finally {
        setPhase('idle')
      }
    }
  }, [])

  return { listen, stop, phase, interim, level, error, setError }
}
