'use client'

import { Check, Play } from 'lucide-react'
import { DIFFICULTY_DOTS } from '@/lib/era/logic'
import { attributeLabel } from '@/lib/exercises/attributes'
import type { Exercise } from '@/lib/exercises/library'

const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const

/**
 * Today's practice, as one tappable card.
 *
 * Built to look like the audio card — same art block, same round start
 * button on the right — because it is the same kind of thing: one thing to
 * do now, from the screen you are already on. It reads as a session rather
 * than as a row in a settings list, which is what it looked like first.
 *
 * It says what it trains, because that is the filter the whole app is built
 * on: an exercise is here to train a mental skill, not because wellness apps
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
  const skills = trains.slice(0, 2).map(a => attributeLabel(a).toLowerCase())

  return (
    <button onClick={onOpen} className="w-full text-left card-surface-lg p-4 press-scale flex items-center gap-4">
      {/* The minutes ARE the art: a practice has no cover, and a number you
          can commit to is the most useful thing to put in that square. */}
      <div
        className={`w-14 h-14 shrink-0 rounded-xl border flex flex-col items-center justify-center ${
          done
            ? 'border-white/[0.12] bg-white/[0.04]'
            : 'border-white/[0.14] bg-[linear-gradient(160deg,rgba(255,255,255,0.16),rgba(255,255,255,0.02))]'
        }`}
        aria-hidden
      >
        {done ? (
          <Check className="w-5 h-5 text-white/70" />
        ) : (
          <>
            <span className="text-[19px] leading-none text-white tabular-nums" style={{ ...SERIF, fontWeight: 600 }}>
              {exercise.minutes}
            </span>
            <span className="text-[9px] tracking-[0.14em] uppercase text-white/45 mt-0.5">min</span>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-[10px] tracking-[0.24em] uppercase text-white/50">
            {done ? 'Practice done' : 'Today’s practice'}
          </p>
          {!done && (
            <span className="flex items-center gap-[3px]" aria-label={`Difficulty: ${difficulty}`}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className={`w-1 h-1 rounded-full ${i < DIFFICULTY_DOTS[difficulty] ? 'bg-white/60' : 'bg-white/15'}`}
                />
              ))}
            </span>
          )}
        </div>
        <p className="text-xl text-white leading-tight mt-0.5 truncate" style={{ ...SERIF, fontWeight: 500 }}>
          {exercise.title}
        </p>
        <p className="text-xs text-white/55 mt-0.5 truncate">
          {done ? skills.join(' and ') : `Trains ${skills.join(' and ')}`}
        </p>
      </div>

      <span
        className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center ${
          done ? 'border border-white/20 text-white/60' : 'bg-white text-black'
        }`}
        aria-hidden
      >
        <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
      </span>
    </button>
  )
}
