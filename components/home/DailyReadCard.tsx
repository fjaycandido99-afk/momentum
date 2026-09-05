'use client'

import { useState } from 'react'
import { Compass } from 'lucide-react'
import type { DailyReadToday } from '@/hooks/useDailyRead'

/**
 * The Daily Read hero card.
 *
 * Exists to close a cold start, not to be a permanent fixture. Left to the
 * popup alone — which fires on ~40% of opens, once a day at most — a first
 * read takes about twenty days to arrive, and until then the Progress panel
 * can only say "too early to say". This card compresses that, then removes
 * itself the moment there is a lean to show.
 *
 * It never double-asks: answering here marks the day answered server-side, so
 * the popup stands down, and vice versa.
 */
export function DailyReadCard({
  data,
  onAnswered,
}: {
  data: DailyReadToday
  onAnswered: (answered: number) => void
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [count, setCount] = useState(data.answered)

  const remaining = Math.max(0, data.needed - count)

  const rate = async (score: number) => {
    if (!data.item || rating !== null) return
    setRating(score)
    const optimistic = count + 1
    setCount(optimistic)
    try {
      const res = await fetch('/api/assessment/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: data.item.id, score }),
      })
      if (res.ok) {
        const body = await res.json()
        const answered = typeof body?.read?.answered === 'number' ? body.read.answered : optimistic
        setCount(answered)
        onAnswered(answered)
        return
      }
    } catch {
      // Losing one item out of forty isn't worth an error state on home.
    }
    onAnswered(optimistic)
  }

  const progress = (
    <p className="text-[11px] text-white/60">
      {remaining > 0
        ? `${count} answered · ${remaining} more before this can say anything`
        : `${count} answered · reading forming`}
    </p>
  )

  // Answered today, or the bank is momentarily empty — show the accumulation
  // rather than nothing. Watching the number climb is the entire reason this
  // card exists during the quiet weeks.
  if (!data.item || rating !== null) {
    return (
      <div className="relative p-5 card-surface-lg h-full flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.12]">
            <Compass className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-white">Daily Read</h2>
            <p className="text-xs text-white/90">
              {rating !== null ? 'Noted — thanks' : 'Answered for today'}
            </p>
          </div>
        </div>
        <div className="mt-auto pt-2 flex flex-col gap-2">
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-white/70 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (count / data.needed) * 100)}%` }}
            />
          </div>
          {progress}
        </div>
      </div>
    )
  }

  return (
    <div className="relative p-5 card-surface-lg h-full flex flex-col justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/[0.06] border border-white/[0.12]">
          <Compass className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-white">Daily Read</h2>
          <p className="text-xs text-white/90">One tap, and it learns how you tick</p>
        </div>
      </div>

      <p className="text-[15px] text-white leading-snug mt-3">{data.item.text}</p>

      <div className="mt-auto pt-3 flex flex-col gap-2">
        <div className="flex items-stretch gap-1.5" role="radiogroup" aria-label={data.item.text}>
          {data.scale.map(point => (
            <button
              key={point.score}
              role="radio"
              aria-checked={false}
              aria-label={point.label}
              onClick={() => rate(point.score)}
              className="flex-1 min-h-[2.75rem] px-1 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-[10px] leading-tight text-white/80 font-medium hover:bg-white/[0.12] hover:text-white active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              {point.label}
            </button>
          ))}
        </div>
        {progress}
      </div>
    </div>
  )
}
