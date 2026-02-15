'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  PenLine, ChevronLeft, ChevronRight, Loader2, Heart, Target,
  Sparkles, BookOpen, Calendar, X, Crown, Lock, Shuffle, ChevronDown,
  MessageCircle, Moon, Send, Save,
} from 'lucide-react'
import { CalendarView } from '@/components/daily-guide/CalendarView'
import { WeeklyReview, WeeklyReviewPrompt } from '@/components/daily-guide/WeeklyReview'
import { GoalTracker } from '@/components/daily-guide/GoalTracker'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { MINDSET_JOURNAL_PROMPTS } from '@/lib/mindset/journal-prompts'
import { MoodSelector, type MoodValue } from '@/components/journal/MoodSelector'
import { VoiceInput } from '@/components/journal/VoiceInput'
import { JournalStats, calculateJournalStats, type JournalStatsData } from '@/components/journal/JournalStats'
import { HeatMapStrip } from '@/components/journal/HeatMapStrip'
import { getPromptForDate, getShuffledPrompt } from '@/components/journal/JournalPrompts'
import { useKeyboardAware } from '@/hooks/useKeyboardAware'
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea'

interface JournalEntry {
  date: string
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_learned?: string | null
  journal_intention?: string | null
  journal_freetext?: string | null
  journal_mood?: string | null
  journal_prompt?: string | null
  journal_tags?: string[]
}

type JournalMode = 'guided' | 'freewrite' | 'conversational' | 'dream'

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface DreamInterpretation {
  symbols: { symbol: string; meaning: string }[]
  emotionalTheme: string
  connectionToLife: string
  mindsetReflection: string
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
  const { checkAccess, openUpgradeModal } = useSubscription()
  const mindsetCtx = useMindsetOptional()
  const hasJournalHistory = checkAccess('journal_history')

  // Existing state
  const [sparkPrompt, setSparkPrompt] = useState<string | null>(null)
  const [win, setWin] = useState('')
  const [gratitude, setGratitude] = useState('')
  const [intention, setIntention] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loadingPast, setLoadingPast] = useState(true)
  const [showWeeklyReview, setShowWeeklyReview] = useState(false)
  const [streak, setStreak] = useState(0)
  const [reflection, setReflection] = useState<string | null>(null)

  // New state
  const [mode, setMode] = useState<JournalMode>('freewrite')
  const [freeText, setFreeText] = useState('')
  const [mood, setMood] = useState<MoodValue | null>(null)
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0)
  const [interimText, setInterimText] = useState('')
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([])
  const [journalStats, setJournalStats] = useState<JournalStatsData>({ currentStreak: 0, longestStreak: 0, totalEntries: 0, totalWords: 0 })
  const [showAllRecent, setShowAllRecent] = useState(false)
  const [journalTags, setJournalTags] = useState<string[]>([])

  // Conversational journal state
  const [conversation, setConversation] = useState<ConversationMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Dream journal state
  const [dreamText, setDreamText] = useState('')
  const [dreamInterpretation, setDreamInterpretation] = useState<DreamInterpretation | null>(null)
  const [dreamLoading, setDreamLoading] = useState(false)
  const [dreamSaved, setDreamSaved] = useState(false)

  const activeFieldRef = useRef<'win' | 'gratitude' | 'intention' | 'freewrite'>('freewrite')

  // Mobile keyboard UX
  useKeyboardAware()
  const freeTextRef = useRef<HTMLTextAreaElement>(null)
  const winRef = useRef<HTMLTextAreaElement>(null)
  const gratitudeRef = useRef<HTMLTextAreaElement>(null)
  const intentionRef = useRef<HTMLTextAreaElement>(null)
  const dreamRef = useRef<HTMLTextAreaElement>(null)
  useAutoResizeTextarea(freeTextRef, freeText)
  useAutoResizeTextarea(winRef, win)
  useAutoResizeTextarea(gratitudeRef, gratitude)
  useAutoResizeTextarea(intentionRef, intention)
  useAutoResizeTextarea(dreamRef, dreamText)

  // Read spark prompt from URL
  useEffect(() => {
    const spark = searchParams.get('spark')
    if (spark) setSparkPrompt(spark)
  }, [searchParams])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  // Set initial prompt for date
  useEffect(() => {
    const { index } = getPromptForDate(selectedDate)
    setCurrentPromptIndex(index)
  }, [selectedDate])

  // Load journal for selected date
  useEffect(() => {
    const loadJournal = async () => {
      setIsLoading(true)
      setIsSaved(false)
      setReflection(null)
      setDreamText('')
      setDreamInterpretation(null)
      setDreamSaved(false)
      setConversation([])
      setJournalTags([])
      try {
        const dateStr = selectedDate.toISOString().split('T')[0]
        const response = await fetch(`/api/daily-guide/journal?date=${dateStr}`)
        if (response.ok) {
          const data = await response.json()
          setWin(data.journal_win || '')
          setGratitude(data.journal_gratitude || '')
          setIntention(data.journal_intention || '')
          setFreeText(data.journal_freetext || '')
          setMood(data.journal_mood || null)
          if (data.journal_ai_reflection) setReflection(data.journal_ai_reflection)

          // Restore dream data
          if (data.journal_dream) {
            setDreamText(data.journal_dream)
            if (data.journal_dream_interpretation) {
              try {
                setDreamInterpretation(JSON.parse(data.journal_dream_interpretation))
                setDreamSaved(true)
              } catch {}
            }
          }

          // Restore conversation data
          if (data.journal_conversation) {
            try {
              const parsed = JSON.parse(data.journal_conversation)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setConversation(parsed)
              }
            } catch {}
          }

          // Auto-detect mode from existing data
          const hasGuided = data.journal_win || data.journal_gratitude || data.journal_intention
          const hasFreewrite = data.journal_freetext
          const hasDream = data.journal_dream
          const hasConversation = data.journal_conversation

          if (hasDream) {
            setMode('dream')
          } else if (hasConversation) {
            setMode('conversational')
          } else if (hasGuided && !hasFreewrite) {
            setMode('guided')
          } else if (hasFreewrite && !hasGuided) {
            setMode('freewrite')
          }
          // If both or neither, keep current mode

          if (hasGuided || hasFreewrite || hasDream || hasConversation) {
            setIsSaved(true)
          }
        } else {
          setWin('')
          setGratitude('')
          setIntention('')
          setFreeText('')
          setMood(null)
        }
      } catch (error) {
        console.error('Failed to load journal:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadJournal()
  }, [selectedDate])

  // Load all entries (30 days) for stats, heatmap, mood sparkline
  useEffect(() => {
    const loadAllEntries = async () => {
      setLoadingPast(true)
      try {
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        const response = await fetch(
          `/api/daily-guide/journal?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        )
        if (response.ok) {
          const data = await response.json()
          const entries: JournalEntry[] = data.entries || []
          setAllEntries(entries)

          const withContent = entries.filter(
            (e) => e.journal_win || e.journal_gratitude || e.journal_intention || e.journal_freetext
          )
          setJournalStats(calculateJournalStats(withContent))
        }
      } catch (error) {
        console.error('Failed to load entries:', error)
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
    loadAllEntries()
    loadStreak()
  }, [])

  const handleSave = async () => {
    const guidedContent = win.trim() || gratitude.trim() || intention.trim()
    const freeContent = freeText.trim()
    if (!guidedContent && !freeContent && !mood) return

    setIsSaving(true)
    try {
      const { prompt } = getPromptForDate(selectedDate)
      const payload: Record<string, any> = {
        date: selectedDate.toISOString(),
        journal_mood: mood || undefined,
      }

      if (mode === 'guided') {
        payload.journal_win = win.trim() || undefined
        payload.journal_gratitude = gratitude.trim() || undefined
        payload.journal_intention = intention.trim() || undefined
      } else {
        payload.journal_freetext = freeText.trim() || undefined
        payload.journal_prompt = prompt.text
      }

      const response = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        const data = await response.json()
        setIsSaved(true)
        if (data.data?.journal_ai_reflection) {
          setReflection(data.data.journal_ai_reflection)
        }
        if (data.data?.journal_tags?.length) {
          setJournalTags(data.data.journal_tags)
        }
        // Refresh stats
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        const refreshRes = await fetch(
          `/api/daily-guide/journal?startDate=${start.toISOString()}&endDate=${end.toISOString()}`
        )
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json()
          const entries: JournalEntry[] = refreshData.entries || []
          setAllEntries(entries)
          const withContent = entries.filter(
            (e) => e.journal_win || e.journal_gratitude || e.journal_intention || e.journal_freetext
          )
          setJournalStats(calculateJournalStats(withContent))
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

  const handleShuffle = () => {
    const { index } = getShuffledPrompt(selectedDate, currentPromptIndex)
    setCurrentPromptIndex(index)
  }

  // Conversational journal handlers
  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMessage = chatInput.trim()
    setChatInput('')

    const newConversation = [...conversation, { role: 'user' as const, content: userMessage }]
    setConversation(newConversation)
    setChatLoading(true)

    try {
      const res = await fetch('/api/ai/journal-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversation }),
      })
      if (res.ok) {
        const data = await res.json()
        setConversation(prev => [...prev, { role: 'assistant', content: data.reply }])
        if (data.suggestedTags?.length) {
          setJournalTags(data.suggestedTags)
        }
      }
    } catch {
      setConversation(prev => [...prev, { role: 'assistant', content: 'Take a moment to sit with that thought. What comes to mind?' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, conversation])

  const saveConversation = useCallback(async () => {
    if (conversation.length < 2) return
    setIsSaving(true)
    try {
      const dateStr = selectedDate.toISOString()
      // Save the conversation as freetext summary + full conversation JSON
      const summary = conversation
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join('\n\n')

      const res = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: dateStr,
          journal_freetext: summary,
          journal_mood: mood || undefined,
          journal_conversation: JSON.stringify(conversation),
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setIsSaved(true)
        if (data.data?.journal_ai_reflection) {
          setReflection(data.data.journal_ai_reflection)
        }
        if (data.data?.journal_tags?.length) {
          setJournalTags(data.data.journal_tags)
        }
      }
    } catch (err) {
      console.error('Save conversation error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [conversation, selectedDate, mood])

  // Dream journal handlers
  const submitDream = useCallback(async () => {
    if (!dreamText.trim() || dreamLoading) return
    setDreamLoading(true)

    try {
      const res = await fetch('/api/ai/dream-interpretation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dreamText: dreamText.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        setDreamInterpretation(data)
        setDreamSaved(true)
        // Persist dream data to journal DB
        try {
          await fetch('/api/daily-guide/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              date: selectedDate.toISOString(),
              journal_dream: dreamText.trim(),
              journal_dream_interpretation: JSON.stringify(data),
              journal_freetext: `Dream: ${dreamText.trim()}`,
            }),
          })
        } catch {}
      }
    } catch {
      setDreamInterpretation({
        symbols: [],
        emotionalTheme: 'Your dream carries rich symbolism worth exploring.',
        connectionToLife: 'Consider what feelings this dream evoked.',
        mindsetReflection: 'Dreams often reveal what our waking mind overlooks.',
      })
    } finally {
      setDreamLoading(false)
    }
  }, [dreamText, dreamLoading])

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation])

  const handleVoiceTranscript = useCallback((text: string) => {
    if (mode === 'freewrite') {
      setFreeText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text)
    } else {
      const field = activeFieldRef.current
      if (field === 'win') setWin(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text)
      else if (field === 'gratitude') setGratitude(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text)
      else if (field === 'intention') setIntention(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text)
    }
    setIsSaved(false)
  }, [mode])

  const handleVoiceInterim = useCallback((text: string) => {
    setInterimText(text)
  }, [])

  const hasContent = mode === 'guided'
    ? (win.trim() || gratitude.trim() || intention.trim())
    : mode === 'freewrite'
    ? freeText.trim()
    : mode === 'conversational'
    ? conversation.length >= 2
    : mode === 'dream'
    ? dreamText.trim()
    : false

  const dateLabel = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const currentPrompt = getPromptForDate(selectedDate)
  // Use the shuffled index if different from default
  const displayPrompt = currentPromptIndex !== currentPrompt.index
    ? getShuffledPrompt(selectedDate, currentPrompt.index)
    : currentPrompt

  const recentEntries = allEntries
    .filter(e => e.journal_win || e.journal_gratitude || e.journal_intention || e.journal_freetext)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const visibleEntries = showAllRecent ? recentEntries : recentEntries.slice(0, 7)

  const MOOD_EMOJI: Record<string, string> = {
    awful: '😞', low: '😔', okay: '😐', good: '😊', great: '😄',
  }

  return (
    <div className="min-h-screen text-white pb-24">
      {/* Header */}
      <div className="px-6 pt-12 pb-4 header-fade-bg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <PenLine className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-2xl font-light shimmer-text">Journal</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {mindsetCtx && (
              <div className="flex items-center justify-center px-1.5 py-1 rounded-full bg-white/5">
                <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/60" />
              </div>
            )}
            {/* Streak badge */}
            {journalStats.currentStreak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/20">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-semibold text-orange-400">{journalStats.currentStreak}</span>
              </div>
            )}
          </div>
        </div>
        <p className="text-white text-sm ml-12">Reflect, grow, remember</p>
      </div>

      {/* Stats Bar */}
      <div className="px-6 mb-4">
        <JournalStats stats={journalStats} />
      </div>

      {/* Date Picker */}
      <div className="px-6 mb-4">
        <div className="flex items-center justify-between p-3 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
          <button
            aria-label="Previous day"
            onClick={() => goDay(-1)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <div className="text-center">
            <p className="text-sm font-medium text-white">{dateLabel}</p>
            {isToday && <p className="text-[10px] text-amber-400">Today</p>}
          </div>
          <button
            aria-label="Next day"
            onClick={() => goDay(1)}
            disabled={isToday}
            className={`p-1.5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${isToday ? 'opacity-30' : 'hover:bg-white/10'}`}
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Mood Selector */}
      <div className="px-6 mb-4">
        <MoodSelector
          mood={mood}
          onSelect={(m) => { setMood(m); setIsSaved(false) }}
          moodHistory={allEntries}
        />
      </div>

      {/* Mode Toggle — 4 modes, horizontally scrollable on mobile */}
      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar p-1 rounded-xl bg-black border border-white/20">
          {([
            { id: 'guided' as JournalMode, label: 'Guided', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'freewrite' as JournalMode, label: 'Free Write', icon: <PenLine className="w-3.5 h-3.5" /> },
            { id: 'conversational' as JournalMode, label: 'Chat', icon: <MessageCircle className="w-3.5 h-3.5" /> },
            { id: 'dream' as JournalMode, label: 'Dream', icon: <Moon className="w-3.5 h-3.5" /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
                mode === tab.id
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Spark Prompt */}
      {sparkPrompt && (
        <div className="px-6 mb-4 animate-fade-in">
          <div className="relative p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
            <button
              aria-label="Dismiss prompt"
              onClick={() => setSparkPrompt(null)}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <X className="w-3.5 h-3.5 text-white/80" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <div className="p-1.5 rounded-lg bg-violet-500/20 mt-0.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-wider mb-1">Reflect on this</p>
                <p className="text-sm text-white leading-relaxed italic">&ldquo;{sparkPrompt}&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Journal Form */}
      <div className="px-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/90 animate-spin" />
          </div>
        ) : mode === 'conversational' ? (
          /* Conversational Journal Mode */
          <div className="space-y-3">
            {/* Chat card — flex column with messages + pinned input */}
            <div className="flex flex-col rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]" style={{ maxHeight: '60vh' }}>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {conversation.length === 0 && (
                  <div className="text-center py-6">
                    <MessageCircle className="w-8 h-8 text-violet-400/50 mx-auto mb-2" />
                    <p className="text-sm text-white/70">Start a journaling conversation</p>
                    <p className="text-xs text-white/50 mt-1">Share what&apos;s on your mind and I&apos;ll help you explore it</p>
                  </div>
                )}
                {conversation.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === 'user'
                        ? 'bg-violet-500/20 text-white rounded-br-md'
                        : 'bg-white/10 text-white/90 rounded-bl-md'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-white/10">
                      <Loader2 className="w-4 h-4 text-white/60 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Pinned input at bottom of card */}
              <div className="flex gap-2 p-3 border-t border-white/10">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                  placeholder="What's on your mind..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white text-sm placeholder-white/50 focus:outline-none focus:border-white/60"
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-3 rounded-xl bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors disabled:opacity-30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Save conversation button */}
            {conversation.length >= 2 && (
              <button
                onClick={saveConversation}
                disabled={isSaving || isSaved}
                className={`w-full py-3 rounded-2xl bg-black border border-white/20 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isSaved ? 'text-emerald-400' : 'text-white'
                }`}
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                ) : isSaved ? (
                  <><BookOpen className="w-4 h-4" /> Saved</>
                ) : (
                  <><Save className="w-4 h-4" /> Save & Close</>
                )}
              </button>
            )}

            {/* Tags */}
            {journalTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {journalTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/20 text-[10px] text-violet-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : mode === 'dream' ? (
          /* Dream Journal Mode */
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
              <label className="text-sm text-white flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-indigo-400" />
                Describe your dream
              </label>
              <textarea
                ref={dreamRef}
                value={dreamText}
                onChange={e => { setDreamText(e.target.value); setDreamSaved(false); setDreamInterpretation(null) }}
                placeholder="I dreamed that..."
                className="w-full p-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 focus-visible:ring-1 focus-visible:ring-white/40 resize-none"
                rows={6}
                maxLength={3000}
              />
              <p className="text-right text-[10px] text-white/70 mt-1">{dreamText.length}/3000</p>
            </div>

            {/* Submit dream */}
            <button
              onClick={submitDream}
              disabled={!dreamText.trim() || dreamLoading || dreamSaved}
              className={`w-full py-3 rounded-2xl bg-black border border-white/20 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                dreamSaved ? 'text-emerald-400' : dreamText.trim() ? 'text-white' : 'text-white/70 cursor-not-allowed'
              }`}
            >
              {dreamLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Interpreting...</>
              ) : dreamSaved ? (
                <><BookOpen className="w-4 h-4" /> Interpreted</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Interpret Dream</>
              )}
            </button>

            {/* Dream interpretation — consolidated card */}
            {dreamInterpretation && (
              <div className="p-4 rounded-2xl bg-black border border-indigo-500/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] space-y-3">
                {/* Symbols */}
                {dreamInterpretation.symbols.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider mb-2">Key Symbols</p>
                    <div className="space-y-1.5">
                      {dreamInterpretation.symbols.map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span className="text-indigo-300 text-sm font-medium shrink-0">{s.symbol}</span>
                          <span className="text-white/70 text-xs">{s.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotional theme */}
                {dreamInterpretation.emotionalTheme && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1">Emotional Theme</p>
                    <p className="text-sm text-white/90 leading-relaxed">{dreamInterpretation.emotionalTheme}</p>
                  </div>
                )}

                {/* Connection to life */}
                {dreamInterpretation.connectionToLife && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">Life Connection</p>
                    <p className="text-sm text-white/90 leading-relaxed">{dreamInterpretation.connectionToLife}</p>
                  </div>
                )}

                {/* Mindset reflection */}
                {dreamInterpretation.mindsetReflection && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Reflection</p>
                    <p className="text-sm text-white/90 leading-relaxed italic">{dreamInterpretation.mindsetReflection}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : mode === 'guided' ? (
          /* Guided Mode — 3 structured textareas (mindset-aware) */
          <div className="space-y-4">
            {(() => {
              const mp = mindsetCtx ? MINDSET_JOURNAL_PROMPTS[mindsetCtx.mindset] : null
              return (
                <>
                <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
                  <label className="text-sm text-white flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {mp?.prompt1.label || 'What did you learn today?'}
                  </label>
                  <textarea
                    ref={winRef}
                    value={win}
                    onChange={(e) => { setWin(e.target.value); setIsSaved(false) }}
                    onFocus={() => { activeFieldRef.current = 'win' }}
                    placeholder={mp?.prompt1.placeholder || 'Today I learned...'}
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 focus-visible:ring-1 focus-visible:ring-white/40 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-right text-[10px] text-white/70 mt-1">{win.length}/500</p>
                </div>

                <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
                  <label className="text-sm text-white flex items-center gap-2 mb-3">
                    <Heart className="w-4 h-4 text-pink-400" />
                    {mp?.prompt2.label || 'What are you grateful for?'}
                  </label>
                  <textarea
                    ref={gratitudeRef}
                    value={gratitude}
                    onChange={(e) => { setGratitude(e.target.value); setIsSaved(false) }}
                    onFocus={() => { activeFieldRef.current = 'gratitude' }}
                    placeholder={mp?.prompt2.placeholder || "I'm grateful for..."}
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 focus-visible:ring-1 focus-visible:ring-white/40 resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-right text-[10px] text-white/70 mt-1">{gratitude.length}/500</p>
                </div>

                <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
                  <label className="text-sm text-white flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-purple-400" />
                    {mp?.prompt3.label || "Tomorrow\u0027s intention"}
                  </label>
                  <textarea
                    ref={intentionRef}
                    value={intention}
                    onChange={(e) => { setIntention(e.target.value); setIsSaved(false) }}
                    onFocus={() => { activeFieldRef.current = 'intention' }}
                    placeholder={mp?.prompt3.placeholder || 'Tomorrow I will...'}
                    className="w-full p-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 focus-visible:ring-1 focus-visible:ring-white/40 resize-none"
                    rows={2}
                    maxLength={300}
                  />
                  <p className="text-right text-[10px] text-white/70 mt-1">{intention.length}/300</p>
                </div>
                </>
              )
            })()}

            {/* Voice button for guided mode */}
            <div className="flex justify-end">
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                onInterim={handleVoiceInterim}
              />
            </div>
            {interimText && (
              <p className="text-xs text-white/60 italic px-1">{interimText}</p>
            )}
          </div>
        ) : (
          /* Free Write Mode */
          <div className="space-y-4">
            {/* Rotating prompt card */}
            <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="p-1.5 rounded-lg bg-amber-500/20 mt-0.5 shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">
                      Today&apos;s Prompt
                    </p>
                    <p className="text-sm text-white leading-relaxed">
                      {displayPrompt.prompt.text}
                    </p>
                    <p className="text-[10px] text-white/60 mt-1.5 capitalize">{displayPrompt.prompt.category}</p>
                  </div>
                </div>
                <button
                  onClick={handleShuffle}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                  aria-label="New prompt"
                >
                  <Shuffle className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>

            {/* Large textarea with voice */}
            <div className="p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-white">Write freely...</label>
                <VoiceInput
                  onTranscript={handleVoiceTranscript}
                  onInterim={handleVoiceInterim}
                />
              </div>
              <textarea
                ref={freeTextRef}
                value={freeText}
                onChange={(e) => { setFreeText(e.target.value); setIsSaved(false) }}
                onFocus={() => { activeFieldRef.current = 'freewrite' }}
                placeholder="Let your thoughts flow..."
                className="w-full p-3 rounded-xl bg-white/10 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:border-white/60 focus-visible:ring-1 focus-visible:ring-white/40 resize-none"
                rows={8}
                maxLength={5000}
              />
              {interimText && (
                <p className="text-xs text-white/60 italic mt-1 px-1">{interimText}</p>
              )}
              <p className="text-right text-[10px] text-white/70 mt-1">{freeText.length}/5000</p>
            </div>
          </div>
        )}

        {/* Save Button — only for guided and freewrite modes */}
        {!isLoading && (mode === 'guided' || mode === 'freewrite') && (
          <div className="mt-4">
            <button
              onClick={handleSave}
              disabled={!hasContent && !mood || isSaving || isSaved}
              className={`w-full py-3 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                isSaved
                  ? 'text-emerald-400'
                  : hasContent || mood
                  ? 'text-white'
                  : 'text-white/70 cursor-not-allowed'
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
          </div>
        )}

        {/* AI Insight */}
        {reflection && (
          <div className="mt-4 p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-medium tracking-wider text-indigo-400 uppercase mb-1">AI Insight</p>
                <p className="text-sm text-white leading-relaxed italic">{reflection}</p>
              </div>
            </div>
            {/* Journal Tags */}
            {journalTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3 pl-6">
                {journalTags.map((tag, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[10px] text-indigo-300">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 30-Day HeatMap */}
      <div className="px-6 mt-8">
        <HeatMapStrip entries={allEntries} />
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-white/90" />
            <h2 className="text-sm font-medium text-white/90 uppercase tracking-wider">Recent Entries</h2>
          </div>
          {!hasJournalHistory && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">PRO</span>
          )}
        </div>

        {!hasJournalHistory ? (
          <button
            onClick={openUpgradeModal}
            className="w-full p-6 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] hover:bg-white/5 transition-all group"
          >
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Calendar className="w-6 h-6 text-amber-400" />
                </div>
                <div className="absolute -top-1 -right-1 p-1 rounded-full bg-amber-500/30">
                  <Lock className="w-3 h-3 text-amber-400" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm text-white font-medium mb-1">Unlock Journal History</p>
                <p className="text-xs text-white/80 mb-3">Look back on your growth journey</p>
                <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-medium group-hover:scale-105 transition-transform">
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade to Pro
                </div>
              </div>
            </div>
          </button>
        ) : loadingPast ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-white/90 animate-spin" />
          </div>
        ) : recentEntries.length === 0 ? (
          <div className="text-center py-8">
            <PenLine className="w-6 h-6 text-white/60 mx-auto mb-2" />
            <p className="text-white/80 text-sm">No entries yet</p>
            <p className="text-white/60 text-xs mt-1">Start journaling to see your history here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleEntries.map((entry, i) => {
              const entryDate = new Date(entry.date)
              const label = entryDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              const isSelected = entryDate.toDateString() === selectedDate.toDateString()
              const moodEmoji = entry.journal_mood ? MOOD_EMOJI[entry.journal_mood] : null

              return (
                <button
                  key={i}
                  onClick={() => setSelectedDate(entryDate)}
                  className={`w-full text-left p-4 rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] transition-all ${
                    isSelected
                      ? 'ring-1 ring-amber-500/40'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <p className={`text-xs ${isSelected ? 'text-amber-400' : 'text-white/90'}`}>
                      {label}
                    </p>
                    {moodEmoji && <span className="text-sm">{moodEmoji}</span>}
                  </div>
                  {entry.journal_freetext ? (
                    <p className="text-sm text-white line-clamp-2">{entry.journal_freetext}</p>
                  ) : entry.journal_win ? (
                    <p className="text-sm text-white line-clamp-2">{entry.journal_win}</p>
                  ) : entry.journal_gratitude ? (
                    <p className="text-sm text-white line-clamp-2 italic">{entry.journal_gratitude}</p>
                  ) : null}
                  <div className="flex items-center gap-2 mt-2">
                    {entry.journal_freetext && <span className="text-[10px] text-cyan-400">✎ Free Write</span>}
                    {entry.journal_win && <span className="text-[10px] text-amber-400">✦ Learned</span>}
                    {entry.journal_gratitude && <span className="text-[10px] text-pink-400">♥ Grateful</span>}
                    {entry.journal_intention && <span className="text-[10px] text-purple-400">◎ Intention</span>}
                  </div>
                  {entry.journal_tags && entry.journal_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {entry.journal_tags.map((tag, ti) => (
                        <span key={ti} className="px-1.5 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-[9px] text-indigo-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}

            {/* Show more / less */}
            {recentEntries.length > 7 && (
              <button
                onClick={() => setShowAllRecent(!showAllRecent)}
                className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/70 hover:text-white/90 transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllRecent ? 'rotate-180' : ''}`} />
                {showAllRecent ? 'Show less' : `Show all ${recentEntries.length} entries`}
              </button>
            )}
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
