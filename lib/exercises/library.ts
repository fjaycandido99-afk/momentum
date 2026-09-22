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

/**
 * REGULATION — for the moments when the era is not the point.
 *
 * Voxu's whole job is usually to get someone to do the harder thing. These
 * four are the exception: they are for when a person cannot, and telling
 * them to push would be the wrong instruction and the wrong app. They are
 * reached from Nervous-System mode (lib/reset), not from the daily rotation,
 * so nobody is handed a calming exercise on a day they came to work.
 *
 * Nothing here is therapy and none of it claims to treat anything. They are
 * four things to do with your body and your attention for a few minutes,
 * which is what Voxu can honestly offer.
 */
export const REGULATION_EXERCISES: Exercise[] = [
  {
    id: 'regulate_grounding',
    title: 'Five Things',
    trains: ['emotional_control'],
    why: 'Naming what is actually in the room interrupts the part of your mind that is somewhere else, because you cannot look for five real things and catastrophise at the same time.',
    minutes: 3,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Look around. Name five things you can see.',
      'Four things you can feel — the chair, your feet, the air.',
      'Three things you can hear.',
      'Two things you can smell, one you can taste.',
      'Slowly. There is no score.',
    ],
    cues: [
      { at: 0, say: 'Look around the room. Five things you can see — name them.' },
      { at: 40 * SECOND, say: 'Four things you can feel. The chair. Your feet on the floor.' },
      { at: 80 * SECOND, say: 'Three things you can hear. Including the quiet ones.' },
      { at: 120 * SECOND, say: 'Two you can smell. One you can taste.' },
      { at: 160 * SECOND, say: 'You are here, in this room. That is the whole exercise.' },
    ],
    after: 'Are you more here than you were?',
  },
  {
    id: 'regulate_exhale',
    title: 'Longer Exhale',
    trains: ['emotional_control'],
    why: 'You cannot decide to calm down, but you can breathe out for longer than you breathe in — and your heart rate follows the exhale whether you believe it or not.',
    minutes: 4,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Sit or lie down. Let your shoulders drop.',
      'In through the nose for four.',
      'Out through the mouth for eight.',
      'Keep going. Nothing to fix, nothing to decide.',
    ],
    cues: [
      { at: 0, say: 'Shoulders down. In through your nose for four.' },
      { at: 15 * SECOND, say: 'Out for eight. Twice as long as the in-breath.' },
      { at: 60 * SECOND, say: 'Keep the exhale long. Let the in-breath take care of itself.' },
      { at: 2 * MINUTE, say: 'Nothing to fix while you are in here.' },
      { at: 3 * MINUTE, say: 'Last minute. Slower, if you can.' },
    ],
    after: 'Did your body settle at all?',
  },
  {
    id: 'regulate_one_thing',
    title: 'One Thing, Small',
    trains: ['focus'],
    why: 'Not being able to focus is usually too many open things, not a broken brain — and the way out is one item small enough to finish, not a plan.',
    minutes: 4,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Write down everything buzzing. All of it, fast.',
      'Circle the one that matters today.',
      'Cut it down until it takes ten minutes.',
      'Do that, and nothing else, until the timer ends.',
    ],
    cues: [
      { at: 0, say: 'Write down everything in your head. Fast, no order.' },
      { at: 60 * SECOND, say: 'Now circle the one that actually matters today.' },
      { at: 100 * SECOND, say: 'Cut it down. Ten minutes, not two hours.' },
      { at: 140 * SECOND, say: 'Start it. Only that, until the timer ends.' },
      { at: 3 * MINUTE + 30 * SECOND, say: 'You are working. That was the hard part.' },
    ],
    after: 'Do you know what you are doing next?',
  },
  {
    id: 'regulate_put_day_down',
    title: 'Put the Day Down',
    trains: ['detachment'],
    why: 'A mind that will not sleep is usually still holding tomorrow; writing the open things down is how you stop rehearsing them at 1am.',
    minutes: 6,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Phone down, screen away.',
      'Write the things still open. They keep until morning.',
      'One thing that went right today.',
      'Then breathe out, longer than you breathe in, until the timer ends.',
    ],
    cues: [
      { at: 0, say: 'Phone face down, out of reach. The day is over.' },
      { at: 30 * SECOND, say: 'Write what is still open. It keeps until morning — that is why you are writing it.' },
      { at: 2 * MINUTE, say: 'Now one thing that went right today. One is enough.' },
      { at: 3 * MINUTE, say: 'Put the pen down. Out-breath longer than the in-breath.' },
      { at: 5 * MINUTE, say: 'Nothing else is required of you tonight.' },
    ],
    after: 'Is your head quieter than it was?',
  },
]

/** Era key → its own exercises. Everything else falls back to shared. */
/**
 * Discipline Era — doing it when the feeling never arrives.
 *
 * The three here answer the three reasons people don't: the bar is too
 * high, starting is too hard, and the urge to skip feels like information.
 */
export const DISCIPLINE_EXERCISES: Exercise[] = [
  {
    id: 'discipline_do_it_badly',
    title: 'Do It Badly',
    trains: ['discipline', 'consistency'],
    why: 'Most missed days are not laziness, they are a standard you set on a good day and cannot meet on a bad one.',
    minutes: 2,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Name the thing you are meant to do today.',
      'Now name the worst version of it you would still count.',
      'Do that version. Start now, while the timer runs.',
    ],
    cues: [
      { at: 0, say: 'Name the thing you are meant to do today. Out loud.' },
      { at: 30 * SECOND, say: 'Now the worst version you would still count. Smaller than that.' },
      { at: 70 * SECOND, say: 'Start it. Badly is the point — badly still counts.' },
    ],
    after: 'Did the bad version happen?',
  },
  {
    id: 'discipline_friction_hunt',
    title: 'Find the Friction',
    trains: ['discipline', 'consistency'],
    why: 'The thing between you and the habit is usually physical and boring — a bag not packed, a password not saved, a room you have to tidy first.',
    minutes: 4,
    difficulty: 'moderate',
    format: 'reflection',
    steps: [
      'Picture the last three times you skipped it.',
      'Find the moment it actually fell apart. Not the mood — the moment.',
      'Name one physical thing that made it harder.',
      'Remove that one thing now, before the timer ends.',
    ],
    cues: [
      { at: 0, say: 'The last three times you skipped. Picture them.' },
      { at: 45 * SECOND, say: 'Where did it actually fall apart? A time, a place, an object.' },
      { at: 110 * SECOND, say: 'Name the physical thing that made it harder.' },
      { at: 170 * SECOND, say: 'Go and remove it. Now, not later.' },
    ],
    after: 'Is that bit of friction gone?',
  },
  {
    id: 'discipline_urge_sit',
    title: 'Sit With the Urge',
    trains: ['self_control', 'discipline'],
    why: 'An urge feels like a verdict and behaves like weather — sitting still while one passes teaches you that it does.',
    minutes: 5,
    difficulty: 'hard',
    format: 'guided',
    steps: [
      'Think of the thing you want to skip, or reach for.',
      'Do not argue with it. Do not act on it.',
      'Sit still and notice where you feel it.',
      'Stay until the timer ends. That is the whole exercise.',
    ],
    cues: [
      { at: 0, say: 'Bring the urge to mind. The thing you want to skip, or reach for.' },
      { at: 45 * SECOND, say: 'Do not argue with it. You are not trying to win.' },
      { at: 2 * MINUTE, say: 'Where do you feel it? Chest, jaw, hands. Just notice.' },
      { at: 3 * MINUTE + 30 * SECOND, say: 'Still here. Still not acting on it.' },
      { at: 4 * MINUTE + 40 * SECOND, say: 'It moved while you sat there. That is the lesson.' },
    ],
    after: 'Did it pass without you acting on it?',
  },
]

/**
 * Comeback Season — rebuilding after a hard stretch.
 *
 * Nothing in here asks anyone to get back to where they were. The first
 * week back is about a floor, not a comeback montage.
 */
export const COMEBACK_EXERCISES: Exercise[] = [
  {
    id: 'comeback_smallest_rep',
    title: 'The Smallest Rep',
    trains: ['consistency', 'resilience'],
    why: 'After a break, the version of you that quit is remembered better than the version that started — so the first one back has to be too small to argue with.',
    minutes: 2,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Name the thing you used to do.',
      'Cut it to a tenth. Then cut it again.',
      'Do that, now, while the timer runs.',
    ],
    cues: [
      { at: 0, say: 'Name the thing you used to do, before the break.' },
      { at: 30 * SECOND, say: 'Cut it to a tenth of what it was. Smaller than feels worth doing.' },
      { at: 75 * SECOND, say: 'Do it now. Today is not the day you catch up.' },
    ],
    after: 'Did the small version happen?',
  },
  {
    id: 'comeback_what_changed',
    title: 'What Actually Changed',
    trains: ['perspective', 'resilience'],
    why: 'A stretch that fell apart usually has one real cause and a story on top of it, and the story is the part that keeps you stuck.',
    minutes: 5,
    difficulty: 'moderate',
    format: 'reflection',
    steps: [
      'Write when it stopped. A week, a month — near enough.',
      'Write what was happening in your life then.',
      'Now separate two things: what changed around you, and what you told yourself about it.',
      'Read the second one back.',
    ],
    cues: [
      { at: 0, say: 'When did it stop? Roughly is fine.' },
      { at: 50 * SECOND, say: 'What was happening then? Write it plainly.' },
      { at: 2 * MINUTE, say: 'Two columns. What changed around you. What you told yourself.' },
      { at: 4 * MINUTE, say: 'Read the second column back. Would you say that to someone else?' },
    ],
    after: 'Which of those two is still true?',
  },
  {
    id: 'comeback_the_floor',
    title: 'Set the Floor',
    trains: ['consistency', 'resilience'],
    why: 'A comeback dies on the first bad day, so the only number that matters is the one you can hit on the worst day of the week.',
    minutes: 6,
    difficulty: 'hard',
    format: 'reflection',
    steps: [
      'Picture the worst day of your coming week. The real one.',
      'Name what you could still do on that day. Honestly.',
      'That is your floor for the week — not your target.',
      'Write it where you will see it.',
    ],
    cues: [
      { at: 0, say: 'The worst day of your coming week. Picture it properly.' },
      { at: 60 * SECOND, say: 'Tired, late, nothing going your way. What could you still do?' },
      { at: 2 * MINUTE + 30 * SECOND, say: 'If it sounds impressive, it is too big. Cut it.' },
      { at: 4 * MINUTE, say: 'That is the floor. Not the goal — the floor.' },
      { at: 5 * MINUTE + 20 * SECOND, say: 'Write it somewhere you will see it on that day.' },
    ],
    after: 'Could you hit that on your worst day?',
  },
]

/**
 * Gym Arc — showing up for your body.
 *
 * None of these is a workout. Voxu doesn't write training, and the part
 * people actually lose isn't the session — it's the twenty minutes before
 * it, when the decision gets made.
 */
export const GYM_ARC_EXERCISES: Exercise[] = [
  {
    id: 'gym_pack_the_bag',
    title: 'Pack the Bag',
    trains: ['consistency', 'discipline'],
    why: 'The session is usually lost the night before, by a bag that was not packed and a decision left to a tired version of you.',
    minutes: 2,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Get the bag. Now, not in a minute.',
      'Shoes, clothes, bottle, headphones.',
      'Put it by the door you leave through.',
      'Say the time you are going.',
    ],
    cues: [
      { at: 0, say: 'Go and get the bag. Bring it here.' },
      { at: 25 * SECOND, say: 'Shoes, clothes, bottle. Whatever you always forget.' },
      { at: 70 * SECOND, say: 'By the door you actually leave through. Not the bedroom.' },
      { at: 100 * SECOND, say: 'Now say the time you are going. Out loud, with a number.' },
    ],
    after: 'Is the bag by the door?',
  },
  {
    id: 'gym_five_minutes_in',
    title: 'Five Minutes In',
    trains: ['discipline', 'consistency'],
    why: 'Deciding whether to train is a worse question than deciding to change and be there five minutes — the second one you can answer while tired.',
    minutes: 5,
    difficulty: 'moderate',
    format: 'timed',
    steps: [
      'Change into what you train in. That is the whole first task.',
      'Get to the place you train.',
      'Give it five minutes.',
      'At the end, decide. Leaving still counts as showing up.',
    ],
    cues: [
      { at: 0, say: 'Change first. Do not decide anything yet.' },
      { at: 60 * SECOND, say: 'Now get there. Still not deciding.' },
      { at: 3 * MINUTE, say: 'Five minutes in. Notice that you are already here.' },
      { at: 4 * MINUTE + 30 * SECOND, say: 'Now choose. If you leave, the day still counts.' },
    ],
    after: 'Did you get there?',
  },
  {
    id: 'gym_skip_autopsy',
    title: 'The Skip, Honestly',
    trains: ['consistency', 'discipline'],
    why: 'People explain a missed session with a month-long story — "I have no discipline" — when what happened was one specific moment on one specific evening.',
    minutes: 5,
    difficulty: 'hard',
    format: 'reflection',
    steps: [
      'Think of the last session you skipped.',
      'Find the exact moment you knew you would not go.',
      'Write what you were doing, where you were, what time it was.',
      'Name one thing that would have interrupted that moment.',
    ],
    cues: [
      { at: 0, say: 'The last session you skipped. Not all of them — that one.' },
      { at: 50 * SECOND, say: 'Find the moment you knew. It was earlier than you think.' },
      { at: 2 * MINUTE, say: 'Where were you? What time? What was in your hand?' },
      { at: 3 * MINUTE + 30 * SECOND, say: 'One thing that would have interrupted it. One.' },
    ],
    after: 'Do you know when it actually went wrong?',
  },
]

/**
 * Stoic Mode — control what you can.
 *
 * Plain versions of old exercises. No Latin, no quotes standing in for
 * instructions, and nothing that tells anyone their feelings are wrong.
 */
export const STOIC_EXERCISES: Exercise[] = [
  {
    id: 'stoic_control_split',
    title: 'Two Columns',
    trains: ['detachment', 'perspective'],
    why: 'Most of a bad day is spent on things you were never able to move, and you cannot tell which is which until they are written in separate columns.',
    minutes: 3,
    difficulty: 'light',
    format: 'reflection',
    steps: [
      'Write what is bothering you today. All of it, quickly.',
      'Draw a line. On the left, what you can actually act on.',
      'On the right, what you cannot.',
      'Pick one thing from the left.',
    ],
    cues: [
      { at: 0, say: 'What is bothering you today? Write it fast, no editing.' },
      { at: 50 * SECOND, say: 'Now split it. Left, what you can act on. Right, what you cannot.' },
      { at: 2 * MINUTE, say: 'Be strict. Other people go on the right.' },
      { at: 2 * MINUTE + 35 * SECOND, say: 'Pick one thing from the left. That is your day.' },
    ],
    after: 'Which column was longer?',
  },
  {
    id: 'stoic_pause_drill',
    title: 'The Pause',
    trains: ['emotional_control', 'detachment'],
    why: 'The gap between something happening and you answering it is a skill, and it is trainable in a quiet room before you need it in a loud one.',
    minutes: 4,
    difficulty: 'moderate',
    format: 'guided',
    steps: [
      'Bring to mind something that got a reaction out of you today.',
      'Let it be annoying. Do not talk yourself out of it.',
      'Now find the thing you nearly said.',
      'Then find the thing you would rather have said.',
    ],
    cues: [
      { at: 0, say: 'Something that got a reaction out of you today. Bring it back.' },
      { at: 40 * SECOND, say: 'Let it be annoying. You are not pretending it was fine.' },
      { at: 100 * SECOND, say: 'What did you nearly say? Say it in your head, exactly.' },
      { at: 170 * SECOND, say: 'Now the version you would rather have said. That one is available next time.' },
    ],
    after: 'Was there a gap between the two?',
  },
  {
    id: 'stoic_real_size',
    title: 'Its Real Size',
    trains: ['perspective', 'detachment'],
    why: 'A thing that fills today is often a thing you will struggle to remember in a month, and checking which one it is takes about five minutes.',
    minutes: 5,
    difficulty: 'hard',
    format: 'reflection',
    steps: [
      'Write the thing that is taking up the most room right now.',
      'Write what it will mean in a week.',
      'In a year.',
      'Then write what it costs you today, at its real size.',
    ],
    cues: [
      { at: 0, say: 'The thing taking up the most room right now. Write it.' },
      { at: 50 * SECOND, say: 'A week from now. What is left of it?' },
      { at: 2 * MINUTE, say: 'A year. Be honest — some things do last a year.' },
      { at: 3 * MINUTE + 20 * SECOND, say: 'Now its real size. Not smaller than it is, not larger.' },
    ],
    after: 'Is it the size you were treating it as?',
  },
]

/**
 * Confidence Mode — speaking up.
 *
 * Rehearsal, not affirmation. Nothing in here asks anyone to tell
 * themselves something they don't believe.
 */
export const CONFIDENCE_EXERCISES: Exercise[] = [
  {
    id: 'confidence_say_it_once',
    title: 'Say It Out Loud',
    trains: ['courage', 'confidence'],
    why: 'A sentence you have only ever thought sounds enormous, and a sentence you have said out loud once sounds like a sentence.',
    minutes: 2,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Find the thing you have been not-saying.',
      'Say it out loud, alone, exactly as you would say it.',
      'Say it twice more.',
      'Notice it getting smaller.',
    ],
    cues: [
      { at: 0, say: 'The thing you have been not-saying. Get it into one sentence.' },
      { at: 35 * SECOND, say: 'Now say it out loud. Properly, not muttered.' },
      { at: 70 * SECOND, say: 'Again. Same words.' },
      { at: 95 * SECOND, say: 'Once more. It is just a sentence.' },
    ],
    after: 'Did it get smaller?',
  },
  {
    id: 'confidence_strip_the_hedges',
    title: 'Strip the Hedges',
    trains: ['confidence', 'self_belief'],
    why: 'Most people ask for what they want wrapped in so much apology that the ask disappears, and the wrapping is easy to see once it is written down.',
    minutes: 4,
    difficulty: 'moderate',
    format: 'reflection',
    steps: [
      'Write the ask, the way you would normally say it.',
      'Cross out every "just", "sorry", "maybe" and "if that is okay".',
      'Read what is left.',
      'That is the version you send.',
    ],
    cues: [
      { at: 0, say: 'Write the ask. Exactly how you would normally say it.' },
      { at: 60 * SECOND, say: 'Now cross out every just, sorry, maybe, if that is okay.' },
      { at: 2 * MINUTE, say: 'Anything softening it. Take it out.' },
      { at: 3 * MINUTE, say: 'Read what is left. Shorter, and it still asks.' },
    ],
    after: 'Is the ask still in there?',
  },
  {
    id: 'confidence_decide_on_it',
    title: 'Decide On It',
    trains: ['courage', 'self_belief'],
    why: 'A message you have drafted and not sent takes up room every day it sits there, and either answer — send it or delete it — costs less than leaving it open.',
    minutes: 5,
    difficulty: 'hard',
    format: 'guided',
    steps: [
      'Open the thing you drafted and never sent.',
      'Read it once, as the person receiving it.',
      'Decide: send it, or delete it.',
      'Deleting is a real answer. Leaving it there is not.',
    ],
    cues: [
      { at: 0, say: 'Open the draft. The one you already know about.' },
      { at: 45 * SECOND, say: 'Read it once as the person receiving it.' },
      { at: 2 * MINUTE, say: 'If it would do harm, delete it. That is not cowardice, that is judgement.' },
      { at: 3 * MINUTE + 20 * SECOND, say: 'Otherwise send it. Now, while you are here.' },
      { at: 4 * MINUTE + 30 * SECOND, say: 'Either way, it stops living in your drafts today.' },
    ],
    after: 'Is it decided?',
  },
]

/**
 * Study Era — deep work, and finding out what you actually know.
 */
export const STUDY_EXERCISES: Exercise[] = [
  {
    id: 'study_clear_the_desk',
    title: 'One Subject Out',
    trains: ['focus', 'discipline'],
    why: 'A desk with four subjects on it is a desk that invites you to switch, and switching feels like working.',
    minutes: 2,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Everything off the desk. Everything.',
      'Put back only what one subject needs.',
      'Phone in another room.',
      'Say what you are studying, out loud.',
    ],
    cues: [
      { at: 0, say: 'Clear the desk. All of it, including the other subjects.' },
      { at: 35 * SECOND, say: 'Now put back only what this one subject needs.' },
      { at: 75 * SECOND, say: 'Phone in another room. Not face down — another room.' },
      { at: 100 * SECOND, say: 'Say what you are studying. Out loud, specifically.' },
    ],
    after: 'Is there one subject on the desk?',
  },
  {
    id: 'study_recall_dump',
    title: 'Close the Book',
    trains: ['focus', 'patience'],
    why: 'Re-reading feels like studying because it feels easy, and writing down what you remember without looking is how you find the gaps instead of hiding them.',
    minutes: 5,
    difficulty: 'moderate',
    format: 'guided',
    steps: [
      'Close the book and the notes. All of it.',
      'Write everything you remember about one topic.',
      'Keep going when it gets hard — that part is the exercise.',
      'Then open the notes and mark what you missed.',
    ],
    cues: [
      { at: 0, say: 'Close everything. Book, notes, tabs.' },
      { at: 20 * SECOND, say: 'Now write what you remember about one topic. From memory only.' },
      { at: 2 * MINUTE, say: 'Hard now. Stay with it — the blank bits are the useful information.' },
      { at: 3 * MINUTE + 40 * SECOND, say: 'Last stretch. Anything else you can drag up.' },
      { at: 4 * MINUTE + 30 * SECOND, say: 'Now open the notes. Mark what you missed, no marking yourself.' },
    ],
    after: 'Do you know what you do not know?',
  },
  {
    id: 'study_worst_topic_first',
    title: 'The Worst Topic',
    trains: ['discipline', 'patience'],
    why: 'The topic you understand least is the one you keep leaving, which is why it is still the one you understand least.',
    minutes: 6,
    difficulty: 'hard',
    format: 'guided',
    steps: [
      'Name the topic you understand least.',
      'Open it. Just open it.',
      'Work on it until the timer ends.',
      'You do not have to finish it, or enjoy it.',
    ],
    cues: [
      { at: 0, say: 'The topic you understand least. Name it.' },
      { at: 30 * SECOND, say: 'Open it. That is the hard part and it is nearly done.' },
      { at: 2 * MINUTE, say: 'Confused is correct. Confused is what learning feels like.' },
      { at: 4 * MINUTE, say: 'Still on it. Do not switch to the easy topic.' },
      { at: 5 * MINUTE + 20 * SECOND, say: 'Nearly there. Note where you got stuck before you close it.' },
    ],
    after: 'Did you stay on the hard one?',
  },
]

/**
 * 5AM Era — owning the morning.
 *
 * The morning is won the night before, which is why two of these three
 * happen in the evening.
 */
export const FIVE_AM_EXERCISES: Exercise[] = [
  {
    id: 'five_am_night_before',
    title: 'Set Up the Morning',
    trains: ['discipline', 'consistency'],
    why: 'At 5am you have no judgement and no patience, so every decision has to already be made — including where the alarm is standing.',
    minutes: 3,
    difficulty: 'light',
    format: 'guided',
    steps: [
      'Put the alarm across the room, out of reach of the bed.',
      'Put tomorrow’s clothes where you will trip over them.',
      'Fill a glass of water and leave it there.',
      'Decide the first thing you will do. One thing.',
    ],
    cues: [
      { at: 0, say: 'Alarm across the room. Somewhere you have to stand up to reach.' },
      { at: 45 * SECOND, say: 'Clothes out. Where you cannot miss them.' },
      { at: 105 * SECOND, say: 'Water poured and left out.' },
      { at: 150 * SECOND, say: 'Now decide the first thing you do. Say it out loud.' },
    ],
    after: 'Is the morning already decided?',
  },
  {
    id: 'five_am_first_sixty',
    title: 'The First Sixty Seconds',
    trains: ['discipline', 'self_control'],
    why: 'Nobody loses the morning at 5am, they lose it at 5.01 with a phone in their hand — the first minute is the only one you have to win.',
    minutes: 2,
    difficulty: 'moderate',
    format: 'guided',
    steps: [
      'Feet on the floor. Both of them.',
      'Stand up. Do not sit back down.',
      'Water first, phone not at all.',
      'Say what you are doing next.',
    ],
    cues: [
      { at: 0, say: 'Feet on the floor. Both feet, now.' },
      { at: 20 * SECOND, say: 'Stand up. All the way up.' },
      { at: 50 * SECOND, say: 'Water. The phone can wait and you know it.' },
      { at: 85 * SECOND, say: 'Say what you are doing next. Then go and do it.' },
    ],
    after: 'Are you up and off the phone?',
  },
  {
    id: 'five_am_thirty_dark',
    title: 'The First Half Hour',
    trains: ['self_control', 'discipline'],
    why: 'The first thirty minutes set what your attention does all day, and handing them to a feed is the cheapest way to lose them.',
    minutes: 5,
    difficulty: 'hard',
    format: 'timed',
    steps: [
      'Phone stays in another room. Start it now.',
      'Use these five minutes for the first thing you decided last night.',
      'Then keep going for twenty-five more, alone with it.',
      'No feed, no messages, no news until it is done.',
    ],
    cues: [
      { at: 0, say: 'Phone in another room. Go and put it there.' },
      { at: 40 * SECOND, say: 'Now start the first thing. The one you decided last night.' },
      { at: 2 * MINUTE + 30 * SECOND, say: 'Quiet is not empty. This is what the morning is for.' },
      { at: 4 * MINUTE, say: 'When this ends, keep going. Twenty-five more, same conditions.' },
    ],
    after: 'Did the phone stay away?',
  },
]

export const ERA_TOOLKITS: Record<string, Exercise[]> = {
  locked_in: LOCKED_IN_EXERCISES,
  discipline: DISCIPLINE_EXERCISES,
  comeback: COMEBACK_EXERCISES,
  gym_arc: GYM_ARC_EXERCISES,
  stoic_mode: STOIC_EXERCISES,
  confidence: CONFIDENCE_EXERCISES,
  study: STUDY_EXERCISES,
  five_am: FIVE_AM_EXERCISES,
}

/**
 * Everything the app can look up by id — including the regulation sessions,
 * which are deliberately NOT in `poolFor` (see select.ts): they are reachable
 * from Nervous-System mode, and nobody should be handed a calming exercise
 * as their practice on a day they came to work.
 */
export const ALL_EXERCISES: Exercise[] = [
  ...SHARED_EXERCISES,
  ...Object.values(ERA_TOOLKITS).flat(),
  ...REGULATION_EXERCISES,
]

export const EXERCISES_BY_ID = new Map(ALL_EXERCISES.map(e => [e.id, e]))

export function exerciseById(id: string | null | undefined): Exercise | null {
  return id ? EXERCISES_BY_ID.get(id) ?? null : null
}

/** Total seconds an exercise runs for. */
export function exerciseSeconds(e: Exercise): number {
  return e.minutes * MINUTE
}
