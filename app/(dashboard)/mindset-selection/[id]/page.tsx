'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useMindset } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { MINDSET_IDS, type MindsetId } from '@/lib/mindset/types'
import { MINDSET_VOICES, SAMPLE_PROMISE } from '@/lib/mindset/voice-samples'
import { ERA_PRESETS_BY_KEY } from '@/lib/era/presets'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * A mindset, explained by what it does: it's the voice your coach speaks in.
 *
 * So the page leads with the voice — the same sample promise every mindset
 * answers, in this one's words — and the eras it suits, then the philosophy
 * behind it for anyone who wants the history. It used to open on a small
 * portrait and a biography, and never said what choosing it would change.
 */
export default function MindsetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { setMindset } = useMindset()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Validate mindset ID
  if (!MINDSET_IDS.includes(id as MindsetId)) {
    router.replace('/mindset-selection')
    return null
  }

  const mindsetId = id as MindsetId
  const config = MINDSET_CONFIGS[mindsetId]
  const detail = MINDSET_DETAILS[mindsetId]
  const voice = MINDSET_VOICES[mindsetId]
  const pairs = voice.pairsWith.map(k => ERA_PRESETS_BY_KEY.get(k)?.title).filter(Boolean) as string[]

  const handleChoose = async () => {
    setIsSubmitting(true)
    try {
      await setMindset(mindsetId)
      router.push('/daily-guide/onboarding')
    } catch (error) {
      console.error('Failed to save mindset:', error)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back — clears the notch; it used to sit under the status bar. */}
      <button
        onClick={() => router.back()}
        className="fixed left-4 z-30 p-2 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-white/85" />
      </button>

      {/* Hero — the portrait full-bleed, the name set over its foot. */}
      <div className="relative w-full aspect-[4/5] max-h-[62vh] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/portraits/cards/${mindsetId}.jpg`}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover object-top grayscale opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
          <p className="text-[10px] tracking-[0.28em] uppercase text-white/60">{voice.tagline}</p>
          <h1 className="text-[48px] leading-[0.9] uppercase mt-1.5" style={{ ...SERIF, fontWeight: 600 }}>
            {config.name}
          </h1>
          <p className="text-xs text-white/55 mt-2">
            Inspired by {detail.figureName} · {detail.figureDates}
          </p>
        </div>
      </div>

      <div className="px-6 pb-40 space-y-8">
        <p className="text-[19px] text-white/85 leading-snug italic mt-2" style={SERIF}>
          &ldquo;{detail.quote}&rdquo;
        </p>

        {/* The voice itself: the same promise every mindset answers. */}
        <section>
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-3">How your coach will sound</h3>
          <div className="rounded-2xl border border-white/[0.14] bg-white/[0.03] p-4 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">You promise</p>
              <p className="text-sm text-white/80 mt-1">&ldquo;{SAMPLE_PROMISE}&rdquo;</p>
            </div>
            <div className="border-l-2 border-white/30 pl-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{config.coachName}</p>
              <p className="text-[17px] text-white leading-snug mt-1" style={SERIF}>{voice.reply}</p>
            </div>
          </div>
        </section>

        {pairs.length > 0 && (
          <section>
            <h3 className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-3">Pairs well with</h3>
            <div className="flex flex-wrap gap-2">
              {pairs.map(t => (
                <span key={t} className="rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/85">{t}</span>
              ))}
            </div>
            <p className="text-[11px] text-white/40 mt-2">Any era works with any voice — these just fit naturally.</p>
          </section>
        )}

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-3">The philosophy</h3>
          <p className="text-white/65 text-sm leading-relaxed">{detail.overview}</p>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-4">Core principles</h3>
          <div className="space-y-4">
            {detail.principles.map(p => (
              <div key={p.title} className="pl-3 border-l border-white/15">
                <h4 className="text-sm font-medium text-white/90">{p.title}</h4>
                <p className="text-white/50 text-xs mt-1 leading-relaxed">{p.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-[0.24em] text-white/45 mb-4">What changes for you</h3>
          <div className="space-y-2.5">
            {detail.appExperience.map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-white/25 mt-0.5 text-xs">&#9702;</span>
                <p className="text-white/60 text-xs leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-10 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] bg-gradient-to-t from-black from-70% to-transparent pointer-events-none">
        <button
          onClick={handleChoose}
          disabled={isSubmitting}
          className="pointer-events-auto w-full py-4 rounded-2xl font-medium text-sm transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 active:scale-[0.98]"
        >
          {isSubmitting ? 'Saving...' : `Choose ${config.name}`}
        </button>
      </div>
    </div>
  )
}
