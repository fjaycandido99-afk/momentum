'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Check, PenLine, Target } from 'lucide-react'
import { getPromptForDate } from '@/components/journal/JournalPrompts'

type SheetMode = 'thought' | 'goal'

interface PlayerJournalSheetProps {
  open: boolean
  onClose: () => void
}

const STARTERS: Record<SheetMode, string> = {
  thought: 'Right now I feel...',
  goal: 'I want to...',
}

export function PlayerJournalSheet({ open, onClose }: PlayerJournalSheetProps) {
  const [mode, setMode] = useState<SheetMode>('thought')
  const [text, setText] = useState(STARTERS.thought)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const touchStartY = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const todayPrompt = getPromptForDate(new Date()).prompt.text

  const switchMode = useCallback((newMode: SheetMode) => {
    if (newMode === mode) return
    setMode(newMode)
    // Only reset text if it's still the default starter
    if (text === STARTERS[mode] || text === '') {
      setText(STARTERS[newMode])
    }
  }, [mode, text])

  const handleSave = useCallback(async () => {
    const trimmed = text.trim()
    // Don't save if it's just the starter text or empty
    if (!trimmed || trimmed === STARTERS[mode] || saving) return
    setSaving(true)
    setSaveError(false)
    try {
      let res: Response
      if (mode === 'thought') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        res = await fetch('/api/daily-guide/journal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            date: today.toISOString(),
            journal_freetext: trimmed,
          }),
        })
      } else {
        res = await fetch('/api/goals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trimmed,
            frequency: 'daily',
            target_count: 1,
          }),
        })
      }
      if (res.ok) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          setText(STARTERS[mode])
          onClose()
        }, 1500)
      } else {
        setSaveError(true)
      }
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }, [text, mode, saving, onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const deltaY = e.changedTouches[0].clientY - touchStartY.current
    if (deltaY > 80) {
      onClose()
    }
  }, [onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[59] bg-black/40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 inset-x-0 z-[60] bg-black/80 backdrop-blur-xl border-t border-white/15 rounded-t-2xl animate-slide-up"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/30" />
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-5 pb-3">
          <button
            onClick={() => switchMode('thought')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === 'thought'
                ? 'bg-white/15 text-white border border-white/25'
                : 'text-white/70 hover:text-white/85'
            }`}
          >
            <PenLine className="w-3 h-3" />
            Capture Thought
          </button>
          <button
            onClick={() => switchMode('goal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              mode === 'goal'
                ? 'bg-white/15 text-white border border-white/25'
                : 'text-white/70 hover:text-white/85'
            }`}
          >
            <Target className="w-3 h-3" />
            Set Goal
          </button>
          <div className="flex-1" />
          <button
            aria-label="Close"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-white/85" />
          </button>
        </div>

        {/* Prompt hint (thought mode only) */}
        {mode === 'thought' && (
          <p className="px-5 pb-3 text-white/70 text-xs italic leading-relaxed">
            {todayPrompt}
          </p>
        )}
        {mode === 'goal' && (
          <p className="px-5 pb-3 text-white/70 text-xs leading-relaxed">
            Turn this inspiration into action — set a daily goal.
          </p>
        )}

        {/* Textarea */}
        <div className="px-5 pb-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => {
              // Place cursor at end of starter text
              if (text === STARTERS[mode]) {
                setTimeout(() => {
                  const el = document.activeElement as HTMLTextAreaElement
                  el?.setSelectionRange(text.length, text.length)
                }, 0)
              }
            }}
            placeholder={mode === 'thought' ? "What's on your mind?" : 'What do you want to achieve?'}
            rows={3}
            className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/50 resize-none focus:outline-none focus:border-white/25 transition-colors"
            autoFocus
          />
        </div>

        {/* Save button */}
        <div className="px-5 pb-6">
          <button
            onClick={handleSave}
            disabled={!text.trim() || text.trim() === STARTERS[mode] || saving || saved}
            className="w-full py-3 rounded-xl text-sm font-medium transition-all disabled:opacity-40 flex items-center justify-center gap-2 bg-white/15 hover:bg-white/20 text-white border border-white/15"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                {mode === 'thought' ? 'Saved' : 'Goal Created'}
              </>
            ) : saveError ? (
              <span className="text-red-400">Failed to save — tap to retry</span>
            ) : saving ? (
              'Saving...'
            ) : mode === 'thought' ? (
              'Save Thought'
            ) : (
              'Create Goal'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
