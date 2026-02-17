'use client'

import { useMemo } from 'react'
import { PenLine } from 'lucide-react'
import { MINDSET_QUOTES } from '@/lib/mindset/quotes'
import { MINDSET_DAILY_QUESTIONS } from '@/lib/mindset/daily-questions'
import type { MindsetId } from '@/lib/mindset/types'

interface EmptyWritingStateProps {
  mindsetId?: MindsetId
  onStartWriting: (starterText?: string) => void
  visible: boolean
}

/** Date-seeded index picker (deterministic per day) */
function dateSeedIndex(length: number): number {
  const now = new Date()
  const seed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  return seed % length
}

const GENERIC_CHIPS = [
  '3 things I\'m grateful for',
  'Today I noticed...',
  'A moment that mattered',
  'What\'s on my mind right now',
]

export function EmptyWritingState({ mindsetId, onStartWriting, visible }: EmptyWritingStateProps) {
  const quote = useMemo(() => {
    const id = mindsetId || 'stoic'
    const pool = MINDSET_QUOTES[id]
    if (!pool?.length) return null
    return pool[dateSeedIndex(pool.length)]
  }, [mindsetId])

  const chips = useMemo(() => {
    const id = mindsetId || 'stoic'
    const mindsetQs = MINDSET_DAILY_QUESTIONS[id] || []
    // Pick 2 mindset questions (date-seeded) + 2 generic
    const picked: string[] = []
    if (mindsetQs.length >= 2) {
      const idx = dateSeedIndex(mindsetQs.length)
      picked.push(mindsetQs[idx])
      picked.push(mindsetQs[(idx + 1) % mindsetQs.length])
    } else if (mindsetQs.length === 1) {
      picked.push(mindsetQs[0])
    }
    // Add generic chips to fill to 4
    const genericIdx = dateSeedIndex(GENERIC_CHIPS.length)
    for (let i = 0; picked.length < 4 && i < GENERIC_CHIPS.length; i++) {
      const chip = GENERIC_CHIPS[(genericIdx + i) % GENERIC_CHIPS.length]
      if (!picked.includes(chip)) picked.push(chip)
    }
    return picked.slice(0, 4)
  }, [mindsetId])

  return (
    <div
      className={`flex flex-col items-center justify-center py-8 transition-all duration-300 ${
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none h-0 overflow-hidden'
      }`}
    >
      {/* Quote */}
      {quote && (
        <div className="max-w-xs text-center mb-6 px-4">
          <p className="text-lg italic text-white leading-relaxed [text-shadow:0_1px_8px_rgba(0,0,0,0.9)]">
            &ldquo;{quote.text}&rdquo;
          </p>
          <p className="text-xs text-white/90 mt-2 [text-shadow:0_1px_4px_rgba(0,0,0,0.8)]">&mdash; {quote.author}</p>
        </div>
      )}

      {/* Start writing button */}
      <button
        onClick={() => onStartWriting()}
        className="px-5 py-2 rounded-full bg-black border border-white/20 text-white text-sm hover:bg-black/80 transition-all mb-5"
      >
        <PenLine className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
        Start writing...
      </button>

      {/* Quick-start prompt chips */}
      <div className="flex flex-wrap justify-center gap-2 max-w-sm px-4">
        {chips.map((chip, i) => (
          <button
            key={i}
            onClick={() => onStartWriting(chip + ' ')}
            className="px-3 py-1.5 rounded-full bg-black border border-white/15 text-xs text-white hover:bg-black/80 transition-all"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  )
}
