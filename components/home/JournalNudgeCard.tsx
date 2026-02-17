'use client'

import Link from 'next/link'
import { PenLine, Check } from 'lucide-react'
import { getPromptForDate } from '@/components/journal/JournalPrompts'

const MOOD_EMOJI: Record<string, string> = {
  awful: '😞', low: '😔', okay: '😐', good: '😊', great: '😄',
}

interface JournalNudgeCardProps {
  journalData: any
  journalLoading: boolean
}

export function JournalNudgeCard({ journalData, journalLoading }: JournalNudgeCardProps) {
  if (journalLoading) return null

  const hasEntry = journalData?.journal_win || journalData?.journal_gratitude
    || journalData?.journal_intention || journalData?.journal_freetext
    || journalData?.journal_dream

  const moodEmoji = journalData?.journal_mood ? MOOD_EMOJI[journalData.journal_mood] : null
  const todayPrompt = getPromptForDate(new Date())

  if (hasEntry) {
    return (
      <Link href="/journal" className="block">
        <div className="rounded-2xl p-4 border border-white/25 bg-black">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10">
              <Check className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Journaled today</p>
              <p className="text-xs text-white/75 mt-0.5 truncate">
                {journalData.journal_freetext || journalData.journal_win || journalData.journal_gratitude || 'Entry saved'}
              </p>
            </div>
            {moodEmoji && <span className="text-lg">{moodEmoji}</span>}
          </div>
        </div>
      </Link>
    )
  }

  return (
    <Link href="/journal" className="block">
      <div className="rounded-2xl p-4 border border-white/25 bg-black hover:border-white/30 transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/10">
            <PenLine className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white">Today&apos;s prompt</p>
            <p className="text-xs text-white/75 mt-0.5 line-clamp-1 italic">
              &ldquo;{todayPrompt.prompt.text}&rdquo;
            </p>
          </div>
          <span className="text-xs font-medium text-white/90 whitespace-nowrap">Write now</span>
        </div>
      </div>
    </Link>
  )
}
