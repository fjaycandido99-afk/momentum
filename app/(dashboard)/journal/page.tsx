'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { PenLine, ChevronLeft, ChevronRight, Loader2, Heart, Target, Sparkles, BookOpen, Calendar, X } from 'lucide-react'
import { CalendarView } from '@/components/daily-guide/CalendarView'
import { WeeklyReview, WeeklyReviewPrompt } from '@/components/daily-guide/WeeklyReview'
import { GoalTracker } from '@/components/daily-guide/GoalTracker'

interface JournalDay {
  date: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_intention?: string | null
}

export default function JournalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <JournalContent />
    </Suspense>
  )
}

function JournalContent() {
  const searchParams = useSearchParams()
  const [sparkPrompt, setSparkPrompt] = useState<string | null>(null)
  const [win, setWin] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [intention, setIntention] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [pastEntries, setPastEntries] = useState<JournalDay[]>([])
  const [loadingPast, setLoadingPast] = useState(true)
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)
  const [streak, setStreak] = useState(0)
  const [reflection, setReflection] = useState<string | null>(null)

  // Read spark prompt from URL
  useEffect(() => {
    const spark = searchParams.get('spark')
    if (spark) setSparkPrompt(spark)
  }, [searchParams])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  // Load journal for selected date
  useEffect(() => {
    const loadJournal = async () => {
      setIsLoading(true)
      setIsSaved(false)
      setReflection(null)
      try {
        const dateStr = selectedDate.toISOString().split('T')[0]
        const response = await fetch(`/api/daily-guide/journal?date=${dateStr}`)
        if (response.ok) {
          const data = await response.json()
          setWin(data.journal_win || '')
          setGratitude(data.journal_gratitude || '')
          setIntention(data.journal_intention || '')
          if (data.journal_ai_reflection) setReflection(data.journal_ai_reflection)
          if (data.journal_win || data.journal_gratitude || data.journal_intention) {
            setIsSaved(true)
          }
        } else {
          setWin('')
          setGratitude('')
          setIntention('')
        }
      } catch (error) {
        console.error('Failed to load journal:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadJournal()
  }, [selectedDate])

  // Load past entries and streak
  useEffect(() => {
    const loadPastEntries = async () => {
      setLoadingPast(true)
      try {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 14)
        const response = await fetch(
          `/api/daily-guide/journal?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        )
        if (response.ok) {
          const data = await response.json()
          const entries = (data.entries || []).filter(
            (e: any) => e.journal_win || e.journal_gratitude || e.journal_intention
          )
          setPastEntries(entries)
        }
      } catch (error) {
        console.error('Failed to load past entries:', error)
      } finally {
        setLoadingPast(false)
      }
    }
    const loadStreak = async () => {
      try {
        const res = await fetch('/api/daily-guide/preferences')
        if (res.ok) {
          const data = await res.json()
          setStreak(data.current_streak || 0)
        }
      } catch {}
    }
    loadPastEntries()
    loadStreak()
  }, [])

  const handleSave = async () => {
    if (!win.trim() && !gratitude.trim() && !intention.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate.toISOString(),
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
      }
    } catch (error) {
      console.error('Failed to save journal:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const goDay = (offset: number) => {
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + offset)
    if (next <= new Date()) {
      setSelectedDate(next)
    }
  }

  const hasContent = win.trim() || gratitude.trim() || intention.trim()
  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 section-fade-bg">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-amber-500/20">
            <PenLine className="w-5 h-5 text-amber-400" />
          </div>
          <h1 className="text-2xl font-light">Journal</h1>
        </div>
        <p className="text-white/50 text-sm ml-12">Reflect, grow, remember</p>
      </div>

      {/* Date Picker */}
      <div className="px-6 mb-6">
        <div className="flex items-center justify-between p-3 card-gradient-border">
          <button
            onClick={() => goDay(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/60" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-white">{dateLabel}</p>
            {isToday && <p className="text-[10px] text-amber-400">Today</p>}
          </div>
          <button
            onClick={() => goDay(1)}
            disabled={isToday}
            className={`p-1.5 rounded-lg transition-colors ${isToday ? 'opacity-30' : 'hover:bg-white/10'}`}
          >
            <ChevronRight className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      {/* Spark Prompt */}
      {sparkPrompt && (
        <div className="px-6 mb-4 animate-fade-in">
          <div className="relative p-4 card-gradient-border">
            <button
              onClick={() => setSparkPrompt(null)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-white/40" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="p-1.5 rounded-lg bg-violet-500/20 mt-0.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-violet-300/70 uppercase tracking-wider mb-1">Reflect on this</p>
                <p className="text-sm text-white/90 leading-relaxed italic">&ldquo;{sparkPrompt}&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal Form */}
      <div className="px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* What did you learn */}
            <div className="p-4 card-gradient-border">
              <label className="text-sm text-white/80 flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                What did you learn today?
              </label>
              <textarea
                value={win}
                onChange={(e) => { setWin(e.target.value); setIsSaved(false) }}
                placeholder="Today I learned..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-right text-[10px] text-white/20 mt-1">{win.length}/500</p>
            </div>

            {/* Gratitude */}
            <div className="p-4 card-gradient-border">
              <label className="text-sm text-white/80 flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-pink-400" />
                What are you grateful for?
              </label>
              <textarea
                value={gratitude}
                onChange={(e) => { setGratitude(e.target.value); setIsSaved(false) }}
                placeholder="I'm grateful for..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                rows={3}
                maxLength={500}
              />
              <p className="text-right text-[10px] text-white/20 mt-1">{gratitude.length}/500</p>
            </div>

            {/* Intention */}
            <div className="p-4 card-gradient-border">
              <label className="text-sm text-white/80 flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-purple-400" />
                Tomorrow&apos;s intention
              </label>
              <textarea
                value={intention}
                onChange={(e) => { setIntention(e.target.value); setIsSaved(false) }}
                placeholder="Tomorrow I will..."
                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
                rows={2}
                maxLength={300}
              />
              <p className="text-right text-[10px] text-white/20 mt-1">{intention.length}/300</p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={!hasContent || isSaving || isSaved}
              className={`w-full py-3 card-gradient-border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isSaved
                  ? 'text-emerald-400'
                  : hasContent
                  ? 'text-white'
                  : 'text-white/30 cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
              ) : isSaved ? (
                <><BookOpen className="w-4 h-4" /> Saved</>
              ) : (
                'Save Entry'
              )}
            </button>

            {/* AI Insight */}
            {reflection && (
              <div className="p-4 card-gradient-border">
                <div className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium tracking-wider text-indigo-400/70 uppercase mb-1">AI Insight</p>
                    <p className="text-sm text-white/80 leading-relaxed italic">{reflection}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Goals */}
      <div className="px-6 mt-8">
        <GoalTracker />
      </div>

      {/* Weekly Review */}
      <div className="px-6 mt-8">
        <WeeklyReviewPrompt onOpen={() => setShowWeeklyReview(true)} />
      </div>

      {/* Calendar */}
      <div className="px-6 mt-6">
        <CalendarView currentStreak={streak} />
      </div>

      {/* Recent Entries */}
      <div className="px-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-white/50" />
          <h2 className="text-sm font-medium text-white/70 uppercase tracking-wider">Recent Entries</h2>
        </div>

        {loadingPast ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
          </div>
        ) : pastEntries.length === 0 ? (
          <div className="text-center py-8">
            <PenLine className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-white/40 text-sm">No entries yet</p>
            <p className="text-white/25 text-xs mt-1">Start journaling to see your history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pastEntries.map((entry, i) => {
              const entryDate = new Date(entry.date)
              const label = entryDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              const isSelected = entryDate.toDateString() === selectedDate.toDateString()

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(entryDate)}
                  className={`w-full text-left p-4 card-gradient-border transition-all ${
                    isSelected
                      ? 'ring-1 ring-amber-500/40'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <p className={`text-xs mb-1.5 ${isSelected ? 'text-amber-400' : 'text-white/40'}`}>
                    {label}
                  </p>
                  {entry.journal_win && (
                    <p className="text-sm text-white/80 line-clamp-2">{entry.journal_win}</p>
                  )}
                  {entry.journal_gratitude && !entry.journal_win && (
                    <p className="text-sm text-white/60 line-clamp-2 italic">{entry.journal_gratitude}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {entry.journal_win && <span className="text-[10px] text-amber-400/60">✦ Learned</span>}
                    {entry.journal_gratitude && <span className="text-[10px] text-pink-400/60">♥ Grateful</span>}
                    {entry.journal_intention && <span className="text-[10px] text-purple-400/60">◎ Intention</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
        <WeeklyReview
          isModal={true}
          onClose={() => setShowWeeklyReview(false)}
        />
      )}
    </div>
  )
}
