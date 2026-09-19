/**
 * What makes each era its own program rather than a label on the same loop.
 *
 *  - `coachFocus`   added to the coach's prompt, so Gym Arc talks training and
 *                   recovery while Comeback Season stays gentle.
 *  - `soundscapeId` / `guideId`  the app content this era leans on, surfaced on
 *                   the era card so the whole app points at the goal. Ids must
 *                   exist in SOUNDSCAPE_ITEMS (components/player/SoundscapePlayer)
 *                   and VOICE_GUIDES (components/home/home-types).
 *
 * Daily missions live in missions.ts; stages in logic.ts (eraStage).
 * Keys match lib/era/presets.ts, plus 'custom' for eras people name themselves.
 */

export interface EraProgram {
  coachFocus: string
  soundscapeId: string
  guideId: string
  /**
   * Hero art, served from /public (e.g. '/era/locked_in.jpg'). Leave unset
   * until the file is actually committed — the hero renders text-only
   * without it, and a path to a missing file would show a broken image.
   */
  image?: string
}

/** Art for the "Who are you becoming?" hero shown before an era starts. */
export const ERA_START_IMAGE: string | undefined = '/era/start.jpg'

export const ERA_PROGRAMS: Record<string, EraProgram> = {
  locked_in: {
    coachFocus:
      'Focus: the one important thing they keep avoiding. Push toward starting it early and finishing before distractions win. Name drift plainly when you see it.',
    soundscapeId: 'focus',
    guideId: 'focus_meditation',
    image: '/era/locked_in.jpg',
  },
  discipline: {
    coachFocus:
      "Focus: acting without waiting for motivation. Treat feelings as weather, not instructions. Small, non-negotiable reps beat heroic days.",
    soundscapeId: 'energy',
    guideId: 'affirmation',
    image: '/era/discipline.jpg',
  },
  comeback: {
    coachFocus:
      'Focus: rebuilding after a hard stretch. Be gentle and steady — no pressure, no shame, no comparison to who they were. Every small step back counts.',
    soundscapeId: 'relax',
    guideId: 'emotional_reset',
    image: '/era/comeback.jpg',
  },
  gym_arc: {
    coachFocus:
      'Focus: showing up for their body consistently. Training, recovery and sleep all count. Never encourage training through pain, and never give diet, calorie or weight advice.',
    soundscapeId: 'energy',
    guideId: 'breathing',
    image: '/era/gym_arc.jpg',
  },
  stoic_mode: {
    coachFocus:
      "Focus: the dichotomy of control. Help them separate what's theirs to act on from what isn't, and respond instead of react.",
    soundscapeId: 'rain',
    guideId: 'anxiety',
    image: '/era/stoic_mode.jpg',
  },
  confidence: {
    coachFocus:
      'Focus: speaking up and taking up space. Celebrate the attempt, not the outcome. Discomfort is the sign they did it.',
    soundscapeId: 'energy',
    guideId: 'confidence',
    image: '/era/confidence.jpg',
  },
  study: {
    coachFocus:
      'Focus: deep, undistracted study blocks and real recall over re-reading. Protect the first focused hour; the phone is the enemy of the block.',
    soundscapeId: 'focus',
    guideId: 'focus_meditation',
    image: '/era/study.jpg',
  },
  five_am: {
    coachFocus:
      'Focus: owning the early morning — the wake-up itself, no phone first, and a sane bedtime the night before. Sleep is part of the plan, not the obstacle.',
    soundscapeId: 'energy',
    guideId: 'breathing',
    image: '/era/five_am.jpg',
  },
  custom: {
    coachFocus:
      'Focus: the change they named on day 1. Keep every reply tied to that, in their own terms.',
    soundscapeId: 'focus',
    guideId: 'breathing',
    image: '/era/custom.jpg',
  },
}

export function programFor(eraKey: string): EraProgram {
  return ERA_PROGRAMS[eraKey] ?? ERA_PROGRAMS.custom
}
