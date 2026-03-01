'use client'

import { useState, useMemo, useCallback } from 'react'
import { ChevronDown, Heart, Send } from 'lucide-react'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_QUOTES } from '@/lib/mindset/quotes'
import { MINDSET_DAILY_QUESTIONS } from '@/lib/mindset/daily-questions'

function dateSeed(dateStr: string): number {
  let hash = 0
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function WisdomSection() {
  const mindsetCtx = useMindsetOptional()
  const [expanded, setExpanded] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [reflection, setReflection] = useState('')
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [reflectionError, setReflectionError] = useState(false)

  const mindsetId = mindsetCtx?.mindset || 'stoic'
  const config = mindsetCtx?.config

  const today = useMemo(() => new Date().toISOString().split('T')[0], [])

  const dailyQuote = useMemo(() => {
    const quotes = MINDSET_QUOTES[mindsetId]
    if (!quotes || quotes.length === 0) return null
    const idx = dateSeed(today) % quotes.length
    return quotes[idx]
  }, [mindsetId, today])

  const dailyQuestion = useMemo(() => {
    const questions = MINDSET_DAILY_QUESTIONS[mindsetId]
    if (!questions || questions.length === 0) return null
    const idx = dateSeed(today + '_q') % questions.length
    return questions[idx]
  }, [mindsetId, today])

  const handleSaveQuote = useCallback(async () => {
    if (saved || !dailyQuote) return
    setSaved(true)
    setSaveError(false)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'quote',
          content_text: `"${dailyQuote.text}" — ${dailyQuote.author}`,
          content_id: `quote_${mindsetId}_${today}`,
          content_title: `${config?.name || 'Daily'} Wisdom`,
        }),
      })
      if (!res.ok) {
        setSaved(false)
        setSaveError(true)
      }
    } catch {
      setSaved(false)
      setSaveError(true)
    }
  }, [saved, dailyQuote, mindsetId, today, config?.name])

  const handleSaveReflection = useCallback(async () => {
    if (!reflection.trim() || reflectionSaved) return
    setReflectionSaved(true)
    setReflectionError(false)
    try {
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content_type: 'reflection',
          content_text: reflection.trim(),
          content_id: `reflection_${mindsetId}_${today}`,
          content_title: dailyQuestion || 'Daily Reflection',
        }),
      })
      if (!res.ok) {
        setReflectionSaved(false)
        setReflectionError(true)
      }
    } catch {
      setReflectionSaved(false)
      setReflectionError(true)
    }
  }, [reflection, reflectionSaved, mindsetId, today, dailyQuestion])

  if (!dailyQuote) return null

  return (
    <div className="px-5 mt-6">
      <div className="glass-refined rounded-2xl overflow-hidden">
        {/* Quote Card */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm">{config?.icon || '💡'}</span>
              <h3 className="text-sm font-semibold text-white">
                {config?.name || 'Daily'} Wisdom
              </h3>
            </div>
            <button
              onClick={handleSaveQuote}
              className="p-1.5 rounded-full hover:bg-white/5 transition-colors"
              aria-label="Save quote"
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  saved ? 'text-rose-400 fill-rose-400' : saveError ? 'text-red-400 animate-pulse' : 'text-white/40'
                }`}
              />
            </button>
          </div>

          <blockquote className="text-sm text-white/90 leading-relaxed italic">
            &ldquo;{dailyQuote.text}&rdquo;
          </blockquote>
          <p className="text-[11px] text-white/50 mt-2">
            — {dailyQuote.author}
          </p>
        </div>

        {/* Expand toggle for reflection */}
        {dailyQuestion && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] hover:bg-white/[0.02] transition-colors"
            >
              <span className="text-[11px] text-white/50 font-medium">
                Daily Reflection
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-white/40 transition-transform duration-200 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>

            {expanded && (
              <div className="px-4 pb-4 animate-fade-in-up">
                <p className="text-xs text-white/80 mb-3 leading-relaxed">
                  {dailyQuestion}
                </p>
                <div className="relative">
                  <textarea
                    value={reflection}
                    onChange={e => setReflection(e.target.value)}
                    placeholder="Write your reflection..."
                    rows={3}
                    disabled={reflectionSaved}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-xs text-white/90 placeholder-white/30 resize-none focus:outline-none focus:border-white/20 transition-colors disabled:opacity-50"
                  />
                  {reflection.trim() && !reflectionSaved && (
                    <button
                      onClick={handleSaveReflection}
                      className="absolute bottom-3 right-3 p-1.5 rounded-full bg-white/10 hover:bg-white/15 transition-colors"
                      aria-label="Save reflection"
                    >
                      <Send className="w-3 h-3 text-white/70" />
                    </button>
                  )}
                  {reflectionSaved && (
                    <p className="text-[10px] text-emerald-400/70 mt-1.5">
                      Reflection saved
                    </p>
                  )}
                  {reflectionError && (
                    <p className="text-[10px] text-red-400/70 mt-1.5">
                      Couldn&apos;t save — tap to retry
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
