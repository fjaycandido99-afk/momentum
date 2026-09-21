'use client'

import { Check, Dumbbell } from 'lucide-react'
import { DIFFICULTY_DOTS } from '@/lib/era/logic'
import { attributeLabel } from '@/lib/exercises/attributes'
import type { Exercise } from '@/lib/exercises/library'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Today's practice, as one tappable card.
 *
 * Says what it trains, because that is the filter the whole app is built on
 * — an exercise is here to train a mental skill, not because wellness apps
 * have exercises.
 */
export function PracticeCard({
  exercise,
  trains,
  difficulty,
  done,
  onOpen,
}: {
  exercise: Exercise
  trains: string[]
  difficulty: 'light' | 'moderate' | 'hard'
  done?: boolean
  onOpen: () => void
}) {
  return (
    <button onClick={onOpen} className="w-full text-left card-surface-lg p-4 press-scale">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase text-white/50">
          <Dumbbell className="w-3.5 h-3.5" /> Today&rsquo;s practice
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-black bg-white rounded-full px-2 py-0.5 font-medium">
            <Check className="w-3 h-3" /> Done
          </span>
        ) : (
          <span className="flex items-center gap-1" aria-label={`Difficulty: ${difficulty}`}>
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i < DIFFICULTY_DOTS[difficulty] ? 'bg-white/70' : 'bg-white/15'}`}
              />
            ))}
          </span>
        )}
      </div>

      <p className="text-[19px] text-white leading-snug mt-1.5" style={{ ...SERIF, fontWeight: 500 }}>
        {exercise.title}
      </p>
      <p className="text-[12px] text-white/50 mt-1.5">
        {exercise.minutes} min · trains {trains.slice(0, 2).map(a => attributeLabel(a).toLowerCase()).join(' and ')}
      </p>
      {!done && <p className="text-[13px] text-white/65 mt-2 leading-snug">{exercise.why}</p>}
    </button>
  )
}
