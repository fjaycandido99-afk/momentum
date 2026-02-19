'use client'

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  PenLine, ChevronLeft, ChevronRight, Loader2, Heart, Target,
  Sparkles, BookOpen, Calendar, X, Crown, Lock, Shuffle, ChevronDown,
  MessageCircle, Moon, Send, Save, Search, Download, Trash2,
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
import { calculateJournalStats, type JournalStatsData } from '@/components/journal/JournalStats'
import { HeatMapStrip } from '@/components/journal/HeatMapStrip'
import { getPromptForDate, getShuffledPrompt } from '@/components/journal/JournalPrompts'
import { useKeyboardAware } from '@/hooks/useKeyboardAware'
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea'
import { useJournalAutosave } from '@/hooks/useJournalAutosave'
import { FocusModeToolbar } from '@/components/journal/FocusModeToolbar'
import { EmptyWritingState } from '@/components/journal/EmptyWritingState'
import { JournalMilestoneCelebration } from '@/components/journal/JournalMilestoneCelebration'
import { FeatureHint } from '@/components/ui/FeatureHint'

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
  const [searchQuery, setSearchQuery] = useState('')
  const [showMore, setShowMore] = useState(false)

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

  // Writing state for empty state fade-out
  const [writingActive, setWritingActive] = useState(false)

  // Milestone celebration
  const [milestoneStreak, setMilestoneStreak] = useState<number | null>(null)
  const prevStreakRef = useRef<number>(0)

  const activeFieldRef = useRef<'win' | 'gratitude' | 'intention' | 'freewrite' | 'dream'>('freewrite')
  const handleSaveRef = useRef<() => Promise<void>>()

  // Focus mode state
  const [focusMode, setFocusMode] = useState(false)
  const [focusField, setFocusField] = useState<'win' | 'gratitude' | 'intention' | 'freewrite' | 'dream' | null>(null)
  const focusTextareaRef = useRef<HTMLTextAreaElement>(null)
  const focusExitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mobile keyboard UX
  const { keyboardOpen, keyboardHeight, viewportHeight } = useKeyboardAware()
  const freeTextRef = useRef<HTMLTextAreaElement>(null)
  const winRef = useRef<HTMLTextAreaElement>(null)
  const gratitudeRef = useRef<HTMLTextAreaElement>(null)
  const intentionRef = useRef<HTMLTextAreaElement>(null)
  const dreamRef = useRef<HTMLTextAreaElement>(null)
  useAutoResizeTextarea(freeTextRef, freeText, { focusMode: focusMode && focusField === 'freewrite' })
  useAutoResizeTextarea(winRef, win, { focusMode: focusMode && focusField === 'win' })
  useAutoResizeTextarea(gratitudeRef, gratitude, { focusMode: focusMode && focusField === 'gratitude' })
  useAutoResizeTextarea(intentionRef, intention, { focusMode: focusMode && focusField === 'intention' })
  useAutoResizeTextarea(dreamRef, dreamText, { focusMode: focusMode && focusField === 'dream' })

  // Read spark prompt from URL
  useEffect(() => {
    const spark = searchParams.get('spark')
    if (spark) setSparkPrompt(spark)
  }, [searchParams])

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  // Focus mode helpers
  const enterFocusMode = useCallback((field: typeof focusField) => {
    if (mode === 'conversational') return // Chat mode has its own layout
    setFocusField(field)
    setFocusMode(true)
    document.body.style.overflow = 'hidden'
    // Focus the textarea inside the overlay after render
    requestAnimationFrame(() => {
      focusTextareaRef.current?.focus()
    })
  }, [mode])

  const exitFocusMode = useCallback(() => {
    setFocusMode(false)
    setFocusField(null)
    document.body.style.overflow = ''
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }, [])

  // Auto-exit focus mode when keyboard closes (300ms delay to avoid glitches)
  useEffect(() => {
    if (!focusMode) return
    if (!keyboardOpen) {
      focusExitTimer.current = setTimeout(() => {
        exitFocusMode()
      }, 300)
    } else {
      if (focusExitTimer.current) {
        clearTimeout(focusExitTimer.current)
        focusExitTimer.current = null
      }
    }
    return () => {
      if (focusExitTimer.current) clearTimeout(focusExitTimer.current)
    }
  }, [keyboardOpen, focusMode, exitFocusMode])

  // Autosave integration (uses ref for stable callback)
  const autosaveOnSave = useCallback(async () => {
    if (handleSaveRef.current) await handleSaveRef.current()
  }, [])

  const { status: autosaveStatus, saveNow: autosaveSaveNow } = useJournalAutosave(
    [win, gratitude, intention, freeText, dreamText, mood],
    {
      onSave: autosaveOnSave,
      enabled: isToday && (mode === 'guided' || mode === 'freewrite' || mode === 'dream'),
    },
  )

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
      setWritingActive(false)
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
            if (hasFreewrite) setWritingActive(true)
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

  // Word count for post-save stats
  const wordCount = useMemo(() => {
    const text = mode === 'guided'
      ? [win, gratitude, intention].join(' ')
      : mode === 'dream'
      ? dreamText
      : freeText
    return text.trim() ? text.trim().split(/\s+/).length : 0
  }, [mode, win, gratitude, intention, freeText, dreamText])

  // Sync prev streak ref
  useEffect(() => {
    if (streak > 0) prevStreakRef.current = streak
  }, [streak])

  // Internal save function used by both manual save and autosave
  const handleSaveInternal = useCallback(async () => {
    const guidedContent = win.trim() || gratitude.trim() || intention.trim()
    const freeContent = freeText.trim()
    const dreamContent = dreamText.trim()
    if (!guidedContent && !freeContent && !dreamContent && !mood) return

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
      } else if (mode === 'dream') {
        payload.journal_dream = dreamContent || undefined
        payload.journal_freetext = dreamContent ? `Dream: ${dreamContent}` : undefined
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
        // Refresh streak and check for milestones
        try {
          const streakRes = await fetch('/api/daily-guide/preferences')
          if (streakRes.ok) {
            const streakData = await streakRes.json()
            const newStreak = streakData.current_streak || 0
            const MILESTONE_VALUES = [3, 7, 14, 30, 60, 100]
            if (newStreak > prevStreakRef.current && MILESTONE_VALUES.includes(newStreak)) {
              setMilestoneStreak(newStreak)
            }
            setStreak(newStreak)
            prevStreakRef.current = newStreak
          }
        } catch {}
      }
    } catch (error) {
      console.error('Failed to save journal:', error)
    } finally {
      setIsSaving(false)
    }
  }, [win, gratitude, intention, freeText, dreamText, mood, mode, selectedDate])
  handleSaveRef.current = handleSaveInternal

  const handleSave = handleSaveInternal

  // Delete entry
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirmDate, setDeleteConfirmDate] = useState<string | null>(null)

  const handleDeleteEntry = useCallback(async (targetDate: Date) => {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/daily-guide/journal', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: targetDate.toISOString() }),
      })
      if (res.ok) {
        // If deleting the currently viewed entry, clear form state
        if (targetDate.toDateString() === selectedDate.toDateString()) {
          setWin('')
          setGratitude('')
          setIntention('')
          setFreeText('')
          setMood(null)
          setReflection(null)
          setDreamText('')
          setDreamInterpretation(null)
          setDreamSaved(false)
          setConversation([])
          setJournalTags([])
          setIsSaved(false)
          setWritingActive(false)
        }
        setShowDeleteConfirm(false)
        setDeleteConfirmDate(null)
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
      console.error('Failed to delete journal:', error)
    } finally {
      setIsDeleting(false)
    }
  }, [selectedDate])

  const handleDelete = useCallback(() => handleDeleteEntry(selectedDate), [handleDeleteEntry, selectedDate])

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

  const MOOD_EMOJI: Record<string, string> = {
    awful: '😞', low: '😔', okay: '😐', good: '😊', great: '😄',
  }

  const exportEntries = useCallback(() => {
    const sorted = allEntries
      .filter(e => e.journal_win || e.journal_gratitude || e.journal_intention || e.journal_freetext)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const lines = ['# Voxu Journal Export\n']
    for (const entry of sorted) {
      const d = new Date(entry.date)
      const label = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      const moodEmoji = entry.journal_mood ? (MOOD_EMOJI[entry.journal_mood] || '') : ''
      lines.push(`## ${label}${moodEmoji ? ` ${moodEmoji}` : ''}\n`)
      if (entry.journal_freetext) lines.push(`### Free Write\n${entry.journal_freetext}\n`)
      if (entry.journal_win) lines.push(`### Learned\n${entry.journal_win}\n`)
      if (entry.journal_gratitude) lines.push(`### Grateful\n${entry.journal_gratitude}\n`)
      if (entry.journal_intention) lines.push(`### Intention\n${entry.journal_intention}\n`)
      if (entry.journal_tags?.length) lines.push(`**Tags:** ${entry.journal_tags.join(', ')}\n`)
      lines.push('---\n')
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `voxu-journal-${new Date().toISOString().split('T')[0]}.md`
    a.click()
    URL.revokeObjectURL(url)
  }, [allEntries])

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

  const filteredEntries = searchQuery.trim()
    ? recentEntries.filter(e => {
        const q = searchQuery.toLowerCase()
        return (e.journal_win || '').toLowerCase().includes(q)
          || (e.journal_gratitude || '').toLowerCase().includes(q)
          || (e.journal_freetext || '').toLowerCase().includes(q)
          || (e.journal_intention || '').toLowerCase().includes(q)
          || (e.journal_tags || []).some(t => t.toLowerCase().includes(q))
      })
    : recentEntries

  const visibleEntries = showAllRecent ? filteredEntries : filteredEntries.slice(0, 7)

  return (
    <div className="min-h-screen text-white pb-24">
      {/* ── Header: title + inline date nav ── */}
      <div className="sticky top-0 z-50 px-6 pt-12 pb-3 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        {/* Row 1: Title + actions */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <PenLine className="w-5 h-5 text-amber-400" />
            </div>
            <h1 className="text-2xl font-light shimmer-text">Journal</h1>
          </div>
          <div className="flex items-center gap-1.5">
            {mindsetCtx && (
              <div className="flex items-center justify-center px-1.5 py-1 rounded-full bg-white/5">
                <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/75" />
              </div>
            )}
            {journalStats.currentStreak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/20">
                <span className="text-sm">🔥</span>
                <span className="text-xs font-semibold text-orange-400">{journalStats.currentStreak}</span>
              </div>
            )}
            {hasJournalHistory && recentEntries.length > 0 && (
              <button
                onClick={exportEntries}
                aria-label="Export journal"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              >
                <Download className="w-4 h-4 text-white/75" />
              </button>
            )}
          </div>
        </div>
        {/* Row 2: Inline date picker */}
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous day"
            onClick={() => goDay(-1)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white/75" />
          </button>
          <span className="text-sm font-medium text-white">{dateLabel}</span>
          {isToday && <span className="text-[10px] text-amber-400 font-medium">Today</span>}
          <button
            aria-label="Next day"
            onClick={() => goDay(1)}
            disabled={isToday}
            className={`p-1 rounded-lg transition-colors ${isToday ? 'opacity-30' : 'hover:bg-white/10'}`}
          >
            <ChevronRight className="w-4 h-4 text-white/75" />
          </button>
        </div>
      </div>

      {/* ── Mode tabs + mood (stacked for mobile) ── */}
      <div className="px-6 pt-2 pb-3 mb-2 border-b border-white/15 space-y-2.5">
        {/* Mode tabs — full width */}
        <div className="flex gap-1 p-0.5 rounded-lg bg-white/10">
          {([
            { id: 'guided' as JournalMode, label: 'Guided', icon: <BookOpen className="w-3.5 h-3.5" /> },
            { id: 'freewrite' as JournalMode, label: 'Free', icon: <PenLine className="w-3.5 h-3.5" /> },
            { id: 'conversational' as JournalMode, label: 'Chat', icon: <MessageCircle className="w-3.5 h-3.5" /> },
            { id: 'dream' as JournalMode, label: 'Dream', icon: <Moon className="w-3.5 h-3.5" /> },
          ]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded-md transition-all ${
                mode === tab.id
                  ? 'bg-white/25 text-white shadow-sm'
                  : 'text-white/85 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {/* Mood selector — full width */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-white/50 uppercase tracking-wider font-medium">Mood</span>
          <MoodSelector
            mood={mood}
            onSelect={(m) => { setMood(m); setIsSaved(false) }}
            moodHistory={allEntries}
            compact
          />
        </div>
        <FeatureHint id="journal-modes-v2" text="Try Chat for a guided AI conversation, or Dream to decode your dreams" mode="once" />
      </div>

      {/* Spark Prompt */}
      {sparkPrompt && (
        <div className="px-6 mb-3 animate-fade-in">
          <div className="relative p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <button
              aria-label="Dismiss prompt"
              onClick={() => setSparkPrompt(null)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-3 h-3 text-white/75" />
            </button>
            <div className="flex items-start gap-2 pr-6">
              <Sparkles className="w-3.5 h-3.5 text-violet-300 mt-0.5 shrink-0" />
              <p className="text-sm text-white/90 leading-relaxed italic">&ldquo;{sparkPrompt}&rdquo;</p>
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
            <div className="flex flex-col rounded-2xl bg-black border border-white/15" style={{ maxHeight: '60vh' }}>
              {/* Messages area */}
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                {conversation.length === 0 && (
                  <div className="text-center py-6">
                    <MessageCircle className="w-8 h-8 text-violet-400/50 mx-auto mb-2" />
                    <p className="text-sm text-white/85">Start a journaling conversation</p>
                    <p className="text-xs text-white/70 mt-1">Share what&apos;s on your mind and I&apos;ll help you explore it</p>
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
                      <Loader2 className="w-4 h-4 text-white/75 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Pinned input at bottom of card */}
              <div className="flex gap-2 p-3 border-t border-white/15">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                  placeholder="What's on your mind..."
                  autoCapitalize="sentences"
                  enterKeyHint="send"
                  className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/30 text-white text-sm placeholder-white/60 focus:outline-none focus:border-white/60"
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
                className={`w-full py-3 rounded-2xl bg-black border border-white/25 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
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
            <div className="p-4 rounded-2xl bg-black border border-white/15">
              <label htmlFor="dream-text" className="text-sm text-white flex items-center gap-2 mb-2">
                <Moon className="w-4 h-4 text-indigo-400" />
                Describe your dream
              </label>
              <textarea
                id="dream-text"
                ref={dreamRef}
                value={dreamText}
                onChange={e => { setDreamText(e.target.value); setDreamSaved(false); setDreamInterpretation(null) }}
                onFocus={() => { activeFieldRef.current = 'dream'; enterFocusMode('dream') }}
                placeholder="I dreamed that..."
                autoCapitalize="sentences"
                autoComplete="off"
                spellCheck
                enterKeyHint="enter"
                className="w-full bg-transparent text-base leading-relaxed text-white placeholder-white/50 caret-amber-400 px-1 py-2 focus:outline-none resize-none"
                rows={6}
                maxLength={3000}
              />
              <p className="text-right text-[10px] text-white/40 mt-1">{dreamText.length}/3000</p>
            </div>

            {/* Submit dream */}
            <button
              onClick={submitDream}
              disabled={!dreamText.trim() || dreamLoading || dreamSaved}
              className={`w-full py-3 rounded-2xl bg-black border border-white/25 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                dreamSaved ? 'text-emerald-400' : dreamText.trim() ? 'text-white' : 'text-white/85 cursor-not-allowed'
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
                          <span className="text-white/85 text-xs">{s.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotional theme */}
                {dreamInterpretation.emotionalTheme && (
                  <div className="border-t border-white/15 pt-3">
                    <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1">Emotional Theme</p>
                    <p className="text-sm text-white/90 leading-relaxed">{dreamInterpretation.emotionalTheme}</p>
                  </div>
                )}

                {/* Connection to life */}
                {dreamInterpretation.connectionToLife && (
                  <div className="border-t border-white/15 pt-3">
                    <p className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">Life Connection</p>
                    <p className="text-sm text-white/90 leading-relaxed">{dreamInterpretation.connectionToLife}</p>
                  </div>
                )}

                {/* Mindset reflection */}
                {dreamInterpretation.mindsetReflection && (
                  <div className="border-t border-white/15 pt-3">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1">Reflection</p>
                    <p className="text-sm text-white/90 leading-relaxed italic">{dreamInterpretation.mindsetReflection}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : mode === 'guided' ? (
          /* Guided Mode — 3 structured textareas (mindset-aware) */
          <div className="space-y-3">
            {(() => {
              const mp = mindsetCtx ? MINDSET_JOURNAL_PROMPTS[mindsetCtx.mindset] : null
              return (
                <>
                <div className="p-4 rounded-2xl bg-black border border-white/15">
                  <label htmlFor="journal-win" className="text-sm text-white flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {mp?.prompt1.label || 'What did you learn today?'}
                  </label>
                  <textarea
                    id="journal-win"
                    ref={winRef}
                    value={win}
                    onChange={(e) => { setWin(e.target.value); setIsSaved(false) }}
                    onFocus={() => { activeFieldRef.current = 'win'; enterFocusMode('win') }}
                    placeholder={mp?.prompt1.placeholder || 'Today I learned...'}
                    autoCapitalize="sentences"
                    autoComplete="off"
                    spellCheck
                    enterKeyHint="enter"
                    className="w-full bg-transparent text-base leading-relaxed text-white placeholder-white/50 caret-amber-400 px-1 py-2 focus:outline-none resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-right text-[10px] text-white/40 mt-1">{win.length}/500</p>
                </div>

                <div className="p-4 rounded-2xl bg-black border border-white/15">
                  <label htmlFor="journal-gratitude" className="text-sm text-white flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-pink-400" />
                    {mp?.prompt2.label || 'What are you grateful for?'}
                  </label>
                  <textarea
                    id="journal-gratitude"
                    ref={gratitudeRef}
                    value={gratitude}
                    onChange={(e) => { setGratitude(e.target.value); setIsSaved(false) }}
                    onFocus={() => { activeFieldRef.current = 'gratitude'; enterFocusMode('gratitude') }}
                    placeholder={mp?.prompt2.placeholder || "I'm grateful for..."}
                    autoCapitalize="sentences"
                    autoComplete="off"
                    spellCheck
                    enterKeyHint="enter"
                    className="w-full bg-transparent text-base leading-relaxed text-white placeholder-white/50 caret-amber-400 px-1 py-2 focus:outline-none resize-none"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-right text-[10px] text-white/40 mt-1">{gratitude.length}/500</p>
                </div>

                <div className="p-4 rounded-2xl bg-black border border-white/15">
                  <label htmlFor="journal-intention" className="text-sm text-white flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-purple-400" />
                    {mp?.prompt3.label || "Tomorrow\u0027s intention"}
                  </label>
                  <textarea
                    id="journal-intention"
                    ref={intentionRef}
                    value={intention}
                    onChange={(e) => { setIntention(e.target.value); setIsSaved(false) }}
                    onFocus={() => { activeFieldRef.current = 'intention'; enterFocusMode('intention') }}
                    placeholder={mp?.prompt3.placeholder || 'Tomorrow I will...'}
                    autoCapitalize="sentences"
                    autoComplete="off"
                    spellCheck
                    enterKeyHint="enter"
                    className="w-full bg-transparent text-base leading-relaxed text-white placeholder-white/50 caret-amber-400 px-1 py-2 focus:outline-none resize-none"
                    rows={2}
                    maxLength={300}
                  />
                  <p className="text-right text-[10px] text-white/40 mt-1">{intention.length}/300</p>
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
              <p className="text-xs text-white/75 italic px-1">{interimText}</p>
            )}
          </div>
        ) : (
          /* Free Write Mode */
          <div>
            {/* Rotating prompt */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-black border border-white/15">
              <button
                type="button"
                onClick={handleShuffle}
                aria-label="Shuffle prompt"
                className="shrink-0 mt-0.5"
              >
                <Shuffle
                  className="w-4 h-4 text-white/60 cursor-pointer hover:text-white transition-colors"
                />
              </button>
              <p className="text-sm text-white leading-relaxed">
                {displayPrompt.prompt.text}
              </p>
            </div>

            {/* Empty state — inspiring quote + prompt chips */}
            <EmptyWritingState
              mindsetId={mindsetCtx?.mindset}
              visible={!writingActive && !freeText.trim()}
              onStartWriting={(starter) => {
                if (starter) setFreeText(starter)
                setWritingActive(true)
                setIsSaved(false)
                requestAnimationFrame(() => {
                  freeTextRef.current?.focus()
                })
              }}
            />

            {/* Textarea — only visible when writing */}
            {(writingActive || freeText.trim()) && (
              <div className="-mt-px p-4 rounded-2xl bg-black border border-white/15">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="journal-freewrite" className="text-xs text-white/60 uppercase tracking-widest font-medium">Free Write</label>
                  <VoiceInput
                    onTranscript={handleVoiceTranscript}
                    onInterim={handleVoiceInterim}
                  />
                </div>
                <textarea
                  id="journal-freewrite"
                  ref={freeTextRef}
                  value={freeText}
                  onChange={(e) => { setFreeText(e.target.value); setIsSaved(false) }}
                  onFocus={() => { activeFieldRef.current = 'freewrite'; setWritingActive(true); enterFocusMode('freewrite') }}
                  placeholder="Let your thoughts flow..."
                  autoCapitalize="sentences"
                  autoComplete="off"
                  spellCheck
                  enterKeyHint="enter"
                  className="w-full bg-transparent text-lg leading-loose text-white placeholder-white/30 caret-amber-400 px-1 py-2 focus:outline-none resize-none"
                  rows={8}
                  maxLength={5000}
                />
                {interimText && (
                  <p className="text-xs text-white/75 italic mt-1 px-1">{interimText}</p>
                )}
                <p className="text-right text-[10px] text-white/30 mt-1">{freeText.length}/5000</p>
              </div>
            )}
          </div>
        )}

        {/* Save + Delete — only for guided and freewrite modes */}
        {!isLoading && (mode === 'guided' || mode === 'freewrite') && (
          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!hasContent && !mood || isSaving || isSaved}
                className={`flex-1 py-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                  isSaved
                    ? 'text-emerald-400'
                    : hasContent || mood
                    ? 'text-white'
                    : 'text-white/85 cursor-not-allowed'
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
              {isSaved && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-3 rounded-xl bg-white/5 hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all"
                  aria-label="Delete entry"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {/* Post-save stats */}
            {isSaved && (wordCount > 0 || streak > 0) && (
              <p className="text-center text-xs text-white/40">
                {wordCount > 0 && <>{wordCount} words today</>}
                {wordCount > 0 && streak > 0 && ' | '}
                {streak > 0 && <>{streak}-day streak</>}
              </p>
            )}
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
            <p className="text-sm text-white/90 mb-3">Delete this journal entry? This can't be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 className="w-3.5 h-3.5" /> Delete</>
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/70 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Mindset Insight */}
        {reflection && (
          <div className="mt-4 p-4 rounded-2xl bg-black border border-white/[0.08]">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-medium tracking-wider text-indigo-400 uppercase mb-1">{mindsetCtx?.config?.insightName || 'Reflection'}</p>
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

      {/* ── Below the fold: activity + history ── */}

      {/* 30-Day HeatMap */}
      <div className="px-6 mt-8">
        <HeatMapStrip entries={allEntries} />
      </div>

      {/* Recent Entries */}
      <div className="px-6 mt-6">
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
            className="w-full p-6 rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] hover:bg-white/5 transition-all group"
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
            <PenLine className="w-6 h-6 text-white/75 mx-auto mb-2" />
            <p className="text-white/80 text-sm">No entries yet</p>
            <p className="text-white/75 text-xs mt-1">Start journaling to see your history here</p>
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/60" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm text-white placeholder-white/50 bg-black border border-white/25 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-white/10"
                >
                  <X className="w-3 h-3 text-white/60" />
                </button>
              )}
            </div>

            {filteredEntries.length === 0 && searchQuery ? (
              <div className="text-center py-8">
                <Search className="w-6 h-6 text-white/50 mx-auto mb-2" />
                <p className="text-white/70 text-sm">No entries match &ldquo;{searchQuery}&rdquo;</p>
              </div>
            ) : (
              <div className="space-y-3">
                {visibleEntries.map((entry, i) => {
                  const entryDate = new Date(entry.date)
                  const entryDateStr = entryDate.toISOString().split('T')[0]
                  const label = entryDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  })
                  const isSelected = entryDate.toDateString() === selectedDate.toDateString()
                  const moodEmoji = entry.journal_mood ? MOOD_EMOJI[entry.journal_mood] : null
                  const isConfirmingDelete = deleteConfirmDate === entryDateStr

                  return (
                    <div key={i} className="relative">
                      <button
                        onClick={() => setSelectedDate(entryDate)}
                        className={`w-full text-left p-4 rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)] transition-all ${
                          isSelected
                            ? 'ring-1 ring-amber-500/40'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className={`text-xs ${isSelected ? 'text-amber-400' : 'text-white/90'}`}>
                            {label}
                          </p>
                          <div className="flex items-center gap-2">
                            {moodEmoji && <span className="text-sm" style={!entry.journal_mood || entry.journal_mood === selectedDate.toDateString() ? undefined : { filter: 'grayscale(1)', opacity: 0.5 }}>{moodEmoji}</span>}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmDate(isConfirmingDelete ? null : entryDateStr) }}
                              className="p-1 -mr-1 rounded-lg hover:bg-red-500/15 text-white/25 hover:text-red-400 transition-colors"
                              aria-label="Delete entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                      {/* Inline delete confirmation */}
                      {isConfirmingDelete && (
                        <div className="mt-1.5 flex gap-2 animate-fade-in">
                          <button
                            onClick={() => handleDeleteEntry(entryDate)}
                            disabled={isDeleting}
                            className="flex-1 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmDate(null)}
                            className="flex-1 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white/60 text-xs font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Show more / less */}
                {filteredEntries.length > 7 && (
                  <button
                    onClick={() => setShowAllRecent(!showAllRecent)}
                    className="w-full flex items-center justify-center gap-1 py-2 text-xs text-white/85 hover:text-white/90 transition-colors"
                  >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAllRecent ? 'rotate-180' : ''}`} />
                    {showAllRecent ? 'Show less' : `Show all ${filteredEntries.length} entries`}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Collapsible More section ── */}
      <div className="px-6 mt-6 mb-4">
        <button
          onClick={() => setShowMore(!showMore)}
          className="flex items-center gap-2 w-full py-2 text-xs text-white/60 hover:text-white/75 transition-colors"
        >
          <div className="flex-1 h-px bg-white/10" />
          <span className="flex items-center gap-1 shrink-0">
            <ChevronDown className={`w-3 h-3 transition-transform ${showMore ? 'rotate-180' : ''}`} />
            {showMore ? 'Less' : 'More'}
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </button>
        {showMore && (
          <div className="space-y-6 mt-4 animate-fade-in-up">
            <GoalTracker />
            <WeeklyReviewPrompt onOpen={() => setShowWeeklyReview(true)} />
            <CalendarView currentStreak={streak} />
          </div>
        )}
      </div>

      {/* Focus Mode Overlay */}
      {focusMode && focusField && (
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-black animate-focus-enter"
          style={{ height: 'var(--visual-viewport-height, 100vh)' }}
        >
          {/* Textarea fills available space */}
          <div className="flex-1 flex flex-col min-h-0 px-6 pt-6">
            <textarea
              ref={focusTextareaRef}
              value={
                focusField === 'win' ? win
                  : focusField === 'gratitude' ? gratitude
                  : focusField === 'intention' ? intention
                  : focusField === 'dream' ? dreamText
                  : freeText
              }
              onChange={(e) => {
                const v = e.target.value
                if (focusField === 'win') { setWin(v); setIsSaved(false) }
                else if (focusField === 'gratitude') { setGratitude(v); setIsSaved(false) }
                else if (focusField === 'intention') { setIntention(v); setIsSaved(false) }
                else if (focusField === 'dream') { setDreamText(v); setDreamSaved(false); setDreamInterpretation(null) }
                else { setFreeText(v); setIsSaved(false) }
              }}
              placeholder={
                focusField === 'win' ? 'Today I learned...'
                  : focusField === 'gratitude' ? "I'm grateful for..."
                  : focusField === 'intention' ? 'Tomorrow I will...'
                  : focusField === 'dream' ? 'I dreamed that...'
                  : 'Let your thoughts flow...'
              }
              autoCapitalize="sentences"
              autoComplete="off"
              spellCheck
              enterKeyHint="enter"
              className="flex-1 w-full bg-transparent text-white text-lg leading-loose placeholder-white/30 caret-amber-400 focus:outline-none resize-none"
            />
          </div>

          {/* Toolbar pinned at bottom */}
          <FocusModeToolbar
            label={
              focusField === 'win' ? 'Learned'
                : focusField === 'gratitude' ? 'Grateful'
                : focusField === 'intention' ? 'Intention'
                : focusField === 'dream' ? 'Dream'
                : 'Free Write'
            }
            text={
              focusField === 'win' ? win
                : focusField === 'gratitude' ? gratitude
                : focusField === 'intention' ? intention
                : focusField === 'dream' ? dreamText
                : freeText
            }
            autosaveStatus={autosaveStatus}
            onClose={exitFocusMode}
            onSave={() => {
              if (focusField === 'dream') {
                submitDream()
              } else {
                handleSave()
              }
            }}
            isSaving={isSaving || dreamLoading}
          />
        </div>
      )}

      {/* Weekly Review Modal */}
      {showWeeklyReview && (
        <WeeklyReview
          isModal={true}
          onClose={() => setShowWeeklyReview(false)}
        />
      )}

      {/* Milestone Celebration Toast */}
      {milestoneStreak !== null && (
        <JournalMilestoneCelebration
          streak={milestoneStreak}
          onDismiss={() => setMilestoneStreak(null)}
        />
      )}
    </div>
  )
}
