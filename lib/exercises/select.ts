import { eraStage } from '@/lib/era/logic'
import { attributesForEra, type AttributeId } from './attributes'
import {
  ERA_TOOLKITS,
  SHARED_EXERCISES,
  exerciseById,
  type Difficulty,
  type Exercise,
} from './library'

/**
 * Which exercise today.
 *
 * Pure: the day, the era and what was done recently go in, one exercise
 * comes out, and the same inputs always give the same answer — so today's
 * practice doesn't change under someone who reloads the page.
 *
 * Difficulty follows the era's phase (lib/era/logic eraStage), which is
 * already the app's answer to "how hard should today feel". Week one is
 * light, week three is hard, and the last stretch eases off; nothing here
 * re-decides that.
 */

const HARDER: Record<Difficulty, Difficulty[]> = {
  // What to accept when the phase's own difficulty has nothing left.
  light: ['light', 'moderate', 'hard'],
  moderate: ['moderate', 'light', 'hard'],
  hard: ['hard', 'moderate', 'light'],
}

export interface PickInput {
  eraKey: string
  /** 1-based day of the era. */
  day: number
  lengthDays: number
  /** Exercise ids done in the last few days — avoided if anything else fits. */
  recentIds?: string[]
}

export interface Pick {
  exercise: Exercise
  /** The phase difficulty this was chosen for. */
  difficulty: Difficulty
  /** The era's attributes, for the "training" line above the card. */
  trains: AttributeId[]
  /** True when everything in the pool was done recently and one had to repeat. */
  repeat: boolean
}

/** The pool for an era: its own toolkit first, then the shared ones. */
export function poolFor(eraKey: string): Exercise[] {
  const own = ERA_TOOLKITS[eraKey] ?? []
  // An era's own exercise always beats a shared one of the same id.
  const ids = new Set(own.map(e => e.id))
  return [...own, ...SHARED_EXERCISES.filter(e => !ids.has(e.id))]
}

export function pickExercise(input: PickInput): Pick | null {
  const pool = poolFor(input.eraKey)
  if (pool.length === 0) return null

  const { difficulty } = eraStage(input.day, input.lengthDays)
  const recent = new Set(input.recentIds ?? [])
  const trains = attributesForEra(input.eraKey)

  // Prefer the phase's difficulty, then the next best band, and prefer
  // something they haven't just done — but never return nothing because
  // everything has been done once.
  for (const band of HARDER[difficulty]) {
    const inBand = pool.filter(e => e.difficulty === band)
    if (inBand.length === 0) continue
    const candidates = inBand.filter(e => !recent.has(e.id))
    if (candidates.length === 0) continue
    // Stepped by day, so consecutive days move through the band.
    const exercise = candidates[(Math.max(1, input.day) - 1) % candidates.length]
    return { exercise, difficulty, trains, repeat: false }
  }

  // Everything in every band was done recently: repeat, and say so.
  const inBand = pool.filter(e => e.difficulty === difficulty)
  const fallback = (inBand.length > 0 ? inBand : pool)
  const exercise = fallback[(Math.max(1, input.day) - 1) % fallback.length]
  return { exercise, difficulty, trains, repeat: true }
}

/**
 * The exercise a stored run refers to, with the same shape as a pick, so a
 * finished day renders from the row rather than from today's selection.
 */
export function pickFromId(id: string, eraKey: string, day: number, lengthDays: number): Pick | null {
  const exercise = exerciseById(id)
  if (!exercise) return null
  return {
    exercise,
    difficulty: eraStage(day, lengthDays).difficulty,
    trains: attributesForEra(eraKey),
    repeat: false,
  }
}

/** The cue to show at `elapsed` seconds — the last one that has come due. */
export function cueAt(exercise: Exercise, elapsed: number): string | null {
  let current: string | null = null
  for (const cue of exercise.cues) {
    if (cue.at <= elapsed) current = cue.say
    else break
  }
  return current
}

/**
 * What the app is told about today's practice.
 *
 * Lives here, in the pure layer, rather than next to the loader: the card
 * and the player are client components, and a type imported from a
 * Prisma-backed module is one careless edit away from pulling Prisma into
 * the browser bundle.
 */
export interface TodaysPractice {
  exercise: Exercise
  trains: AttributeId[]
  difficulty: Difficulty
  /** Every exercise in the pool had been done lately, so this one repeats. */
  repeat: boolean
  /** The day's run, if it has been started or finished. */
  run: {
    completed: boolean
    secondsDone: number
    helped: string | null
  } | null
  eraTitle: string | null
  eraDay: number | null
  localDay: string
}

/** How the answer to `after` is stored. Not a mood scale — see ExerciseRun. */
export type Helped = 'no' | 'some' | 'yes'

export const HELPED_OPTIONS: { value: Helped; label: string }[] = [
  { value: 'no', label: 'Not really' },
  { value: 'some', label: 'A bit' },
  { value: 'yes', label: 'Yes' },
]

export function isHelped(value: unknown): value is Helped {
  return value === 'no' || value === 'some' || value === 'yes'
}
