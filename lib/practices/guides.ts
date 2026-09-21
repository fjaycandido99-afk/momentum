import type { PracticeDomain } from './presets'

/**
 * How to actually do the thing — per domain.
 *
 * A schedule and a floor tell someone WHEN and HOW MUCH. This is the part
 * that decides whether the session happens at all: what to set up, what to
 * do with your breathing, what to do when your attention goes.
 *
 * The line I'm holding: Voxu teaches the practice of showing up, not the
 * technique of the sport. So there is nothing here about squat depth, bar
 * path, sets, reps, weights, heart-rate zones or pace targets — it doesn't
 * know anyone's body, and getting that wrong hurts people. What it does know
 * is the part everyone skips: preparation, the first two minutes, breathing,
 * and what to do when you want to stop.
 *
 * Every line is a thing to DO, in the second person, short enough to read on
 * the way out of the door.
 */

export interface PracticeGuide {
  /** What this guide is for, in the person's own terms. */
  title: string
  /** Why these steps, in one sentence. */
  why: string
  steps: { label: string; detail: string }[]
  /** The single thing that matters most, repeated at the end. */
  keystone: string
}

export const PRACTICE_GUIDES: Record<PracticeDomain, PracticeGuide> = {
  gym: {
    title: 'How to make the session happen',
    why: 'Most missed sessions are lost before you get there, not in the gym.',
    steps: [
      { label: 'Pack the night before', detail: 'Bag by the door, bottle filled. Decide nothing in the morning.' },
      { label: 'Know today’s list before you arrive', detail: 'Your plan for this day is on the card. Don’t design a workout while standing in the gym.' },
      { label: 'Warm up for five minutes', detail: 'Easy movement first, then one light set of the first exercise. The warm-up is not the session.' },
      // No rest interval here on purpose: how long to rest is a training
      // parameter, and Voxu doesn't know your programme.
      { label: 'Phone in your bag between sets', detail: 'Not in your hand. Rest is rest — a scroll turns two minutes into ten.' },
      { label: 'Finish, don’t max out', detail: 'Leave one in the tank. Sessions you can repeat tomorrow beat sessions you brag about.' },
    ],
    keystone: 'If you only do the minimum you set, it still counts. Walking in is the hard part.',
  },
  run: {
    title: 'How to run it',
    why: 'Almost everyone starts too fast and breathes too shallow, then decides they hate running.',
    steps: [
      { label: 'Shoes and water by the door', detail: 'Leave them out the night before. Friction is what stops the run, not fitness.' },
      { label: 'Walk the first two minutes', detail: 'Then jog easy. The first mile is meant to feel slower than you want.' },
      { label: 'Breathe through your nose in, mouth out', detail: 'Long out-breaths. If you can’t say a short sentence, you’re running too fast — slow down, don’t stop.' },
      { label: 'Let your shoulders drop', detail: 'Hands loose, arms swinging from the shoulder. Tension in your fists ends up in your neck.' },
      { label: 'Finish by walking', detail: 'Two or three minutes. It’s part of the run, not an afterthought.' },
    ],
    keystone: 'Slower and finished beats faster and abandoned. The point is the next run.',
  },
  read: {
    title: 'How to actually read',
    why: 'Reading fails on environment and re-entry, not on willpower.',
    steps: [
      { label: 'Phone in another room', detail: 'Not face down beside you. In another room, so reaching for it is a decision.' },
      { label: 'Leave the book open at your page', detail: 'Or a bookmark where you stopped. Restarting should take zero seconds.' },
      { label: 'One lamp, one seat', detail: 'Same chair each time if you can. Your attention learns the place.' },
      { label: 'Read the last page you read', detail: 'It gets you back in mid-thought instead of cold.' },
      { label: 'When you drift, read aloud', detail: 'Half a page out loud pulls attention back faster than starting over.' },
    ],
    keystone: 'Ten pages you remember beats fifty you skimmed. Stop at a good place, not at a page number.',
  },
  study: {
    title: 'How to study so it sticks',
    why: 'Re-reading feels like studying and mostly isn’t. Saying it back is.',
    steps: [
      { label: 'Decide the one thing before you sit', detail: 'A chapter, a problem set, a paper. "Study" is not a task.' },
      { label: 'Phone away, tabs closed', detail: 'One document, one book. Everything else is for afterwards.' },
      { label: 'Work in one block, then stop', detail: '25 to 45 minutes. When it ends, stand up — even if it’s going well.' },
      { label: 'Close the book and say it back', detail: 'Out loud, from memory. What you can’t say is what you don’t know yet.' },
      { label: 'Write down where you stopped', detail: 'One line. Tomorrow starts at that line instead of at the beginning.' },
    ],
    keystone: 'Recall, not review. If you never close the book, you never find out what you know.',
  },
  work: {
    title: 'How to get the block done',
    why: 'Deep work dies on an undefined task and an open browser.',
    steps: [
      { label: 'Write the output, not the topic', detail: '"Draft the pricing section", not "work on the site".' },
      { label: 'Clear the desk and the tabs', detail: 'One window. Notifications off, not minimised.' },
      { label: 'Start badly on purpose', detail: 'First two minutes are allowed to be rubbish. That’s how the block opens.' },
      { label: 'Stay in when you want out', detail: 'The urge to switch usually arrives right before the useful part.' },
      { label: 'Stop mid-sentence', detail: 'Leave yourself an obvious next move. Tomorrow’s start is today’s job.' },
    ],
    keystone: 'One defined output, one window, one block. That’s the whole method.',
  },
  mind: {
    title: 'How to sit with it',
    why: 'Nobody’s mind stays still. Noticing that it wandered IS the practice.',
    steps: [
      { label: 'Sit upright, feet on the floor', detail: 'Chair is fine. You’re not trying to be comfortable enough to fall asleep.' },
      { label: 'Breathe out longer than you breathe in', detail: 'In for four, out for six or eight. The exhale is the lever.' },
      { label: 'Let the thoughts arrive', detail: 'You’re not clearing your head. You’re noticing when it’s gone and coming back.' },
      { label: 'Come back without commentary', detail: 'No "I’m bad at this". Notice, return, continue.' },
      { label: 'End on purpose', detail: 'One deeper breath, then stand up. Don’t drift out of it into your phone.' },
    ],
    keystone: 'Coming back a hundred times is a hundred repetitions, not a hundred failures.',
  },
  custom: {
    title: 'How to keep it',
    why: 'Whatever the thing is, the same four things decide whether it happens.',
    steps: [
      { label: 'Set it up the night before', detail: 'Whatever you need, where you’ll need it.' },
      { label: 'Make starting take ten seconds', detail: 'Whatever stands between you and the first minute, remove it now.' },
      { label: 'Know your minimum', detail: 'On a bad day you do that, and it still counts.' },
      { label: 'Stop while it’s still going well', detail: 'Ending strong is what makes you come back.' },
    ],
    keystone: 'Consistency is an environment problem more often than a discipline problem.',
  },
}

export function guideForDomain(domain: string | undefined): PracticeGuide {
  return PRACTICE_GUIDES[(domain ?? 'custom') as PracticeDomain] ?? PRACTICE_GUIDES.custom
}

/**
 * What Voxu will not teach, said out loud in the UI.
 *
 * Better to name the limit than to let someone assume the app vetted their
 * squat form.
 */
export const GUIDE_LIMIT_NOTE =
  'Voxu coaches the part where you show up — not technique. For form, weights, pace or anything medical, ask someone qualified who can see you.'
