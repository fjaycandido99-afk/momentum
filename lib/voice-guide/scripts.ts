import type { Lesson } from '@/lib/psychology/lessons'

/**
 * What Voxu says when asked to "explain this" — one script per screen,
 * built ONLY from what that screen is showing. Pure.
 *
 * Why scripts and not a model: a number said out loud that doesn't match the
 * screen is worse than a wrong number in text, and a model will eventually
 * say one. Every figure here is passed in from the same data the screen
 * renders.
 *
 * Cost shape: /api/ai/chat-voice caches each LINE by its text, shared by
 * every user. So scripts are split into short lines, most of them the same
 * for everyone (paid for once, ever); personal numbers are kept to as few
 * lines as possible, since each new one spends a voice line from the user's
 * day. When voice is unavailable the same lines run as captions.
 *
 * `spot` names the element (data-voxu-spot) that lights up while the line
 * is spoken.
 */

export interface GuideLine {
  text: string
  spot?: string
}

export type GuideScreen = 'era' | 'laws' | 'psychology' | 'lesson' | 'today' | 'proof' | 'profile'

/** The first-visit offer — asked, never spoken unprompted. */
export const FIRST_VISIT_ASK: Record<GuideScreen, string> = {
  era: 'Want me to walk you through your era?',
  laws: 'This page fills in as you go. Want me to explain how?',
  psychology: 'Want the short version of what these are?',
  lesson: 'Want me to read you the quick version?',
  today: "I'm Voxu. Want a quick tour of Today?",
  proof: 'Want me to walk you through your proof?',
  profile: 'Want a quick tour of your profile?',
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many)

export interface EraFacts {
  title: string
  day: number
  lengthDays: number
  kept: number
  answered: number
  hasMission: boolean
}

export function eraScript(e: EraFacts): GuideLine[] {
  const lines: GuideLine[] = [
    { spot: 'era-day', text: `This is your era, ${e.title}. You're on day ${e.day} of ${e.lengthDays}.` },
    e.answered > 0
      ? { spot: 'era-stats', text: `So far you've kept ${e.kept} of the ${e.answered} ${plural(e.answered, 'promise')} you've checked in on.` }
      : { spot: 'era-stats', text: 'You haven\'t checked in on a promise yet. That part happens in the evening.' },
    { spot: 'era-grid', text: 'Each square is a day. Filled means you kept that day\'s promise, crossed means you didn\'t, and a ring means you made one but never checked in.' },
  ]
  if (e.hasMission) {
    lines.push({ spot: 'era-mission', text: 'Today\'s mission is something to go and do in the world. It sits alongside your promise, not instead of it.' })
  }
  lines.push(
    { spot: 'era-day1', text: 'And this is what you told me on day one. It stays here so you can come back to why you started, whenever you need it.' },
    { text: 'Make one promise a day, check in at night, and I\'ll learn what helps you keep them.' },
  )
  return lines
}

export interface TodayFacts {
  era: { title: string; day: number; lengthDays: number } | null
  /** Pulse has a "Right now" card showing. */
  rightNow: boolean
  /** The Today list's own counts. */
  done: number
  total: number
}

/** Today — built when tapped, from the live era and Pulse. */
export function todayScript(f: TodayFacts): GuideLine[] {
  const lines: GuideLine[] = [
    f.era
      ? { spot: 'today-era', text: `This is Today. You're on day ${f.era.day} of ${f.era.lengthDays} of ${f.era.title}.` }
      : { text: 'This is Today, your day in one place.' },
  ]
  if (f.rightNow) {
    lines.push({ spot: 'today-rightnow', text: "Right now is the one thing that matters most next. Tap it and you're straight there." })
  }
  if (f.total > 0) {
    lines.push({ spot: 'today-list', text: `Below that is today's list: ${f.done} of ${f.total} done so far.` })
  }
  lines.push({ text: 'Tap me any time to ask something, find something, or say where you want to go.' })
  return lines
}

export interface LawsFacts {
  /** Laws that passed the chance test. */
  laws: number
  /** Answered promises still needed before any comparison runs. */
  needed: number
  hasCharts: boolean
  active: { title: string; day: number } | null
}

export function lawsScript(f: LawsFacts): GuideLine[] {
  const lines: GuideLine[] = [
    { spot: 'laws-title', text: 'This is where I turn what you do into patterns. A pattern only becomes a law once your own record shows it clearly enough that chance can\'t explain it.' },
  ]
  if (f.laws > 0) {
    lines.push({ spot: 'laws-list', text: `You have ${f.laws} ${plural(f.laws, 'law')}. Each one shows both sides with the counts, so you can check it yourself.` })
  } else if (f.needed > 0) {
    lines.push({ spot: 'laws-empty', text: `No laws yet. I need ${f.needed} more answered ${plural(f.needed, 'promise')} before I can compare anything. I won't guess before then.` })
  } else {
    lines.push({ spot: 'laws-empty', text: 'There\'s enough to compare now, but nothing has passed the test yet. When something does, you\'ll see the evidence here.' })
  }
  if (f.hasCharts) {
    lines.push({ spot: 'laws-rhythm', text: 'Your rhythm shows when you make your promises, and which days you keep them. The lit part of each bar is what you kept.' })
  }
  lines.push(f.active
    ? { spot: 'laws-experiments', text: `You're running ${f.active.title}, day ${f.active.day} of 7. When it ends, I'll compare it with your own last four weeks.` }
    : { spot: 'laws-experiments', text: 'These experiments change one thing for seven days, then compare it with your own last four weeks. Try one when you\'re ready.' })
  return lines
}

export function psychologyScript(f: { forYou: number }): GuideLine[] {
  const lines: GuideLine[] = [
    { spot: 'psych-title', text: 'These lessons explain the ideas behind what Voxu asks you to do. Each one is short, and each comes from a published study you can look up.' },
  ]
  if (f.forYou > 0) {
    lines.push({ spot: 'psych-foryou', text: 'The ones under For you relate to laws your own record shows.' })
  }
  lines.push({ spot: 'psych-chips', text: 'Pick a group to narrow the list, or open any lesson and I\'ll read you the short version.' })
  return lines
}

/** A lesson's quick version — the same for everyone, so it is paid for once. */
export function lessonScript(l: Lesson): GuideLine[] {
  const lines: GuideLine[] = [
    { spot: 'lesson-title', text: `${l.title}. ${l.line}` },
    { spot: 'lesson-body', text: l.body[0] },
  ]
  if (l.loop) {
    lines.push({
      spot: 'lesson-loop',
      text: `Here's a loop many people fall into. ${l.loop.trigger} ${l.loop.thought} ${l.loop.behavior} ${l.loop.outcome} The shift: ${l.loop.newLoop}`,
    })
  }
  lines.push({ spot: 'lesson-try', text: `Something to try: ${l.tryThis.text}` })
  return lines
}

export interface TalkFacts {
  screen: GuideScreen | 'profile' | 'proof'
  era?: { title: string; day: number; change: string; kept: number; answered: number } | null
  lessonTitle?: string | null
}

/**
 * Voxu's first line in "Talk it through" — written from the data, not by a
 * model. From week three of an era it's the callback to their own day-one
 * words: "Two weeks ago you told me…", with the real count.
 */
export function talkOpener(f: TalkFacts): string {
  if ((f.screen === 'era' || f.screen === 'today') && f.era) {
    const weeks = Math.floor((f.era.day - 1) / 7)
    const kept = f.era.answered > 0 ? ` You've kept ${f.era.kept} of the ${f.era.answered} ${plural(f.era.answered, 'promise')} you've checked in on.` : ''
    if (weeks >= 2 && f.era.change.trim()) {
      return `${weeks === 2 ? 'Two' : weeks === 3 ? 'Three' : String(weeks)} weeks ago you told me you wanted to change this: "${f.era.change.trim()}".${kept} Want to talk about how it's going?`
    }
    return `You're on day ${f.era.day} of ${f.era.title}.${kept} What's on your mind about it?`
  }
  if (f.screen === 'laws') return 'What would you like to know about your laws? Why there aren\'t any yet, what counts as evidence, which experiment to try?'
  if (f.screen === 'psychology') return 'Want to talk about one of these lessons, or how one might apply to you?'
  if (f.screen === 'lesson' && f.lessonTitle) return `Want to talk about how ${f.lessonTitle} might apply to you?`
  return 'What\'s on your mind?'
}

export interface ProofFacts {
  year: number
  /** Days with proof this year — the big number on the screen. */
  proofs: number
  promisesKept: number
  practicesKept: number
  sessions: number
  /** Finished eras listed under the year. */
  eraRecords: number
}

/** Proof — the year as the screen shows it. */
export function proofScript(f: ProofFacts): GuideLine[] {
  const lines: GuideLine[] = [
    { spot: 'proof-count', text: `This is your proof: ${f.proofs} ${plural(f.proofs, 'day')} in ${f.year} where you did what you said you would.` },
    { spot: 'proof-grid', text: 'Each square is a day. The lit ones are days with proof. Tap any day to see what it held.' },
  ]
  if (f.promisesKept + f.practicesKept + f.sessions > 0) {
    lines.push({ spot: 'proof-stats', text: `Underneath: ${f.promisesKept} ${plural(f.promisesKept, 'promise')} kept, ${f.practicesKept} ${plural(f.practicesKept, 'practice')} kept, and ${f.sessions} ${plural(f.sessions, 'session')} done.` })
  }
  if (f.eraRecords > 0) {
    lines.push({ spot: 'proof-eras', text: 'Below the year are your finished eras. Each one keeps its record, and what you learned in it.' })
  }
  lines.push({ text: 'A missed day stays on the page too. A record that only counts the good days isn\'t a record.' })
  return lines
}

export interface ProfileFacts {
  featured: string | null
  recent: number
  earned: number
  total: number
}

/** You — the coin, recent relics, the collection. */
export function profileScript(f: ProfileFacts): GuideLine[] {
  const lines: GuideLine[] = [
    f.featured
      ? { spot: 'profile-top', text: `This is you. The coin at the top, ${f.featured}, is the one you've chosen to lead with.` }
      : { spot: 'profile-top', text: 'This is you. The coin you choose to wear will sit at the top.' },
  ]
  if (f.recent > 0) {
    lines.push({ spot: 'profile-recent', text: 'These are the relics you earned most recently. Tap one to see its chain, share it, or add a memory to it.' })
  }
  if (f.total > 0) {
    lines.push({ spot: 'profile-collection', text: `You've earned ${f.earned} of ${f.total} relics so far, by category.` })
  }
  lines.push({ text: 'Progress, next to this, has your streaks and stats.' })
  return lines
}
