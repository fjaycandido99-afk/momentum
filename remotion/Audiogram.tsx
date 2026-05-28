import React from 'react'
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { useAudioData, visualizeAudio } from '@remotion/media-utils'

export interface AudiogramProps {
  quote: string
  author: string
  mindset?: string
  /** Spoken-quote audio (ElevenLabs, cached). Public URL. */
  audioSrc: string
}

// The audiogram — a 9:16 monochrome video matching the app's aura: drifting
// glows on black, the quote fading in, an audio-synced waveform, and a
// "Listen on Voxu" wordmark. Reuses no app code on purpose (Remotion renders in
// its own pipeline), but mirrors the visual language exactly.
export const Audiogram: React.FC<AudiogramProps> = ({ quote, author, mindset, audioSrc }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const audioData = useAudioData(audioSrc)

  // Slow drift for the ambient glows (seconds-based sine, GPU-cheap look).
  const drift = (periodSec: number, amp: number, phase = 0) =>
    Math.sin((frame / fps / periodSec) * Math.PI * 2 + phase) * amp

  const quoteOpacity = interpolate(frame, [10, 45], [0, 1], { extrapolateRight: 'clamp' })
  const quoteY = interpolate(frame, [10, 45], [28, 0], { extrapolateRight: 'clamp' })

  // Audio-reactive waveform bars (FFT magnitudes 0..1).
  const bars = audioData
    ? visualizeAudio({ fps, frame, audioData, numberOfSamples: 32, smoothing: true })
    : new Array(32).fill(0)

  return (
    <AbsoluteFill style={{ backgroundColor: '#000', fontFamily: 'Inter, sans-serif' }}>
      <Audio src={audioSrc} />

      {/* Ambient drifting glows + corner vignette */}
      <AbsoluteFill style={{ overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 1000, height: 1000, top: 180 + drift(16, 50), left: -180 + drift(20, 60, 1), borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.10), rgba(255,255,255,0.03) 40%, transparent 70%)' }} />
        <div style={{ position: 'absolute', width: 760, height: 760, bottom: 120 + drift(22, 55, 2), right: -140 + drift(18, 45, 0.5), borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.07), transparent 70%)' }} />
        <AbsoluteFill style={{ background: 'radial-gradient(120% 90% at 50% 16%, transparent 50%, rgba(0,0,0,0.6))' }} />
      </AbsoluteFill>

      {/* Quote block */}
      <AbsoluteFill style={{ padding: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {mindset && (
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 30, letterSpacing: 8, textTransform: 'uppercase', fontWeight: 600, marginBottom: 44 }}>
            {mindset} Path
          </div>
        )}
        <div style={{ opacity: quoteOpacity, transform: `translateY(${quoteY}px)`, color: '#fff', fontSize: 78, lineHeight: 1.25, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
          &ldquo;{quote}&rdquo;
        </div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 38, marginTop: 44 }}>&mdash; {author}</div>
      </AbsoluteFill>

      {/* Audio-synced waveform */}
      <div style={{ position: 'absolute', bottom: 240, left: 120, right: 120, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {bars.map((v, i) => (
          <div key={i} style={{ width: 8, borderRadius: 6, height: Math.max(8, v * 700), background: `rgba(255,255,255,${0.55 + v * 0.45})` }} />
        ))}
      </div>

      {/* Wordmark */}
      <div style={{ position: 'absolute', bottom: 110, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.8)', fontSize: 36, fontWeight: 600, letterSpacing: 2 }}>
        &#9654;&nbsp;&nbsp;Listen on Voxu
      </div>
      <div style={{ position: 'absolute', bottom: 64, left: 0, right: 0, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 26 }}>
        voxu.app
      </div>
    </AbsoluteFill>
  )
}
