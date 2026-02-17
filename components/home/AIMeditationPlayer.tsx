'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Play, Pause, Sparkles, Loader2, Clock } from 'lucide-react'

interface AIMeditationPlayerProps {
  onClose: () => void
  preselectedTheme?: string
}

const THEMES = [
  { id: 'stress-relief', label: 'Stress Relief', color: 'from-teal-500/30 to-emerald-500/30' },
  { id: 'focus', label: 'Focus', color: 'from-blue-500/30 to-cyan-500/30' },
  { id: 'self-compassion', label: 'Self-Love', color: 'from-rose-500/30 to-pink-500/30' },
  { id: 'confidence', label: 'Confidence', color: 'from-yellow-500/30 to-amber-500/30' },
]

const DURATIONS = [3, 5, 10]

export function AIMeditationPlayer({ onClose, preselectedTheme }: AIMeditationPlayerProps) {
  const [selectedTheme, setSelectedTheme] = useState(preselectedTheme || 'stress-relief')
  const [selectedDuration, setSelectedDuration] = useState(5)
  const [script, setScript] = useState('')
  const [audioBase64, setAudioBase64] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const generate = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ai/meditation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          theme: selectedTheme,
          durationMinutes: selectedDuration,
          generateAudio: true,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setScript(data.script || '')
      setAudioBase64(data.audioBase64 || null)
      setGenerated(true)

      // Auto-play if audio available
      if (data.audioBase64) {
        const blob = new Blob(
          [Uint8Array.from(atob(data.audioBase64), c => c.charCodeAt(0))],
          { type: 'audio/mpeg' }
        )
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audioRef.current = audio
        audio.play().then(() => setIsPlaying(true)).catch(() => {})
        audio.addEventListener('ended', () => setIsPlaying(false))
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false)
    }
  }, [selectedTheme, selectedDuration])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {})
    }
  }, [isPlaying])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const themeObj = THEMES.find(t => t.id === selectedTheme) || THEMES[0]
  const showThemePicker = !preselectedTheme && !generated

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-medium text-white">Guided Meditation</h2>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10">
          <X className="w-5 h-5 text-white/75" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-6">
        {!generated ? (
          <>
            {/* Theme picker (only when no preselected theme) */}
            {showThemePicker && (
              <div>
                <p className="text-xs text-white/70 mb-3">Choose a theme</p>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {THEMES.map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        selectedTheme === theme.id
                          ? `bg-gradient-to-r ${theme.color} border border-white/25 text-white`
                          : 'bg-white/5 border border-white/5 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      {theme.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Show selected theme name when preselected */}
            {preselectedTheme && (
              <div className="text-center pt-4">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${themeObj.color} flex items-center justify-center mx-auto mb-3`}>
                  <Sparkles className="w-8 h-8 text-white/85" />
                </div>
                <p className="text-lg font-medium text-white">{themeObj.label}</p>
              </div>
            )}

            {/* Duration selector */}
            <div>
              <p className="text-xs text-white/70 mb-3">Duration</p>
              <div className="flex gap-3">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setSelectedDuration(d)}
                    className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-1.5 text-sm transition-all ${
                      selectedDuration === d
                        ? 'bg-purple-500/20 border border-purple-500/30 text-purple-300'
                        : 'bg-white/5 border border-white/5 text-white/70'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {d} min
                  </button>
                ))}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generate}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-500/30 to-cyan-500/30 border border-purple-500/20 text-sm font-medium text-white flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating your meditation...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Meditation
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* Playing state */}
            <div className="flex flex-col items-center pt-8 space-y-6">
              {/* Animated orb */}
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${themeObj.color} flex items-center justify-center ${isPlaying ? 'animate-pulse' : ''}`}>
                {audioBase64 ? (
                  <button onClick={togglePlay} className="p-4">
                    {isPlaying ? (
                      <Pause className="w-10 h-10 text-white" />
                    ) : (
                      <Play className="w-10 h-10 text-white fill-white" />
                    )}
                  </button>
                ) : (
                  <Sparkles className="w-10 h-10 text-white/75" />
                )}
              </div>

              <div className="text-center">
                <p className="text-lg font-medium text-white">{themeObj.label}</p>
                <p className="text-xs text-white/60">{selectedDuration} minute meditation</p>
              </div>
            </div>

            {/* Script display */}
            {script && (
              <div className="bg-white/5 rounded-2xl p-4 max-h-60 overflow-y-auto">
                <p className="text-xs text-white/70 mb-2">Script</p>
                <p className="text-xs text-white/85 leading-relaxed whitespace-pre-line">{script}</p>
              </div>
            )}

            {!audioBase64 && script && (
              <p className="text-[10px] text-white/50 text-center">Audio generation unavailable. Read the script above for guidance.</p>
            )}

            {/* New meditation button */}
            <button
              onClick={() => { setGenerated(false); setScript(''); setAudioBase64(null); setIsPlaying(false) }}
              className="w-full text-xs text-white/50 py-2"
            >
              Generate another
            </button>
          </>
        )}
      </div>
    </div>
  )
}
