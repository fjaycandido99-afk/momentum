import { AXES, AXIS_IDS, MIN_ANSWERS_FOR_READ, type AxisId, type Confidence, type Read } from './axes'

/**
 * What the Daily Read names.
 *
 * It used to name one of the eight mindsets — the same eight the user already
 * picked in mindset-selection — so the result read as a verdict on their
 * choice rather than a description of them. This names what the axes actually
 * say, in its own vocabulary, and leaves the mindset as a footnote.
 *
 * A signature is the two axes furthest from centre, each with its pole: six
 * pairs times four pole combinations, twenty-four names. Only axes genuinely
 * off centre qualify, so someone sitting in the middle gets a single trait —
 * or nothing — rather than a name they haven't earned. That also keeps the
 * cohort share honest: it counts pairs, which are a real position, not a
 * rounding of noise.
 */

export type Pole = 'low' | 'high'

/** How far off centre an axis must sit, on the -2..+2 scale, to be named. */
export const STRONG = 0.5

/**
 * Answers an axis needs before it can appear in a name.
 *
 * Without this a single tap puts an axis at ±2 — instantly "strong" — and
 * since the second-strongest axis decides half the name, the name changed on
 * almost every answer for the first fortnight. Nobody screenshots a result
 * that is different tomorrow, and the cohort buckets churned underneath it.
 * Three answers is also what stops a name appearing over an empty axis bar.
 */
export const MIN_AXIS_ANSWERS = 3

/**
 * Once named, an axis is held to a lower bar than it had to clear to get in,
 * and a challenger has to beat the standing pair by SWITCH_MARGIN. Drift
 * across the threshold is real movement; jitter around it is not, and only
 * hysteresis can tell them apart from inside a single read.
 */
const KEEP = 0.35
const SWITCH_MARGIN = 0.5

export interface Signature {
  /** Stable bucket key, or null for a single trait (not a cohort). */
  key: string | null
  name: string
  blurb: string
  /** The question that opens the chat when they tap "Talk it through". */
  probe: string
  /** True once two axes are strong enough to earn a name. */
  named: boolean
  /**
   * How decisive THIS name is — the signature's own margin, not the mindset
   * model's. The screen used to print a confidence sentence computed from
   * distance between mindsets while showing a signature, which meant the
   * caption was describing something the user could no longer see.
   */
  confidence: Confidence
}

interface Entry { name: string; blurb: string; probe: string }

/** Canonical key: axes in AXIS_IDS order so a pair always keys the same way. */
export function signatureKey(a: AxisId, aPole: Pole, b: AxisId, bPole: Pole): string {
  const [first, second] = AXIS_IDS.indexOf(a) < AXIS_IDS.indexOf(b)
    ? [[a, aPole] as const, [b, bPole] as const]
    : [[b, bPole] as const, [a, aPole] as const]
  return `${first[0]}:${first[1]}|${second[0]}:${second[1]}`
}

export interface ParsedKey { axes: [AxisId, AxisId]; poles: [Pole, Pole] }

/** Read a stored key back. Returns null for anything not from this table. */
export function parseSignatureKey(key: string): ParsedKey | null {
  if (!SIGNATURES[key]) return null
  const parts = key.split('|').map(p => p.split(':'))
  if (parts.length !== 2) return null
  const axes = parts.map(p => p[0]) as AxisId[]
  const poles = parts.map(p => p[1]) as Pole[]
  if (!axes.every(a => AXIS_IDS.includes(a))) return null
  if (!poles.every(p => p === 'low' || p === 'high')) return null
  return { axes: [axes[0], axes[1]], poles: [poles[0], poles[1]] }
}

/**
 * The twenty-four. Written, not generated — a name assembled from adjective
 * tables reads like a horoscope, and this has to survive being screenshotted.
 */
export const SIGNATURES: Record<string, Entry> = {
  'agency:high|discipline:high': {
    name: 'The Set Jaw',
    blurb: 'You decide what happens, then hold the line you drew.',
    probe: 'Where is holding that line costing you more than it returns?',
  },
  'agency:high|discipline:low': {
    name: 'The Fast Hand',
    blurb: 'You move things your way, and you refuse to be scheduled about it.',
    probe: 'What would you lose if one part of the week had a fixed shape?',
  },
  'agency:low|discipline:high': {
    name: 'The Steady Post',
    blurb: "You don't fight the day, you keep the same shape through it.",
    probe: 'What is the structure actually protecting you from?',
  },
  'agency:low|discipline:low': {
    name: 'The Open Hand',
    blurb: "You take the day as it lands and don't try to hold it in place.",
    probe: "Is there one thing this week you'd rather have gripped harder?",
  },

  'agency:high|inquiry:high': {
    name: 'The Measured Push',
    blurb: 'You want it your way, and you want to know why before you move.',
    probe: 'What are you still researching that you already know the answer to?',
  },
  'agency:high|inquiry:low': {
    name: 'The First Move',
    blurb: 'You go on the read you already have, and you go early.',
    probe: 'When did moving early last cost you something?',
  },
  'agency:low|inquiry:high': {
    name: 'The Long Look',
    blurb: "You'd rather understand a thing than change it.",
    probe: 'What do you understand well and have done nothing about?',
  },
  'agency:low|inquiry:low': {
    name: 'The Easy Read',
    blurb: "You go on feel, and you don't force the outcome.",
    probe: "What has your gut been saying that you haven't acted on?",
  },

  'agency:high|faith:high': {
    name: 'The Long Bet',
    blurb: 'You push hard because you expect it to land.',
    probe: "What are you betting on, and what happens if it doesn't land?",
  },
  'agency:high|faith:low': {
    name: 'The Braced Push',
    blurb: 'You go after it anyway, with one eye on what could go wrong.',
    probe: "What are you bracing for that probably isn't coming?",
  },
  'agency:low|faith:high': {
    name: 'The Soft Landing',
    blurb: "You expect things to work out, and you don't grip them to make sure.",
    probe: "What is working out on its own right now — and what isn't?",
  },
  'agency:low|faith:low': {
    name: 'The Quiet Watch',
    blurb: "You wait to see what it does, and you're not surprised when it turns.",
    probe: 'What are you waiting on that would move if you pushed it?',
  },

  'discipline:high|inquiry:high': {
    name: 'The Careful Build',
    blurb: 'You question it first, then commit to a shape and hold it.',
    probe: "What did you build carefully that you'd now question?",
  },
  'discipline:high|inquiry:low': {
    name: 'The Worn Path',
    blurb: 'You trust the routine more than the analysis.',
    probe: 'Which routine are you keeping out of habit rather than results?',
  },
  'discipline:low|inquiry:high': {
    name: 'The Turning Over',
    blurb: 'You think a lot and pin down little.',
    probe: 'What have you turned over long enough to decide?',
  },
  'discipline:low|inquiry:low': {
    name: 'The Loose Grip',
    blurb: "You go on feel, day by day, and you don't box it in.",
    probe: 'What would be better with a box around it?',
  },

  'discipline:high|faith:high': {
    name: 'The Kept Promise',
    blurb: 'You keep the structure because you believe it pays.',
    probe: "What are you keeping up that hasn't paid yet?",
  },
  'discipline:high|faith:low': {
    name: 'The Braced Frame',
    blurb: 'You hold the structure precisely because you expect something to hit it.',
    probe: 'What would loosen if you trusted it slightly more?',
  },
  'discipline:low|faith:high': {
    name: 'The Good Odds',
    blurb: "You don't plan much, and you expect it to come good anyway.",
    probe: 'What are you leaving to the odds right now?',
  },
  'discipline:low|faith:low': {
    name: 'The Held Breath',
    blurb: "You don't lock things down, and you don't assume they'll go well either.",
    probe: 'What would you need to see to breathe out?',
  },

  'inquiry:high|faith:high': {
    name: 'The Curious Yes',
    blurb: 'You want to know how it works, and you assume it does.',
    probe: 'What have you said yes to lately without checking?',
  },
  'inquiry:high|faith:low': {
    name: 'The Second Look',
    blurb: 'You check it twice, because things tend to have a catch.',
    probe: 'What did the second look save you from — and what did it cost?',
  },
  'inquiry:low|faith:high': {
    name: 'The Quick Yes',
    blurb: 'You say yes on feel and expect it to work.',
    probe: "What did you say yes to that you'd think harder about now?",
  },
  'inquiry:low|faith:low': {
    name: 'The Wary Gut',
    blurb: 'Your gut moves fast, and it usually says be careful.',
    probe: 'When was your gut last wrong to be careful?',
  },
}

/** One axis, on its own, when only one is off centre yet. */
const TRAITS: Record<string, { blurb: string; probe: string }> = {
  'agency:high':     { blurb: "You'd rather change the situation than sit in it.",    probe: 'What are you trying to change right now?' },
  'agency:low':      { blurb: 'You let the day be what it is.',                       probe: 'What are you accepting that you could change?' },
  'discipline:high': { blurb: 'You keep the same shape whatever the day does.',       probe: 'Which part of your structure earns its keep?' },
  'discipline:low':  { blurb: "You take the day's shape rather than imposing one.",   probe: 'What would one fixed hour a day do for you?' },
  'inquiry:high':    { blurb: 'You want to understand it before you move on it.',     probe: 'What are you still questioning?' },
  'inquiry:low':     { blurb: 'You move on the read you already have.',               probe: 'What is your instinct telling you today?' },
  'faith:high':      { blurb: 'You lean toward things going well.',                   probe: 'What are you expecting to work out?' },
  'faith:low':       { blurb: 'You look for what will go wrong, and often find it.',  probe: 'What catch are you watching for?' },
}

const AXIS_BY_ID = new Map(AXES.map(a => [a.id, a]))

function poleLabel(axis: AxisId, pole: Pole): string {
  const a = AXIS_BY_ID.get(axis)!
  return pole === 'high' ? a.high : a.low
}

const pole = (v: number): Pole => (v >= 0 ? 'high' : 'low')

interface RankedAxis { id: AxisId; value: number; strength: number }

/**
 * How decisive a naming is: how far the WEAKER of the two named axes clears
 * both the threshold and the strongest axis that missed out. A pair whose
 * second axis barely beat a third is an arbitrary pair, however many answers
 * are behind it — which is why this is a margin and not an answer count.
 */
function confidenceFor(second: number, nextBest: number, answered: number): Confidence {
  const separation = second - Math.max(nextBest, STRONG)
  if (separation >= 0.5 && answered >= 20) return 'clear'
  if (separation >= 0.25) return 'emerging'
  return 'early'
}

function pairSignature(a: RankedAxis, b: RankedAxis, rest: RankedAxis[], answered: number): Signature | null {
  const key = signatureKey(a.id, pole(a.value), b.id, pole(b.value))
  const entry = SIGNATURES[key]
  if (!entry) return null // Unreachable while the table is complete; a test holds that.
  const nextBest = rest.find(r => r.id !== a.id && r.id !== b.id)?.strength ?? 0
  return {
    key,
    name: entry.name,
    blurb: entry.blurb,
    probe: entry.probe,
    named: true,
    confidence: confidenceFor(Math.min(a.strength, b.strength), nextBest, answered),
  }
}

/**
 * Name a read.
 *
 * `previousKey` is the name this user is already carrying, if any. Passing it
 * makes the result sticky — see SWITCH_MARGIN. Omit it and you get the raw
 * reading, which is what the tests exercise.
 *
 * Returns null when nothing can honestly be said — too few answers, too few
 * on any one axis, or every axis sitting near centre. "Nothing yet" is a real
 * state the screen renders, not a hole to fall through.
 */
export function computeSignature(read: Read, previousKey?: string | null): Signature | null {
  if (read.answered < MIN_ANSWERS_FOR_READ) return null

  const ranked: RankedAxis[] = AXIS_IDS
    .map(id => ({ id, value: read.axes[id], strength: Math.abs(read.axes[id]) }))
    // An axis nobody has been asked about three times isn't a position, it's
    // a rounding of one or two taps.
    .filter(a => read.coverage[a.id] >= MIN_AXIS_ANSWERS)
    // Furthest from centre first; AXIS_IDS order breaks exact ties so the
    // same answers always produce the same name.
    .sort((a, b) => b.strength - a.strength || AXIS_IDS.indexOf(a.id) - AXIS_IDS.indexOf(b.id))

  const strong = ranked.filter(a => a.strength >= STRONG)
  if (strong.length === 0) return null

  if (strong.length === 1) {
    const [only] = strong
    const p = pole(only.value)
    const trait = TRAITS[`${only.id}:${p}`]
    return {
      key: null,
      name: poleLabel(only.id, p),
      blurb: trait.blurb,
      probe: trait.probe,
      named: false,
      confidence: 'early',
    }
  }

  const candidate = pairSignature(strong[0], strong[1], ranked, read.answered)

  // Hold the standing name unless the challenger is meaningfully better. Both
  // of its axes must still be on the same side and still carry some weight —
  // a name whose axis has crossed the centre line is simply wrong, and no
  // amount of stickiness should keep it.
  if (previousKey && candidate && previousKey !== candidate.key) {
    const prev = parseSignatureKey(previousKey)
    const held = prev?.axes.map((id, i) => {
      const axis = ranked.find(r => r.id === id)
      if (!axis || axis.strength < KEEP) return null
      return pole(axis.value) === prev.poles[i] ? axis : null
    })

    if (held && held.every(Boolean)) {
      const [x, y] = held as RankedAxis[]
      const challengerLead = (strong[0].strength + strong[1].strength) - (x.strength + y.strength)
      if (challengerLead < SWITCH_MARGIN) return pairSignature(x, y, ranked, read.answered)
    }
  }

  return candidate
}
