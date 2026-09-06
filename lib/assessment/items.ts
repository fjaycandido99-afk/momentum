import type { AxisId } from './axes'

/**
 * The Daily Read item bank.
 *
 * Two rules held throughout, both of which matter more than they look:
 *
 * 1. STATEMENTS, NOT QUESTIONS. A statement takes an agree/disagree scale
 *    cleanly; a question doesn't, and mixing the two makes the scale mean
 *    different things on different days.
 *
 * 2. DISPOSITION, NOT STATE. Nothing here asks how someone feels today. Mood
 *    already lives in three separate columns (journal_mood, mood_before,
 *    mood_after) and an item like "I feel tired today" would both duplicate
 *    it and let one bad night's sleep corrupt a trait score.
 *
 * `id` is stable and persisted on every answer row — changing an item's
 * wording is fine, changing its id orphans history.
 */

export interface ScaleItem {
  kind?: 'scale'
  id: string
  text: string
  axis: AxisId
  /** +1: agreeing pushes the axis up. -1: agreeing pushes it down. */
  direction: 1 | -1
}

export const SCALE_ITEMS: ScaleItem[] = [
  // ---- Agency: accepts what comes  <->  bends things to will ----
  { id: 'ag01', axis: 'agency', direction: -1, text: 'When something goes wrong, I focus first on what I can still control.' },
  { id: 'ag02', axis: 'agency', direction: 1, text: 'If I want something badly enough, I can usually make it happen.' },
  { id: 'ag03', axis: 'agency', direction: -1, text: 'A lot of how my life goes is simply out of my hands.' },
  { id: 'ag04', axis: 'agency', direction: 1, text: 'When I hit a wall, my instinct is to push harder rather than go around.' },
  { id: 'ag05', axis: 'agency', direction: -1, text: 'There is real relief in accepting a situation I cannot change.' },
  { id: 'ag06', axis: 'agency', direction: 1, text: 'I would rather force a bad option to work than wait for a better one.' },
  { id: 'ag07', axis: 'agency', direction: -1, text: 'Most of the time, the wisest move is to let things run their course.' },
  { id: 'ag08', axis: 'agency', direction: 1, text: 'I tend to believe the outcome is mine to determine.' },
  { id: 'ag09', axis: 'agency', direction: -1, text: 'I make peace with setbacks fairly quickly.' },
  { id: 'ag10', axis: 'agency', direction: 1, text: 'When I want something to change, I go and change it.' },

  // ---- Discipline: follows the day  <->  holds a structure ----
  { id: 'di01', axis: 'discipline', direction: 1, text: 'I keep to a routine even on the days I do not feel like it.' },
  { id: 'di02', axis: 'discipline', direction: -1, text: 'I would rather follow the day wherever it takes me.' },
  { id: 'di03', axis: 'discipline', direction: 1, text: 'Saying no to something I want comes easily to me.' },
  { id: 'di04', axis: 'discipline', direction: -1, text: 'Plans I make for myself tend to bend when something better comes up.' },
  { id: 'di05', axis: 'discipline', direction: 1, text: 'I finish things I have started, even the ones I have gone cold on.' },
  { id: 'di06', axis: 'discipline', direction: -1, text: 'I do my best work in bursts rather than on a schedule.' },
  { id: 'di07', axis: 'discipline', direction: 1, text: 'I am comfortable being uncomfortable if there is a point to it.' },
  { id: 'di08', axis: 'discipline', direction: -1, text: 'Denying myself something pleasant rarely seems worth it.' },
  { id: 'di09', axis: 'discipline', direction: 1, text: 'I hold myself to standards nobody else is checking.' },
  { id: 'di10', axis: 'discipline', direction: -1, text: 'Structure starts to feel like a cage before long.' },

  // ---- Inquiry: acts on instinct  <->  questions first ----
  { id: 'in01', axis: 'inquiry', direction: 1, text: 'I turn a decision over in my head before I act on it.' },
  { id: 'in02', axis: 'inquiry', direction: -1, text: 'I trust my gut more than my reasoning.' },
  { id: 'in03', axis: 'inquiry', direction: 1, text: 'I enjoy having a belief of mine challenged.' },
  { id: 'in04', axis: 'inquiry', direction: -1, text: 'Overthinking a thing usually costs more than getting it slightly wrong.' },
  { id: 'in05', axis: 'inquiry', direction: 1, text: 'I want to understand why something works, not just that it does.' },
  { id: 'in06', axis: 'inquiry', direction: -1, text: 'When I know what to do, I do not need to examine it further.' },
  { id: 'in07', axis: 'inquiry', direction: 1, text: 'I notice myself questioning things most people accept.' },
  { id: 'in08', axis: 'inquiry', direction: -1, text: 'I would rather move now and correct later than be sure first.' },
  { id: 'in09', axis: 'inquiry', direction: 1, text: 'I read around a subject before forming a view on it.' },
  { id: 'in10', axis: 'inquiry', direction: -1, text: 'The right answer is usually the first one that occurs to me.' },

  // ---- Faith: expects the catch  <->  expects it to work out ----
  { id: 'fa01', axis: 'faith', direction: 1, text: 'Things tend to work out.' },
  { id: 'fa02', axis: 'faith', direction: -1, text: 'When someone promises something, I assume there is a catch.' },
  { id: 'fa03', axis: 'faith', direction: 1, text: 'What I picture clearly, I tend to end up moving toward.' },
  { id: 'fa04', axis: 'faith', direction: -1, text: 'Optimism usually means somebody has not looked closely enough.' },
  { id: 'fa05', axis: 'faith', direction: 1, text: 'I expect people to be decent until shown otherwise.' },
  { id: 'fa06', axis: 'faith', direction: -1, text: 'I prepare for the version of events where it goes badly.' },
  { id: 'fa07', axis: 'faith', direction: 1, text: 'There is more going on than what can be measured.' },
  { id: 'fa08', axis: 'faith', direction: -1, text: 'Most encouraging advice is selling something.' },
  { id: 'fa09', axis: 'faith', direction: 1, text: 'I trust that effort put in now returns later, even without proof.' },
  { id: 'fa10', axis: 'faith', direction: -1, text: 'I believe a thing when I can see the evidence for it.' },
]

/**
 * Forced-choice items: two statements, pick the one that's more you.
 *
 * Added for two reasons, and the second one matters more than variety.
 *
 * Every scale item asks how much you AGREE, and agreement scales carry
 * acquiescence bias — people drift toward agreeing, especially when tired or
 * moving fast, which is exactly the 7am user this is built for. Loading half
 * the bank in reverse hedges against it but doesn't remove it. A forced
 * choice can't be agreed with, so the bias has nowhere to go.
 *
 * Both options sit on the SAME axis at opposite poles, so a choice is a clean
 * signal about one thing. Pairing across axes would score two at once, but
 * "I prefer A to B" conflates the two and is much harder to interpret later.
 */
export interface ChoiceItem {
  kind: 'choice'
  id: string
  axis: AxisId
  options: [{ text: string; direction: 1 | -1 }, { text: string; direction: 1 | -1 }]
}

export const CHOICE_ITEMS: ChoiceItem[] = [
  { kind: 'choice', id: 'cag01', axis: 'agency', options: [
    { text: 'Change what I can reach', direction: 1 },
    { text: 'Accept what I cannot', direction: -1 },
  ]},
  { kind: 'choice', id: 'cag02', axis: 'agency', options: [
    { text: 'Make my own luck', direction: 1 },
    { text: 'Work with the luck I get', direction: -1 },
  ]},
  { kind: 'choice', id: 'cag03', axis: 'agency', options: [
    { text: 'Push through the wall', direction: 1 },
    { text: 'Find another way round', direction: -1 },
  ]},
  { kind: 'choice', id: 'cag04', axis: 'agency', options: [
    { text: 'Take the wheel', direction: 1 },
    { text: 'Let it play out', direction: -1 },
  ]},

  { kind: 'choice', id: 'cdi01', axis: 'discipline', options: [
    { text: 'Stick to the plan', direction: 1 },
    { text: 'Follow the better offer', direction: -1 },
  ]},
  { kind: 'choice', id: 'cdi02', axis: 'discipline', options: [
    { text: 'Earn it first', direction: 1 },
    { text: 'Enjoy it now', direction: -1 },
  ]},
  { kind: 'choice', id: 'cdi03', axis: 'discipline', options: [
    { text: 'Same time every day', direction: 1 },
    { text: 'Whenever it strikes', direction: -1 },
  ]},
  { kind: 'choice', id: 'cdi04', axis: 'discipline', options: [
    { text: 'Finish what I started', direction: 1 },
    { text: 'Start what excites me', direction: -1 },
  ]},

  { kind: 'choice', id: 'cin01', axis: 'inquiry', options: [
    { text: 'Understand it first', direction: 1 },
    { text: 'Try it and see', direction: -1 },
  ]},
  { kind: 'choice', id: 'cin02', axis: 'inquiry', options: [
    { text: 'Question the rule', direction: 1 },
    { text: 'Trust it and move', direction: -1 },
  ]},
  { kind: 'choice', id: 'cin03', axis: 'inquiry', options: [
    { text: 'Sleep on it', direction: 1 },
    { text: 'Decide now', direction: -1 },
  ]},
  { kind: 'choice', id: 'cin04', axis: 'inquiry', options: [
    { text: 'Read the argument against', direction: 1 },
    { text: 'Go with what I already think', direction: -1 },
  ]},

  { kind: 'choice', id: 'cfa01', axis: 'faith', options: [
    { text: 'Assume it works out', direction: 1 },
    { text: 'Plan for it not to', direction: -1 },
  ]},
  { kind: 'choice', id: 'cfa02', axis: 'faith', options: [
    { text: 'Give people the benefit', direction: 1 },
    { text: 'Wait until they earn it', direction: -1 },
  ]},
  { kind: 'choice', id: 'cfa03', axis: 'faith', options: [
    { text: 'Some things you just know', direction: 1 },
    { text: 'Show me the evidence', direction: -1 },
  ]},
  { kind: 'choice', id: 'cfa04', axis: 'faith', options: [
    { text: 'Hope for the best', direction: 1 },
    { text: 'Expect the catch', direction: -1 },
  ]},
]

export type AssessmentItem = (ScaleItem & { kind: 'scale' }) | ChoiceItem

/**
 * The whole bank. Scale items get their `kind` stamped here rather than on all
 * forty by hand, so adding a shape never means touching existing rows.
 */
export const ASSESSMENT_ITEMS: AssessmentItem[] = [
  ...SCALE_ITEMS.map(i => ({ ...i, kind: 'scale' as const })),
  ...CHOICE_ITEMS,
]

export const ITEMS_BY_ID = new Map(ASSESSMENT_ITEMS.map(i => [i.id, i]))

/** How strongly a forced choice moves its axis. Deliberately ±1 rather than
 *  the ±2 a "5" on the scale gives: a choice is definite, but it's a choice
 *  between two poles, not an emphatic endorsement of one. */
export const CHOICE_SCORE = 4

/** The 5-point scale, low to high. Labels are the user-facing wording. */
export const SCALE = [
  { score: 1, label: 'Not at all' },
  { score: 2, label: 'Not really' },
  { score: 3, label: 'Depends' },
  { score: 4, label: 'Mostly' },
  { score: 5, label: 'Exactly' },
] as const

/**
 * How long before an already-answered item is preferably not re-asked.
 *
 * Re-asking is deliberate: drift is the product. A lean that can move is the
 * thing worth watching, and it is what gives the premium history view
 * anything to show. This is why answers are NOT uniquely constrained per
 * (user, item) — that constraint would have made drift unmeasurable.
 *
 * A PREFERENCE, not a gate. It was originally 120 days against a bank of 40
 * items, which meant a daily answerer emptied the bank in about six weeks and
 * then hit roughly eleven weeks where every item was still cooling down and
 * the feature silently stopped appearing. Nothing errored — it just went
 * away. pickNextItem now falls back to the least-recently-answered item, so
 * the bank cycles at its own size (~40 days between repeats) instead of
 * going dark, and this number only governs the first pass.
 */
export const RE_ASK_AFTER_DAYS = 60

/**
 * Pick the next item for a user.
 *
 * Prefers whichever axis we know least about, so a read becomes possible as
 * early as possible rather than after forty answers about willpower.
 *
 * `staleFirst` is item ids ordered oldest-answered first, used only once
 * every item is inside its cooldown. Returns null only if the bank is empty.
 */
export function pickNextItem(
  recentlyAnswered: Set<string>,
  coverage: Record<AxisId, number>,
  staleFirst: string[] = [],
  random: () => number = Math.random,
): AssessmentItem | null {
  const available = ASSESSMENT_ITEMS.filter(i => !recentlyAnswered.has(i.id))

  if (available.length === 0) {
    // Everything is cooling down. Re-ask the one answered longest ago rather
    // than showing nothing — see RE_ASK_AFTER_DAYS.
    for (const id of staleFirst) {
      const item = ITEMS_BY_ID.get(id)
      if (item) return item
    }
    return ASSESSMENT_ITEMS.length > 0
      ? ASSESSMENT_ITEMS[Math.floor(random() * ASSESSMENT_ITEMS.length)]
      : null
  }

  const counts = Object.values(coverage) as number[]
  const thinnest = counts.length > 0 ? Math.min(...counts) : 0
  const hungryAxes = (Object.keys(coverage) as AxisId[]).filter(a => coverage[a] === thinnest)
  const preferred = available.filter(i => hungryAxes.includes(i.axis))
  const pool = preferred.length > 0 ? preferred : available

  return pool[Math.floor(random() * pool.length)]
}

/**
 * A run of items for someone who wants to get through several in one sitting.
 *
 * Not just `pickNextItem` called N times: coverage is advanced as it goes, so
 * the run spreads across the four axes instead of returning whichever axis was
 * thinnest at the start over and over. That matters because a first read needs
 * every axis heard from — a run of eight all about willpower would leave the
 * user exactly where they started.
 */
export function pickSequence(
  count: number,
  recentlyAnswered: Set<string>,
  coverage: Record<AxisId, number>,
  staleFirst: string[] = [],
  random: () => number = Math.random,
): AssessmentItem[] {
  const taken = new Set(recentlyAnswered)
  const running = { ...coverage }
  const out: AssessmentItem[] = []

  for (let i = 0; i < count; i++) {
    const item = pickNextItem(taken, running, staleFirst, random)
    if (!item || taken.has(item.id)) break
    out.push(item)
    taken.add(item.id)
    running[item.axis] += 1
  }

  return out
}

/** What a client needs to render an item, whatever shape it is. */
export interface WireItem {
  id: string
  kind: 'scale' | 'choice'
  /** The statement to rate, or the prompt above a choice. */
  text: string
  /** Present only for forced choice. */
  options?: { text: string }[]
}

export const CHOICE_PROMPT = 'Which is more you?'

export function toWire(item: AssessmentItem): WireItem {
  if (item.kind === 'choice') {
    return {
      id: item.id,
      kind: 'choice',
      text: CHOICE_PROMPT,
      options: item.options.map(o => ({ text: o.text })),
    }
  }
  return { id: item.id, kind: 'scale', text: item.text }
}

/**
 * A human-readable rendering of an item, for the data export. An id and a
 * number is not a meaningful account of what someone actually answered.
 */
export function itemLabel(item: AssessmentItem): string {
  return item.kind === 'choice'
    ? `${CHOICE_PROMPT} ${item.options.map(o => o.text).join(' / ')}`
    : item.text
}
