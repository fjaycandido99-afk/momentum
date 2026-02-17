'use client'

import { useState, useEffect, useMemo } from 'react'
import { PenLine, Check, Loader2, X, Sparkles, Heart, Target, Crown } from 'lucide-react'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MINDSET_JOURNAL_PROMPTS } from '@/lib/mindset/journal-prompts'

interface JournalEntryProps {
  date?: Date
  onClose?: () => void
  showAsModal?: boolean
}

export function JournalEntry({ date, onClose, showAsModal = false }: JournalEntryProps) {
  const subscription = useSubscriptionOptional()
  const canSeeReflections = subscription?.checkAccess('ai_reflections') ?? false
  const mindsetCtx = useMindsetOptional()
  const prompts = useMemo(() => {
    const mindset = mindsetCtx?.mindset || 'scholar'
    return MINDSET_JOURNAL_PROMPTS[mindset]
  }, [mindsetCtx?.mindset])
  const [win, setWin] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [intention, setIntention] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [reflection, setReflection] = useState<string | null>(null)

  // Load existing journal entry
  useEffect(() => {
    const loadJournal = async () => {
      try {
        const targetDate = date || new Date()
        const dateStr = targetDate.toISOString().split('T')[0]
        const response = await fetch(`/api/daily-guide/journal?date=${dateStr}`)
        if (response.ok) {
          const data = await response.json()
          if (data.journal_win) setWin(data.journal_win)
          if (data.journal_gratitude) setGratitude(data.journal_gratitude)
          if (data.journal_intention) setIntention(data.journal_intention)
          if (data.journal_ai_reflection) setReflection(data.journal_ai_reflection)
          if (data.journal_win || data.journal_gratitude || data.journal_intention) {
            setIsSaved(true)
          }
        }
      } catch (error) {
        console.error('Failed to load journal:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadJournal()
  }, [date])

  const handleSave = async () => {
    if (!win.trim() && !gratitude.trim() && !intention.trim()) return

    setIsSaving(true)
    try {
      const targetDate = date || new Date()
      const response = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate.toISOString(),
          journal_win: win.trim() || undefined,
          journal_gratitude: gratitude.trim() || undefined,
          journal_intention: intention.trim() || undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setIsSaved(true)
        if (data.data?.journal_ai_reflection) {
          setReflection(data.data.journal_ai_reflection)
        }
        if (showAsModal && onClose) {
          setTimeout(onClose, 1500)
        }
      }
    } catch (error) {
      console.error('Failed to save journal:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const hasContent = win.trim() || gratitude.trim() || intention.trim()

  const content = (
    <div className="w-full">
      {/* Header */}
      <div className="pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/10">
            <PenLine className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Daily Reflection</h3>
            <p className="text-xs text-white/95">Capture your thoughts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && !isSaved && hasContent && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              aria-busy={isSaving}
              className="px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              {isSaving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving</>
              ) : (
                'Save'
              )}
            </button>
          )}
          {isSaved && !showAsModal && (
            <span className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 text-emerald-400">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        {showAsModal && onClose && (
          <button
            onClick={onClose}
            aria-label="Close journal"
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <X className="w-4 h-4 text-white/95" />
          </button>
        )}
        </div>
      </div>

      {/* Content */}
      <div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/95 animate-spin" />
          </div>
        ) : isSaved && !showAsModal ? (
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Saved</span>
            </div>
            {win && <p className="text-white/95 text-sm italic">&quot;{win}&quot;</p>}
            {gratitude && (
              <div className="flex items-start gap-2">
                <Heart className="w-3.5 h-3.5 text-pink-400 mt-0.5 shrink-0" />
                <p className="text-white/95 text-sm italic">{gratitude}</p>
              </div>
            )}
            {intention && (
              <div className="flex items-start gap-2">
                <Target className="w-3.5 h-3.5 text-purple-400 mt-0.5 shrink-0" />
                <p className="text-white/95 text-sm italic">{intention}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Prompt 1 */}
            <div>
              <label className="text-sm text-white/95 flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                {prompts.prompt1.label}
              </label>
              <textarea
                value={win}
                onChange={(e) => { setWin(e.target.value); setIsSaved(false) }}
                placeholder={prompts.prompt1.placeholder}
                aria-label={prompts.prompt1.label}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 resize-none focus-visible:ring-2 focus-visible:ring-white/40"
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Prompt 2 */}
            <div>
              <label className="text-sm text-white/95 flex items-center gap-2 mb-2">
                <Heart className="w-3.5 h-3.5 text-pink-400" />
                {prompts.prompt2.label}
              </label>
              <textarea
                value={gratitude}
                onChange={(e) => { setGratitude(e.target.value); setIsSaved(false) }}
                placeholder={prompts.prompt2.placeholder}
                aria-label={prompts.prompt2.label}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 resize-none focus-visible:ring-2 focus-visible:ring-white/40"
                rows={2}
                maxLength={500}
              />
            </div>

            {/* Prompt 3 */}
            <div>
              <label className="text-sm text-white/95 flex items-center gap-2 mb-2">
                <Target className="w-3.5 h-3.5 text-purple-400" />
                {prompts.prompt3.label}
              </label>
              <textarea
                value={intention}
                onChange={(e) => { setIntention(e.target.value); setIsSaved(false) }}
                placeholder={prompts.prompt3.placeholder}
                aria-label={prompts.prompt3.label}
                className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-white/30 resize-none focus-visible:ring-2 focus-visible:ring-white/40"
                rows={2}
                maxLength={300}
              />
            </div>

            {/* AI Insight — gated behind ai_reflections */}
            {reflection && canSeeReflections && (
              <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium tracking-wider text-indigo-400/70 uppercase mb-1">AI Insight</p>
                    <p className="text-sm text-white/95 leading-relaxed italic">{reflection}</p>
                  </div>
                </div>
              </div>
            )}
            {reflection && !canSeeReflections && (
              <div className="p-3 rounded-xl bg-white/5 border border-white/15">
                <div className="flex items-center gap-2">
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-white/95">Upgrade for AI reflections on your journal entries</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (showAsModal) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Daily reflection" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
        <div className="w-full max-w-md my-8 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/15 overflow-hidden">
          {content}
        </div>
      </div>
    )
  }

  return content
}

export function JournalPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      aria-label="Open daily reflection"
      className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all group focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
          <PenLine className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-left">
          <h3 className="font-medium text-white">Reflect on your day</h3>
          <p className="text-xs text-white/95">What did you learn today?</p>
        </div>
      </div>
    </button>
  )
}
