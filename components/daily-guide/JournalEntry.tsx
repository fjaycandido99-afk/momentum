'use client'

import { useState, useEffect } from 'react'
import { PenLine, Check, Loader2, X, Sparkles } from 'lucide-react'

interface JournalEntryProps {
  date?: Date
  onClose?: () => void
  showAsModal?: boolean
}

export function JournalEntry({ date, onClose, showAsModal = false }: JournalEntryProps) {
  const [win, setWin] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load existing journal entry
  useEffect(() => {
    const loadJournal = async () => {
      try {
        const targetDate = date || new Date()
        const dateStr = targetDate.toISOString().split('T')[0]
        const response = await fetch(`/api/daily-guide/journal?date=${dateStr}`)
        if (response.ok) {
          const data = await response.json()
          if (data.journal_win) {
            setWin(data.journal_win)
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
    if (!win.trim()) return

    setIsSaving(true)
    try {
      const targetDate = date || new Date()
      const response = await fetch('/api/daily-guide/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: targetDate.toISOString(),
          journal_win: win.trim(),
        }),
      })

      if (response.ok) {
        setIsSaved(true)
        // Auto close modal after save
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

  const content = (
    <div className={`${showAsModal ? '' : 'rounded-2xl bg-white/[0.03] border border-white/10 overflow-hidden'}`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-white/10">
            <PenLine className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-medium text-white">Daily Reflection</h3>
            <p className="text-xs text-white/50">Capture your thoughts</p>
          </div>
        </div>
        {showAsModal && onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-white/40 animate-spin" />
          </div>
        ) : isSaved && !showAsModal ? (
          // Saved state (non-modal)
          <div className="py-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-3">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Saved</span>
            </div>
            <p className="text-white/80 text-sm italic">"{win}"</p>
          </div>
        ) : (
          <>
            {/* Question */}
            <div className="mb-3">
              <label className="text-sm text-white/80 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                What did you learn today?
              </label>
            </div>

            {/* Input */}
            <textarea
              value={win}
              onChange={(e) => {
                setWin(e.target.value)
                setIsSaved(false)
              }}
              placeholder="Today I learned..."
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
              rows={3}
              maxLength={500}
            />

            {/* Character count */}
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-white/30">{win.length}/500</span>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={!win.trim() || isSaving || isSaved}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  isSaved
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : win.trim()
                    ? 'bg-white/10 hover:bg-white/20 text-white'
                    : 'bg-white/5 text-white/30 cursor-not-allowed'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : isSaved ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Saved
                  </>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  // Modal version
  if (showAsModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10 overflow-hidden">
          {content}
        </div>
      </div>
    )
  }

  return content
}

// Compact inline version for showing in the flow
export function JournalPrompt({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="w-full p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 hover:border-amber-500/40 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/20 group-hover:bg-amber-500/30 transition-colors">
          <PenLine className="w-5 h-5 text-amber-400" />
        </div>
        <div className="text-left">
          <h3 className="font-medium text-white">Reflect on your day</h3>
          <p className="text-xs text-white/50">What did you learn today?</p>
        </div>
      </div>
    </button>
  )
}
