'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Sun, Play, Pause, ChevronDown, Loader2, RefreshCw } from 'lucide-react'
import { logXPEventServer } from '@/lib/gamification'

interface MorningBriefingProps {
  onComplete?: () => void
}

export function MorningBriefing({ onComplete }: MorningBriefingProps) {
  const [script, setScript] = useState<string | null>(null)
  const [audioSrc, setAudioSrc] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [showScript, setShowScript] = useState(false)
  const [xpAwarded, setXpAwarded] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveformHeights = useRef(Array.from({ length: 24 }, () => Math.random() * 100))

  const fetchBriefing = useCallback(() => {
    setLoading(true)
    setError(false)
    fetch('/api/ai/morning-briefing')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.script) {
          setScript(data.script)
          if (data.audio) {
            setAudioSrc(`data:audio/mpeg;base64,${data.audio}`)
          }
          if (!data.cached && !xpAwarded) {
            logXPEventServer('morningBriefing', 'morning-briefing')
            setXpAwarded(true)
          }
        } else {
          setError(true)
        }
      })
      .catch(() => { setError(true) })
      .finally(() => setLoading(false))
  }, [xpAwarded])

  useEffect(() => {
    fetchBriefing()
  }, [])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setPlaying(!playing)
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
          <span className="text-sm text-white/85">Preparing your morning briefing...</span>
        </div>
      </div>
    )
  }

  if (!script && error) {
    return (
      <div className="rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-white/85">Couldn&apos;t load your briefing</p>
            </div>
          </div>
          <button
            onClick={fetchBriefing}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors"
            aria-label="Retry"
          >
            <RefreshCw className="w-4 h-4 text-white/75" />
          </button>
        </div>
      </div>
    )
  }

  if (!script) return null

  return (
    <div className="rounded-2xl bg-black border border-amber-500/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] overflow-hidden">
      {audioSrc && (
        <audio
          ref={audioRef}
          src={audioSrc}
          onEnded={() => { setPlaying(false); onComplete?.() }}
          preload="auto"
        />
      )}

      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <Sun className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-white">Morning Briefing</h3>
              <p className="text-[10px] text-white/70">Your personal daily update</p>
            </div>
          </div>

          {audioSrc && (
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-amber-500/20 hover:bg-amber-500/30 transition-colors"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="w-5 h-5 text-amber-400" />
              ) : (
                <Play className="w-5 h-5 text-amber-400 ml-0.5" />
              )}
            </button>
          )}
        </div>

        {/* Waveform placeholder */}
        {audioSrc && playing && (
          <div className="flex items-center gap-0.5 mt-3 h-4 px-2">
            {waveformHeights.current.map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-amber-400/40 rounded-full animate-pulse"
                style={{
                  height: `${h}%`,
                  animationDelay: `${i * 50}ms`,
                  minHeight: '2px',
                }}
              />
            ))}
          </div>
        )}

        {/* Expandable script */}
        <button
          onClick={() => setShowScript(!showScript)}
          className="mt-3 flex items-center gap-1 text-xs text-white/70 hover:text-white/85 transition-colors"
        >
          <span>{showScript ? 'Hide' : 'Show'} script</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${showScript ? 'rotate-180' : ''}`} />
        </button>

        {showScript && (
          <div className="mt-2">
            <p className="text-xs text-white/85 leading-relaxed whitespace-pre-line">
              {script}
            </p>
            {onComplete && (
              <button
                onClick={onComplete}
                className="mt-3 px-4 py-1.5 rounded-full bg-amber-500/20 text-xs text-amber-400 hover:bg-amber-500/30 transition-colors"
              >
                Mark done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
