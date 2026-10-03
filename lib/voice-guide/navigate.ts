import { LESSONS } from '@/lib/psychology/lessons'

/**
 * Voxu Guide, phase 2 — "take me to…". Pure.
 *
 * What someone said (or tapped) becomes ONE place from a fixed list. No
 * model: the guide can only ever send someone somewhere that exists, and the
 * same words always go to the same place. Nothing here changes anything —
 * navigation only; actions come in phase 3, behind a confirm.
 *
 * "Show me", "take me there", "what should I press" mean the current
 * screen's next step, which the screen passes in as `next`.
 *
 * A destination may carry a `spot`: the page lights that part up on arrival
 * (?spot=…, read by VoxuGuide), so "the experiment you mentioned" lands ON
 * the experiments, not just on the page.
 */

export interface Destination {
  key: string
  /** What Voxu says on the way: "Here's your era." */
  say: string
  href: string
  /** The part to light up on arrival (data-voxu-spot). */
  spot?: string
  /** Lowercase phrases that mean this place. Longest match wins. */
  aliases: string[]
}

export const DESTINATIONS: Destination[] = [
  { key: 'today', say: 'Here\'s today.', href: '/', aliases: ['today', 'home', 'my day', 'today\'s promise', 'my promise', 'make a promise', 'promise'] },
  { key: 'era', say: 'Here\'s your era.', href: '/era', aliases: ['era', 'my era', 'the era', 'day one', 'day 1', 'mission', 'today\'s mission'] },
  { key: 'laws', say: 'Here are your laws.', href: '/patterns', spot: 'laws-title', aliases: ['laws', 'my laws', 'law', 'pattern', 'patterns', 'my pattern', 'what you noticed', 'what you learned'] },
  { key: 'experiments', say: 'Here are the experiments.', href: '/patterns', spot: 'laws-experiments', aliases: ['experiment', 'experiments', 'test', 'the experiment you mentioned', 'try something'] },
  { key: 'rhythm', say: 'Here\'s your rhythm.', href: '/patterns', spot: 'laws-rhythm', aliases: ['rhythm', 'my rhythm', 'best time', 'what time', 'which days'] },
  { key: 'proof', say: 'Here\'s your proof.', href: '/proof', aliases: ['proof', 'my proof', 'record', 'my record', 'year', 'what i\'ve done'] },
  { key: 'progress', say: 'Here\'s your progress.', href: '/progress', aliases: ['progress', 'stats', 'streak', 'streaks', 'xp', 'level', 'achievements'] },
  { key: 'profile', say: 'Here\'s your profile.', href: '/profile', aliases: ['profile', 'relic', 'relics', 'coins', 'my coins', 'collection'] },
  { key: 'journal', say: 'Here\'s your journal.', href: '/journal', aliases: ['journal', 'write', 'writing', 'diary', 'talk it through', 'coach', 'chat'] },
  { key: 'training', say: 'Here\'s training.', href: '/training', aliases: ['training', 'train', 'workout', 'gym', 'exercise', 'disciplines', 'discipline', 'routine', 'my routine'] },
  { key: 'psychology', say: 'Here\'s the psychology library.', href: '/psychology', aliases: ['psychology', 'library', 'lessons', 'lesson', 'learn', 'articles', 'science'] },
  { key: 'daily-read', say: 'Here\'s your daily read.', href: '/daily-read', aliases: ['daily read', 'read', 'question', 'questions', 'quiz'] },
  { key: 'reset', say: 'Let\'s find a way back in.', href: '/reset', aliases: ['reset', 'not feeling it', 'hard day', 'bad day', 'struggling', 'i don\'t feel like it', 'overwhelmed'] },
  { key: 'saved', say: 'Here\'s everything you saved.', href: '/saved', aliases: ['saved', 'favorites', 'favourites', 'hearted', 'bookmarks'] },
  { key: 'settings', say: 'Here are your settings.', href: '/settings', aliases: ['settings', 'notifications', 'voice tone', 'coach voice', 'account', 'name'] },
]

/** Words that ask for a topic's lesson, by lesson id. Plain topics people actually say. */
const LESSON_TOPICS: Record<string, string[]> = {
  'if-then-plans': ['if-then', 'if then', 'forget my promise', 'keep forgetting', 'plan ahead'],
  'specific-goals': ['specific', 'vague', 'do your best'],
  'planning-fallacy': ['procrastinat', 'too big', 'underestimate', 'planning fallacy', 'takes longer'],
  'mental-contrasting': ['obstacle', 'woop', 'what gets in the way'],
  'fresh-start': ['fresh start', 'start over', 'start again', 'new start'],
  'habits-take-time': ['how long', '21 days', 'habit take', 'habits take', 'build a habit'],
  'cues-and-friction': ['cue', 'friction', 'environment', 'my space'],
  'temptation-bundling': ['bundl', 'make it fun', 'reward'],
  'stuck-in-the-middle': ['middle', 'halfway', 'slump', 'losing motivation'],
  'small-wins': ['small win', 'small wins', 'progress principle'],
  'attention-residue': ['distract', 'focus', 'switching', 'attention'],
  'the-miss-loop': ['missed', 'miss a day', 'blew it', 'fell off', 'broke my streak', 'slip'],
  'self-compassion': ['hard on myself', 'compassion', 'guilt', 'kind to myself'],
  'self-efficacy': ['confidence', 'believe in myself', 'self-efficacy'],
  'reframing': ['reframe', 'reframing', 'negative thought', 'wasted the day'],
}

/** "Show me" — the current screen's next step. */
const HERE_PHRASES = [
  'show me', 'take me there', 'go there', 'where do i do that', 'where is that', 'what should i press',
  'what do i press', 'what do i do', 'what should i do', 'what next', 'what now', 'guide me', 'next step',
  'i don\'t know what to do', 'help me start', 'where do i start',
]

export type NavResult =
  | { kind: 'go'; say: string; href: string; spot?: string }
  | { kind: 'unknown'; say: string }

export interface NavContext {
  /** The current screen's next step, if it has one. */
  next?: { say: string; href: string; spot?: string } | null
}

function clean(text: string): string {
  return ` ${text.toLowerCase().replace(/[’']/g, '\'').replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim()} `
}

/** Whole words only: 'era' must not match inside 'operate'. */
const has = (t: string, phrase: string) => t.includes(` ${phrase} `)

export function resolveNav(text: string, ctx: NavContext = {}): NavResult {
  const t = clean(text)
  if (t.trim().length === 0) return { kind: 'unknown', say: 'I didn\'t catch that. You can say a place, like your laws or your era.' }

  // 1. A named lesson, by its title — "take me to the planning fallacy".
  for (const l of LESSONS) {
    if (has(t, clean(l.title).trim())) {
      return { kind: 'go', say: `Here's ${l.title}.`, href: `/psychology/${l.id}` }
    }
  }

  // 2. A place. Longest alias wins, so "today's mission" beats "today".
  let best: { d: Destination; len: number } | null = null
  for (const d of DESTINATIONS) {
    for (const a of d.aliases) {
      if (has(t, a) && (!best || a.length > best.len)) best = { d, len: a.length }
    }
  }

  // 3. A topic people ask about — "the lesson about procrastination".
  let topic: { id: string; len: number } | null = null
  for (const [id, words] of Object.entries(LESSON_TOPICS)) {
    for (const w of words) {
      if (t.includes(w) && (!topic || w.length > topic.len)) topic = { id, len: w.length }
    }
  }
  const asksForLesson = /\b(lesson|explain|why do i|about)\b/.test(t)
  if (topic && (asksForLesson || !best || topic.len > best.len)) {
    const l = LESSONS.find(x => x.id === topic!.id)!
    return { kind: 'go', say: `${l.title} is the lesson for that.`, href: `/psychology/${l.id}` }
  }
  if (best) return { kind: 'go', say: best.d.say, href: best.d.href, spot: best.d.spot }

  // 4. "Show me" — this screen's next step.
  if (ctx.next && HERE_PHRASES.some(p => t.includes(p))) return { kind: 'go', ...ctx.next }

  return { kind: 'unknown', say: 'I can take you to your era, your laws, an experiment, a lesson, your journal or training. Where would you like to go?' }
}

/** The link for a destination, carrying the part to light up. */
export function navHref(r: { href: string; spot?: string }): string {
  if (!r.spot) return r.href
  return `${r.href}${r.href.includes('?') ? '&' : '?'}spot=${encodeURIComponent(r.spot)}`
}
