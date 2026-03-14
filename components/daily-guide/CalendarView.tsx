'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Check, Circle, Flame, X, BookOpen, Heart, Target, Lightbulb, PenTool, Moon, MessageCircle } from 'lucide-react'

interface DayData {
  date: Date
  morning_prime_done?: boolean
  midday_reset_done?: boolean
  wind_down_done?: boolean
  bedtime_story_done?: boolean
  journal_win?: string | null
  journal_gratitude?: string | null
  journal_intention?: string | null
  journal_learned?: string | null
  journal_freetext?: string | null
  journal_dream?: string | null
  journal_conversation?: string | null
  journal_mood?: string | null
}

interface CalendarViewProps {
  onSelectDate?: (date: Date) => void
  currentStreak?: number
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function hasJournalEntry(day: DayData): boolean {
  return !!(day.journal_win || day.journal_gratitude || day.journal_intention || day.journal_learned || day.journal_freetext || day.journal_dream || day.journal_conversation)
}

function getCompletionLevel(day: DayData): number {
  let count = 0
  if (day.morning_prime_done) count++
  if (day.midday_reset_done) count++
  if (day.wind_down_done) count++
  if (day.bedtime_story_done) count++
  return count
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function CalendarView({ onSelectDate, currentStreak = 0 }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [monthData, setMonthData] = useState<Record<string, DayData>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showJournalPopup, setShowJournalPopup] = useState(false)
  const [selectedDayData, setSelectedDayData] = useState<DayData | null>(null)
  const isMountedRef = useRef(true)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  const daysInMonth = getDaysInMonth(year, month)
  const firstDayOfMonth = getFirstDayOfMonth(year, month)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Fetch data for the current month
  useEffect(() => {
    isMountedRef.current = true

    const fetchMonthData = async () => {
      if (isMountedRef.current) setIsLoading(true)
      try {
        const startDate = new Date(year, month, 1)
        const endDate = new Date(year, month + 1, 0)

        const response = await fetch(
          `/api/daily-guide/journal?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
        )

        if (!isMountedRef.current) return

        if (response.ok) {
          const data = await response.json()
          if (!isMountedRef.current) return

          const dataMap: Record<string, DayData> = {}

          data.entries?.forEach((entry: any) => {
            const date = new Date(entry.date)
            const key = date.toISOString().split('T')[0]
            dataMap[key] = {
              date,
              morning_prime_done: entry.morning_prime_done,
              midday_reset_done: entry.midday_reset_done,
              wind_down_done: entry.wind_down_done,
              bedtime_story_done: entry.bedtime_story_done,
              journal_win: entry.journal_win,
              journal_gratitude: entry.journal_gratitude,
              journal_intention: entry.journal_intention,
              journal_learned: entry.journal_learned,
              journal_freetext: entry.journal_freetext,
              journal_dream: entry.journal_dream,
              journal_conversation: entry.journal_conversation,
              journal_mood: entry.journal_mood,
            }
          })

          setMonthData(dataMap)
        }
      } catch (error) {
        console.error('Failed to fetch calendar data:', error)
      } finally {
        if (isMountedRef.current) setIsLoading(false)
      }
    }

    fetchMonthData()

    return () => {
      isMountedRef.current = false
    }
  }, [year, month])

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day)
    if (clickedDate > today) return // Can't select future dates

    setSelectedDate(clickedDate)
    onSelectDate?.(clickedDate)

    // Show journal popup if there's data for this day
    const dateKey = clickedDate.toISOString().split('T')[0]
    const dayData = monthData[dateKey]
    if (dayData) {
      setSelectedDayData({ ...dayData, date: clickedDate })
      setShowJournalPopup(true)
    }
  }

  const renderDay = (day: number) => {
    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    const dateKey = date.toISOString().split('T')[0]
    const dayData = monthData[dateKey]
    const isToday = date.getTime() === today.getTime()
    const isFuture = date > today
    const isSelected = selectedDate && date.getTime() === selectedDate.getTime()
    const completionLevel = dayData ? getCompletionLevel(dayData) : 0
    const hasJournal = dayData ? hasJournalEntry(dayData) : false

    return (
      <button
        key={day}
        onClick={() => handleDateClick(day)}
        disabled={isFuture}
        aria-label={`${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${completionLevel >= 4 ? ', complete' : completionLevel > 0 ? `, ${completionLevel} sessions` : ''}${hasJournal ? ', has journal' : ''}`}
        className={`
          relative aspect-square flex flex-col items-center justify-center rounded-xl transition-all
          focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none
          ${isFuture ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10 cursor-pointer'}
          ${isToday ? 'ring-2 ring-white/30' : ''}
          ${isSelected ? 'bg-white/20' : ''}
          ${completionLevel >= 4 ? 'bg-emerald-500/20' : completionLevel >= 2 ? 'bg-amber-500/10' : ''}
        `}
      >
        <span className={`text-sm ${
          isToday ? 'font-bold text-white' :
          completionLevel >= 4 ? 'text-emerald-400' :
          completionLevel >= 2 ? 'text-amber-400' :
          isFuture ? 'text-white/40' : 'text-white/70'
        }`}>
          {day}
        </span>

        {/* Completion indicator */}
        {completionLevel > 0 && (
          <div className="flex gap-0.5 mt-0.5">
            {completionLevel >= 4 ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              [...Array(Math.min(completionLevel, 4))].map((_, i) => (
                <Circle key={i} className="w-1.5 h-1.5 fill-amber-400 text-amber-400" />
              ))
            )}
          </div>
        )}

        {/* Journal indicator */}
        {hasJournal && (
          <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-400" />
        )}
      </button>
    )
  }

  // Calculate stats for the month
  const stats = {
    completedDays: Object.values(monthData).filter(d => getCompletionLevel(d) >= 4).length,
    partialDays: Object.values(monthData).filter(d => {
      const level = getCompletionLevel(d)
      return level > 0 && level < 4
    }).length,
    journalDays: Object.values(monthData).filter(d => hasJournalEntry(d)).length,
  }

  return (
    <div className="rounded-2xl bg-black border border-white/25 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
      {/* Header */}
      <div className="p-4 border-b border-white/15">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-white">Your Progress</h2>
          {currentStreak > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{currentStreak}</span>
            </div>
          )}
        </div>

        {/* Month navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousMonth}
            aria-label="Previous month"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={goToToday}
            aria-label="Go to today"
            className="text-sm font-medium text-white hover:text-white/90 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none rounded-lg px-2 py-1"
          >
            {MONTHS[month]} {year}
          </button>
          <button
            onClick={goToNextMonth}
            aria-label="Next month"
            className="p-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS_OF_WEEK.map(day => (
                <div key={day} className="text-center text-xs text-white/50 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for days before the first of the month */}
              {[...Array(firstDayOfMonth)].map((_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))}

              {/* Days of the month */}
              {[...Array(daysInMonth)].map((_, i) => renderDay(i + 1))}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-lg font-bold text-emerald-400">{stats.completedDays}</p>
            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wide">Complete</p>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
            <p className="text-lg font-bold text-amber-400">{stats.partialDays}</p>
            <p className="text-[10px] text-amber-400/70 uppercase tracking-wide">Partial</p>
          </div>
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
            <p className="text-lg font-bold text-blue-400">{stats.journalDays}</p>
            <p className="text-[10px] text-blue-400/70 uppercase tracking-wide">Journals</p>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex items-center justify-center gap-4 text-[10px] text-white/50">
        <div className="flex items-center gap-1">
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-1">
          <Circle className="w-2 h-2 fill-amber-400 text-amber-400" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-blue-400" />
          <span>Journal</span>
        </div>
      </div>

      {/* Journal Popup */}
      {showJournalPopup && selectedDayData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Day details"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowJournalPopup(false)}
        >
          <div
            className="w-full max-w-sm bg-black rounded-2xl border border-white/25 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Popup Header */}
            <div className="p-4 border-b border-white/15 flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {selectedDayData.date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                  })}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {getCompletionLevel(selectedDayData) >= 4 ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Complete
                    </span>
                  ) : getCompletionLevel(selectedDayData) > 0 ? (
                    <span className="text-xs text-amber-400">
                      {getCompletionLevel(selectedDayData)}/4 sessions
                    </span>
                  ) : (
                    <span className="text-xs text-white/50">No activity</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowJournalPopup(false)}
                aria-label="Close"
                className="p-2 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Journal Content */}
            <div className="p-4">
              {hasJournalEntry(selectedDayData) ? (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                  {selectedDayData.journal_win && (
                    <div>
                      <div className="flex items-center gap-2 text-blue-400 mb-1.5">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm font-medium">What I learned</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                        {selectedDayData.journal_win}
                      </p>
                    </div>
                  )}
                  {selectedDayData.journal_gratitude && (
                    <div>
                      <div className="flex items-center gap-2 text-pink-400 mb-1.5">
                        <Heart className="w-4 h-4" />
                        <span className="text-sm font-medium">Grateful for</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                        {selectedDayData.journal_gratitude}
                      </p>
                    </div>
                  )}
                  {selectedDayData.journal_intention && (
                    <div>
                      <div className="flex items-center gap-2 text-purple-400 mb-1.5">
                        <Target className="w-4 h-4" />
                        <span className="text-sm font-medium">Intention</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                        {selectedDayData.journal_intention}
                      </p>
                    </div>
                  )}
                  {selectedDayData.journal_learned && (
                    <div>
                      <div className="flex items-center gap-2 text-cyan-400 mb-1.5">
                        <Lightbulb className="w-4 h-4" />
                        <span className="text-sm font-medium">Insight</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                        {selectedDayData.journal_learned}
                      </p>
                    </div>
                  )}
                  {selectedDayData.journal_freetext && (
                    <div>
                      <div className="flex items-center gap-2 text-white/80 mb-1.5">
                        <PenTool className="w-4 h-4" />
                        <span className="text-sm font-medium">Free write</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                        {selectedDayData.journal_freetext}
                      </p>
                    </div>
                  )}
                  {selectedDayData.journal_dream && (
                    <div>
                      <div className="flex items-center gap-2 text-indigo-400 mb-1.5">
                        <Moon className="w-4 h-4" />
                        <span className="text-sm font-medium">Dream journal</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4">
                        {selectedDayData.journal_dream}
                      </p>
                    </div>
                  )}
                  {selectedDayData.journal_conversation && (
                    <div>
                      <div className="flex items-center gap-2 text-green-400 mb-1.5">
                        <MessageCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Conversation</span>
                      </div>
                      <p className="text-white/70 text-sm leading-relaxed bg-white/5 rounded-xl p-4 line-clamp-6">
                        {typeof selectedDayData.journal_conversation === 'string'
                          ? selectedDayData.journal_conversation
                          : 'Conversation recorded'}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <BookOpen className="w-8 h-8 text-white/50 mx-auto mb-2" />
                  <p className="text-white/70 text-sm">No journal entry for this day</p>
                </div>
              )}
            </div>

            {/* Modules completed */}
            {getCompletionLevel(selectedDayData) > 0 && (
              <div className="px-4 pb-4">
                <p className="text-xs text-white/50 mb-2">Completed modules</p>
                <div className="flex flex-wrap gap-2">
                  {selectedDayData.morning_prime_done && (
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70">Morning Prime</span>
                  )}
                  {selectedDayData.midday_reset_done && (
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70">Midday Reset</span>
                  )}
                  {selectedDayData.wind_down_done && (
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70">Wind Down</span>
                  )}
                  {selectedDayData.bedtime_story_done && (
                    <span className="px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70">Bedtime Story</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
