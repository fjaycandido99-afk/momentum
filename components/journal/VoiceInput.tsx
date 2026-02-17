'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onInterim: (text: string) => void
  disabled?: boolean
}

export function VoiceInput({ onTranscript, onInterim, disabled }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<any>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setIsSupported(false)
      return
    }
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }
  }, [])

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
      setIsRecording(false)
    }, 60000)
  }, [])

  const startRecording = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      resetSilenceTimer()
      let interim = ''
      let final = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          final += transcript
        } else {
          interim += transcript
        }
      }

      if (final) onTranscript(final)
      if (interim) onInterim(interim)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'no-speech') {
        setIsRecording(false)
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
      onInterim('')
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    resetSilenceTimer()
  }, [onTranscript, onInterim, resetSilenceTimer])

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop() } catch {}
    }
    setIsRecording(false)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
  }, [])

  const toggle = useCallback(() => {
    if (isRecording) {
      stopRecording()
    } else {
      startRecording()
    }
  }, [isRecording, startRecording, stopRecording])

  if (!isSupported) {
    return (
      <p className="text-[10px] text-white/50 italic">Voice not supported in this browser</p>
    )
  }

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      className={`relative p-3 rounded-xl transition-all ${
        isRecording
          ? 'bg-red-500/20 text-red-400'
          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/85'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
    >
      {isRecording ? (
        <>
          <MicOff className="w-5 h-5 relative z-10" />
          {/* Pulsing ring */}
          <span className="absolute inset-0 rounded-xl border-2 border-red-400/50 animate-ping" />
          {/* Waveform bars */}
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex gap-0.5">
            <span className="w-0.5 h-2 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite]" />
            <span className="w-0.5 h-3 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.1s]" />
            <span className="w-0.5 h-2 bg-red-400 rounded-full animate-[wave_0.5s_ease-in-out_infinite_0.2s]" />
          </div>
        </>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  )
}
