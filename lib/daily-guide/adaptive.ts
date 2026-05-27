import type { SessionType } from './decision-tree'
import { getSessionConfig } from './decision-tree'

// The adaptive layer: given what we already know about the user's state right
// now (mood + energy + which session is time-appropriate + what's done),
// suggest the single most helpful next step. Deliberately returns null unless
// there's a REAL signal worth acting on — so the card only appears when the
// guide is genuinely adapting, never as redundant noise over the hero card.

export interface AdaptiveInput {
  mood: string | null // 'awful'|'low'|'medium'|'okay'|'good'|'high'|'great'
  energy: string | null // 'low'|'normal'|'high'
  currentSession: SessionType // the time-appropriate session
  completedSessions: SessionType[]
}

export interface AdaptiveRecommendation {
  kind: 'reset' | 'session'
  session?: SessionType
  reason: string
  cta: string
}

const LOW_MOODS = new Set(['awful', 'low'])

export function getAdaptiveRecommendation(input: AdaptiveInput): AdaptiveRecommendation | null {
  const { mood, energy, currentSession, completedSessions } = input
  const done = (s: SessionType) => completedSessions.includes(s)
  const name = (s: SessionType) => getSessionConfig(s).name

  // 1. Low mood → an immediate grounding reset is the kindest first move,
  //    ahead of any scheduled session.
  if (mood && LOW_MOODS.has(mood)) {
    return {
      kind: 'reset',
      reason: 'You logged a low mood. A 2-minute grounding reset can take the edge off before anything else.',
      cta: 'Start a reset',
    }
  }

  // 2. Low energy → recharge with the time-appropriate session (if not done).
  if (energy === 'low' && !done(currentSession)) {
    return {
      kind: 'session',
      session: currentSession,
      reason: `Energy's running low — ${name(currentSession)} is a quick recharge.`,
      cta: `Start ${name(currentSession)}`,
    }
  }

  // 3. High energy in the evening → settle before sleep.
  if (
    energy === 'high' &&
    (currentSession === 'wind_down' || currentSession === 'bedtime_story') &&
    !done('wind_down')
  ) {
    return {
      kind: 'session',
      session: 'wind_down',
      reason: 'Lots of energy tonight — Wind Down will help you settle before sleep.',
      cta: 'Start Wind Down',
    }
  }

  // No strong signal — the hero session card is guidance enough.
  return null
}
