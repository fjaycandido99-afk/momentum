'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { useMindset } from '@/contexts/MindsetContext'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { MINDSET_IDS, type MindsetId } from '@/lib/mindset/types'
import { MindsetPortrait } from '@/components/mindset/MindsetPortrait'

export default function MindsetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { setMindset } = useMindset()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const id = params.id as string

  // Validate mindset ID
  if (!MINDSET_IDS.includes(id as MindsetId)) {
    router.replace('/mindset-selection')
    return null
  }

  const mindsetId = id as MindsetId
  const config = MINDSET_CONFIGS[mindsetId]
  const detail = MINDSET_DETAILS[mindsetId]

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
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="fixed top-4 left-4 z-10 p-2 rounded-full bg-white/[0.06] hover:bg-white/10 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-white/70" />
      </button>

      {/* Portrait — fades into background */}
      <div className="pt-10 -mb-4 flex justify-center">
        <MindsetPortrait mindsetId={mindsetId} size="lg" />
      </div>

      {/* Figure info — overlaps slightly with portrait fade */}
      <div className="relative text-center px-6">
        <p className="text-white/35 text-[11px] uppercase tracking-[0.2em]">
          {detail.figureDates}
        </p>
        <h2 className="text-xl font-light mt-1.5 tracking-wide">
          {detail.figureName}
        </h2>
        <p className="text-white/45 text-xs mt-1">
          {detail.figureTitle}
        </p>
      </div>

      {/* Mindset header */}
      <div className="text-center px-6 mt-6">
        <span className="text-4xl">{config.icon}</span>
        <h1 className="text-2xl font-light mt-3 tracking-wide">
          {config.name}
        </h1>
        <p className="text-white/50 text-sm mt-3 italic leading-relaxed max-w-xs mx-auto">
          &ldquo;{detail.quote}&rdquo;
        </p>
      </div>

      {/* Divider */}
      <div className="mx-auto mt-8 w-12 h-px bg-white/10" />

      {/* Philosophy overview */}
      <section className="px-6 mt-8">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/35 mb-3">
          The Philosophy
        </h3>
        <p className="text-white/65 text-sm leading-relaxed">
          {detail.overview}
        </p>
      </section>

      {/* Core principles */}
      <section className="px-6 mt-8">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/35 mb-4">
          Core Principles
        </h3>
        <div className="space-y-4">
          {detail.principles.map((p) => (
            <div key={p.title} className="pl-3 border-l border-white/10">
              <h4 className="text-sm font-medium text-white/90">{p.title}</h4>
              <p className="text-white/45 text-xs mt-1 leading-relaxed">
                {p.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Your Experience */}
      <section className="px-6 mt-8 pb-36">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-white/35 mb-4">
          What Changes For You
        </h3>
        <div className="space-y-2.5">
          {detail.appExperience.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="text-white/20 mt-0.5 text-xs">&#9702;</span>
              <p className="text-white/55 text-xs leading-relaxed">{item}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Sticky bottom button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pt-10 pb-6 bg-gradient-to-t from-black from-70% to-transparent">
        <button
          onClick={handleChoose}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl font-medium text-sm transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed bg-white text-black hover:bg-white/90 active:scale-[0.98]"
        >
          {isSubmitting ? 'Saving...' : `Choose ${config.name}`}
        </button>
      </div>
    </div>
  )
}
