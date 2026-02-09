export interface BreathingTechnique {
  id: string
  name: string
  tagline: string
  icon: string
  color: string
  pattern: { inhale: number; hold1: number; exhale: number; hold2: number }
  rounds: number
  description: string
}

export const BREATHING_TECHNIQUES: BreathingTechnique[] = [
  {
    id: 'box',
    name: 'Box Breathing',
    tagline: 'Calm & balanced',
    icon: '4',
    color: 'from-cyan-500/40 to-blue-500/40',
    pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
    rounds: 5,
    description: 'Equal intervals of inhale, hold, exhale, and hold. Used by Navy SEALs to stay calm under pressure.',
  },
  {
    id: '478',
    name: '4-7-8 Sleep',
    tagline: 'Fall asleep fast',
    icon: '8',
    color: 'from-indigo-500/40 to-violet-500/40',
    pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
    rounds: 4,
    description: 'The relaxing breath technique. Naturally calms the nervous system and promotes sleep.',
  },
  {
    id: 'wim',
    name: 'Power Breath',
    tagline: 'Energy boost',
    icon: '!',
    color: 'from-orange-500/40 to-amber-500/40',
    pattern: { inhale: 2, hold1: 0, exhale: 2, hold2: 0 },
    rounds: 10,
    description: 'Rapid rhythmic breathing to energize the body and sharpen focus.',
  },
  {
    id: 'coherent',
    name: 'Coherent',
    tagline: 'Heart-brain sync',
    icon: '~',
    color: 'from-fuchsia-500/40 to-purple-500/40',
    pattern: { inhale: 5.5, hold1: 0, exhale: 5.5, hold2: 0 },
    rounds: 6,
    description: 'Breathe at 5.5 breaths per minute to synchronize heart rate and brain waves.',
  },
]

export type BreathPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2'

export interface BreathPhaseInfo {
  phase: BreathPhase
  label: string
  progress: number // 0-1 within this phase
  round: number    // 1-based
  totalRounds: number
  isComplete: boolean
}

export function getBreathingPhase(technique: BreathingTechnique, elapsedMs: number): BreathPhaseInfo {
  const { pattern, rounds } = technique
  const cycleSeconds = pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2
  const cycleMs = cycleSeconds * 1000
  const totalMs = cycleMs * rounds

  if (elapsedMs >= totalMs) {
    return { phase: 'exhale', label: 'Complete', progress: 1, round: rounds, totalRounds: rounds, isComplete: true }
  }

  const currentRound = Math.floor(elapsedMs / cycleMs) + 1
  const posInCycle = (elapsedMs % cycleMs) / 1000

  const allPhases: { phase: BreathPhase; label: string; duration: number }[] = [
    { phase: 'inhale' as const, label: 'Breathe In', duration: pattern.inhale },
    { phase: 'hold1' as const, label: 'Hold', duration: pattern.hold1 },
    { phase: 'exhale' as const, label: 'Breathe Out', duration: pattern.exhale },
    { phase: 'hold2' as const, label: 'Hold', duration: pattern.hold2 },
  ]
  const phases = allPhases.filter(p => p.duration > 0)

  let accumulated = 0
  for (const p of phases) {
    if (posInCycle < accumulated + p.duration) {
      const progress = (posInCycle - accumulated) / p.duration
      return { phase: p.phase, label: p.label, progress, round: currentRound, totalRounds: rounds, isComplete: false }
    }
    accumulated += p.duration
  }

  return { phase: 'inhale', label: 'Breathe In', progress: 0, round: currentRound, totalRounds: rounds, isComplete: false }
}

export function getTotalDuration(technique: BreathingTechnique): number {
  const { pattern, rounds } = technique
  return (pattern.inhale + pattern.hold1 + pattern.exhale + pattern.hold2) * rounds
}
