'use client'

import { useCallback, useEffect, useState } from 'react'
import { PracticeCard } from './PracticeCard'
import { ExercisePlayer } from './ExercisePlayer'
import type { TodaysPractice } from '@/lib/exercises/server'
import type { Helped } from '@/lib/exercises/select'
import { trackFeature } from '@/lib/analytics/track'

/**
 * Today's practice, fetched and run. Self-contained so both home and /era
 * can show it without either owning the state.
 *
 * Renders nothing at all when there's no era — the practice is the practice
 * step OF an era, and a guided exercise with nothing behind it is content.
 */
export function PracticeSection({ hasEra }: { hasEra: boolean }) {
  const [practice, setPractice] = useState<TodaysPractice | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!hasEra) return
    let alive = true
    fetch('/api/exercise')
      .then(r => (r.ok ? r.json() : null))
      .then(data => { if (alive && data?.practice) setPractice(data.practice) })
      .catch(() => {})
    return () => { alive = false }
  }, [hasEra])

  const record = useCallback((args: { secondsDone: number; completed: boolean; helped?: Helped }) => {
    if (!practice) return
    // Fire and forget: a failed write must never interrupt a running
    // exercise. The next GET re-reads whatever landed.
    fetch('/api/exercise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exerciseId: practice.exercise.id, ...args }),
    }).catch(() => {})
    if (args.completed) {
      setPractice(p => (p ? { ...p, run: { completed: true, secondsDone: args.secondsDone, helped: args.helped ?? null } } : p))
    }
  }, [practice])

  if (!hasEra || !practice) return null

  return (
    <>
      <PracticeCard
        exercise={practice.exercise}
        trains={practice.trains}
        difficulty={practice.difficulty}
        done={!!practice.run?.completed}
        onOpen={() => {
          trackFeature('era', 'open', `practice:${practice.exercise.id}`)
          setOpen(true)
        }}
      />
      {open && (
        <ExercisePlayer
          exercise={practice.exercise}
          trains={practice.trains}
          difficulty={practice.difficulty}
          alreadyDone={!!practice.run?.completed}
          onRecord={record}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
