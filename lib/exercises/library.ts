import type { AttributeId } from './attributes'

/**
 * The practice step of a day: an exercise Voxu actually runs, rather than a
 * sentence telling someone to go and do one.
 *
 * "Do a breathing exercise" is not an instruction, it's a hint. Each of
 * these says what to do, then walks through it on a clock — the prompt at
 * 00:30 arrives while the person is sitting there, which is the whole
 * difference between a coach and a checklist.
 *
 * What is NOT in here: anything that happens out in the world (go to the
 * gym, make the call, finish the task). Those are MISSIONS and they already
 * exist — see lib/era/missions.ts. An exercise is something the app can run
 * with you, now; a mission is something you go and do. Keeping the line
 * there is what stops this becoming a second, competing to-do list.
 *
 * IDs are stored on ExerciseRun rows. Never rename one; retire it by
 * removing it from a toolkit.
 */

export type ExerciseFormat =
  /** Voxu walks each step on a timer. */
  | 'guided'
  /** One block of time with a start and an end (a work sprint). */
  | 'timed'
  /** A question to answer, with prompts. No clock worth watching. */
  | 'reflection'

export type Difficulty = 'light' | 'moderate' | 'hard'

export interface ExerciseCue {
  /** Seconds from the start. The first is always 0. */
  at: number
  say: string
}

export interface Exercise {
  id: string
  title: string
  /** What this trains. One or two — three would mean it trains nothing. */
  trains: AttributeId[]
  /** Why it works. One sentence, plain, no citation theatre. */
  why: string
  minutes: number
  difficulty: Difficulty
  format: ExerciseFormat
  /** Read before starting: what you're about to do, in order. */
  steps: string[]
  /** What Voxu says, and when, while it runs. */
  cues: ExerciseCue[]
  /** Asked once at the end. Not a mood scale — see the note in the sheet. */
  after: string
}

const SECOND = 1
const MINUTE = 60

/**
 * Exercises any era can use. Small on purpose: a shared library that grows
 * faster than the era-specific ones is how an app ends up generic.
 */
export const SHARED_EXERCISES: Exercise[] = [
  {
    id: 'breathing_reset_60',
    title: '60-Second Reset',
    trains: ['emotional_control'],
    why: 'A long exhale is the one lever you have on your own nervous system — it slows your heart rate without needing to calm down first.',
    minutes: 1,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Sit still. Put both feet on the floor.',
      'Breathe in through your nose for four seconds.',
      'Breathe out through your mouth for six.',
      'Keep going until the timer ends. Nothing else to do.',
    ],
    cues: [
      { at: 0, say: 'Feet on the floor. Breathe in for four.' },
      { at: 10 * SECOND, say: 'Out for six. Longer than the in-breath.' },
      { at: 25 * SECOND, say: 'Keep the exhale slow. Nothing else to do.' },
      { at: 45 * SECOND, say: 'Last few breaths.' },
    ],
    after: 'Did that settle you at all?',
  },
  {
    id: 'evening_review',
    title: 'Two Questions, Then Bed',
    trains: ['consistency', 'perspective'],
    why: 'Naming what actually happened stops the day being remembered as just a feeling about yourself.',
    minutes: 3,
    difficulty: 'light',
    format: 'reflection',
    steps: [
      'What did you do today that the version of you from last month would not have?',
      'What is the one thing you will not repeat tomorrow?',
      'That is it. Two answers, not an essay.',
    ],
    cues: [
      { at: 0, say: 'What did you do today that last month’s you would not have?' },
      { at: 60 * SECOND, say: 'Now the other one: what will you not repeat tomorrow?' },
      { at: 150 * SECOND, say: 'Finish the sentence you are on.' },
    ],
    after: 'Was that worth the three minutes?',
  },
]

/**
 * LOCKED IN — focus, discipline, consistency.
 *
 * The authored toolkit. Every other era gets the shared ones until its own
 * is written; eight half-empty toolkits would be worse than one that works.
 */
export const LOCKED_IN_EXERCISES: Exercise[] = [
  {
    id: 'clear_the_runway',
    title: 'Clear the Runway',
    trains: ['focus'],
    why: 'Most lost focus is not weak will, it is a desk and a phone arranged for interruption.',
    minutes: 2,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Phone face down, out of arm’s reach.',
      'Close every tab that is not the work.',
      'Put water where you can reach it.',
      'Say the one task out loud.',
    ],
    cues: [
      { at: 0, say: 'Phone face down, and out of reach. Not in your pocket.' },
      { at: 25 * SECOND, say: 'Close every tab that is not the work.' },
      { at: 60 * SECOND, say: 'Water within reach, so you have no reason to get up.' },
      { at: 85 * SECOND, say: 'Now say the one task out loud. Out loud.' },
    ],
    after: 'Is the runway actually clear?',
  },
  {
    id: 'the_one_task',
    title: 'The One Task',
    trains: ['focus', 'discipline'],
    why: 'A vague task is the most common reason a day gets away from you — you cannot start "work on the app", only "write the first screen".',
    minutes: 2,
    difficulty: 'light',
    format: 'reflection',
    steps: [
      'Write the one task that would make today count.',
      'Now make it smaller, until it is something you could start in the next minute.',
      'That smaller thing is today’s work.',
    ],
    cues: [
      { at: 0, say: 'Write the one task that would make today count.' },
      { at: 45 * SECOND, say: 'Too big. Make it smaller — what is the first move?' },
      { at: 90 * SECOND, say: 'If you could not start it in the next minute, cut it down again.' },
    ],
    after: 'Is it small enough to start right now?',
  },
  {
    id: 'focus_reset_5',
    title: '5-Minute Focus Reset',
    trains: ['focus', 'discipline'],
    why: 'Starting is the hard part, and five minutes is short enough that the part of you that argues does not bother.',
    minutes: 5,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Phone face down and out of reach.',
      'Write the one task that matters most.',
      'Work only on that until the timer ends.',
      'When it ends, decide whether to keep going.',
    ],
    cues: [
      { at: 0, say: 'Put everything else away.' },
      { at: 30 * SECOND, say: 'Write the task. One line.' },
      { at: 60 * SECOND, say: 'Start. Only that.' },
      { at: 3 * MINUTE, say: 'Still on it. Do not check anything.' },
      { at: 4 * MINUTE + 30 * SECOND, say: 'You are already moving. Keep going?' },
    ],
    after: 'Did you keep going after the timer?',
  },
  {
    id: 'two_minute_start',
    title: 'The Two-Minute Start',
    trains: ['discipline'],
    why: 'You are not avoiding the task, you are avoiding starting it — and two minutes removes the excuse without asking you to feel differently.',
    minutes: 2,
    difficulty: 'light',
    format: 'timed',
    steps: [
      'Pick the thing you have been putting off.',
      'Do it badly for two minutes.',
      'You are allowed to stop when the timer ends.',
    ],
    cues: [
      { at: 0, say: 'Open the thing you have been avoiding. Just open it.' },
      { at: 20 * SECOND, say: 'Do it badly. Badly is the point.' },
      { at: 90 * SECOND, say: 'Thirty seconds. You can stop at the end — or not.' },
    ],
    after: 'Did you carry on past two minutes?',
  },
  {
    id: 'sprint_20',
    title: '20-Minute Sprint',
    trains: ['focus', 'consistency'],
    why: 'A fixed block with an end you can see beats an open afternoon, because your attention is spending a known amount.',
    minutes: 20,
    difficulty: 'moderate',
    format: 'timed',
    steps: [
      'One task. Written down before you start.',
      'Phone in another room.',
      'No tabs, no messages, no "quick checks" for twenty minutes.',
      'Stop when it ends, even mid-sentence.',
    ],
    cues: [
      { at: 0, say: 'Twenty minutes. One task. Go.' },
      { at: 5 * MINUTE, say: 'Five in. If you drifted, come back now — that is the exercise.' },
      { at: 10 * MINUTE, say: 'Halfway. Do not reward yourself with your phone.' },
      { at: 15 * MINUTE, say: 'Five left. Push into the part you were avoiding.' },
      { at: 19 * MINUTE, say: 'One minute. Finish the thought.' },
    ],
    after: 'Did you stay on the one task the whole time?',
  },
  {
    id: 'phone_in_another_room',
    title: 'Phone in Another Room',
    trains: ['self_control', 'focus'],
    why: 'Willpower loses to proximity; distance wins without needing any willpower at all.',
    minutes: 30,
    difficulty: 'moderate',
    format: 'timed',
    steps: [
      'Put your phone in a different room. Not a drawer — a room.',
      'Come back and work for thirty minutes.',
      'Notice every urge to go and get it. Do not go and get it.',
    ],
    cues: [
      { at: 0, say: 'Phone in another room. Walk it there now.' },
      { at: 60 * SECOND, say: 'Back at your desk. Start.' },
      { at: 10 * MINUTE, say: 'The urge to check is not information. Let it pass.' },
      { at: 20 * MINUTE, say: 'Ten left. You have not needed it once.' },
      { at: 29 * MINUTE, say: 'Nearly there. Finish first, then go and get it.' },
    ],
    after: 'Did the phone stay in the other room?',
  },
  {
    id: 'hardest_thing_first',
    title: 'The Hardest Thing First',
    trains: ['courage', 'discipline'],
    why: 'The task you dread costs more sitting undone all day than it does being done in forty minutes.',
    minutes: 40,
    difficulty: 'hard',
    format: 'timed',
    steps: [
      'Name the thing you least want to do today.',
      'Do that one, before anything easier.',
      'Forty minutes. No warm-up tasks first.',
    ],
    cues: [
      { at: 0, say: 'The one you least want to do. That one. Open it.' },
      { at: 60 * SECOND, say: 'No warm-up tasks. Straight into the hard part.' },
      { at: 15 * MINUTE, say: 'This is the part where you would usually switch. Do not switch.' },
      { at: 30 * MINUTE, say: 'Ten left. It is already smaller than it was this morning.' },
      { at: 39 * MINUTE, say: 'One minute. Leave yourself a note on where to pick up.' },
    ],
    after: 'Did you do the hardest thing, or a smaller one?',
  },
  {
    id: 'distraction_debrief',
    title: 'What Tried to Distract You',
    trains: ['focus', 'perspective'],
    why: 'Distraction has a pattern — the same two or three things, at the same time of day — and you cannot plan around what you have never named.',
    minutes: 3,
    difficulty: 'light',
    format: 'reflection',
    steps: [
      'What pulled you away today? Name it specifically.',
      'What time did it happen?',
      'What would have to be true tomorrow for it not to work on you?',
    ],
    cues: [
      { at: 0, say: 'What pulled you away today? Be specific — not "my phone".' },
      { at: 60 * SECOND, say: 'What time of day was it?' },
      { at: 120 * SECOND, say: 'What would stop it working on you tomorrow?' },
    ],
    after: 'Do you know what to change tomorrow?',
  },
]

/** Era key → its own exercises. Everything else falls back to shared. */
export const ERA_TOOLKITS: Record<string, Exercise[]> = {
  locked_in: LOCKED_IN_EXERCISES,
}

export const ALL_EXERCISES: Exercise[] = [
  ...SHARED_EXERCISES,
  ...Object.values(ERA_TOOLKITS).flat(),
]

export const EXERCISES_BY_ID = new Map(ALL_EXERCISES.map(e => [e.id, e]))

export function exerciseById(id: string | null | undefined): Exercise | null {
  return id ? EXERCISES_BY_ID.get(id) ?? null : null
}

/** Total seconds an exercise runs for. */
export function exerciseSeconds(e: Exercise): number {
  return e.minutes * MINUTE
}
