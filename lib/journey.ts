import type { MindsetId } from './mindset/types'

// What each mindset is moving toward — fills "becoming more ___" so the journey
// feels personal to the path the user chose.
const PURSUIT: Record<MindsetId, string> = {
  stoic: 'disciplined',
  existentialist: 'intentional',
  cynic: 'clear-eyed',
  hedonist: 'present',
  samurai: 'disciplined',
  scholar: 'wise',
  manifestor: 'aligned',
  hustler: 'relentless',
}

// The shared milestone ladder — named stages a streak passes through. The names
// turn a counter into an arc ("Building Momentum", "Unshakeable").
export const JOURNEY_STAGES = [
  { minDay: 1, name: 'First Steps' },
  { minDay: 3, name: 'Taking Root' },
  { minDay: 7, name: 'Building Momentum' },
  { minDay: 14, name: 'Finding Rhythm' },
  { minDay: 21, name: 'Forging the Habit' },
  { minDay: 30, name: 'Unshakeable' },
  { minDay: 50, name: 'Transformed' },
  { minDay: 100, name: 'Mastery' },
] as const

export interface Journey {
  day: number
  pursuit: string
  pathName: string          // mindset name, e.g. "Stoic"
  isBeginning: boolean
  stage: string             // current stage name
  stageIndex: number        // -1 before the first stage
  nextStage: string | null
  nextStageDay: number | null
  daysToNext: number | null
  progressToNext: number    // 0–1 within the current → next band
}

// Build the journey from the user's mindset + their current streak day.
export function getJourney(mindsetId: MindsetId | undefined, mindsetName: string | undefined, day: number): Journey {
  const pursuit = PURSUIT[mindsetId ?? 'stoic'] ?? 'disciplined'
  const pathName = mindsetName || 'Your'

  if (day <= 0) {
    return {
      day: 0, pursuit, pathName, isBeginning: true,
      stage: 'Beginning', stageIndex: -1,
      nextStage: JOURNEY_STAGES[0].name, nextStageDay: JOURNEY_STAGES[0].minDay,
      daysToNext: 1, progressToNext: 0,
    }
  }

  let idx = 0
  for (let i = 0; i < JOURNEY_STAGES.length; i++) {
    if (day >= JOURNEY_STAGES[i].minDay) idx = i
  }
  const current = JOURNEY_STAGES[idx]
  const next = JOURNEY_STAGES[idx + 1] ?? null
  const bandStart = current.minDay
  const bandEnd = next ? next.minDay : current.minDay
  const progressToNext = next ? Math.min(1, Math.max(0, (day - bandStart) / (bandEnd - bandStart))) : 1

  return {
    day, pursuit, pathName, isBeginning: false,
    stage: current.name, stageIndex: idx,
    nextStage: next?.name ?? null,
    nextStageDay: next?.minDay ?? null,
    daysToNext: next ? Math.max(0, next.minDay - day) : null,
    progressToNext,
  }
}
