import { EXPERIMENTS, type ExperimentDef } from '@/lib/patterns/experiments'
import { resolveNav, type NavContext, type NavResult } from './navigate'

/**
 * Voxu Guide, phase 3 — "set this up for me", "make today easier", "play
 * today's guided session". Pure.
 *
 * Every action ends at something the person TAPS: the experiment setup
 * screen's Start button, the lighter-day card's confirm, or today's guided
 * session lit up on Today. The guide itself never starts, changes or records
 * anything. Anything that isn't an action falls through to navigation
 * (phase 2).
 */

export type Intent =
  | NavResult
  /** Ask first: show what today would shrink to, confirm, then switch. */
  | { kind: 'lighter_day' }
  /** Find today's guided session and light it up on Today. */
  | { kind: 'play_guide' }

export interface IntentContext extends NavContext {
  /** The experiment this screen is about, for "set this up" / "start it". */
  experiment?: ExperimentDef['key'] | null
}

function clean(text: string): string {
  return ` ${text.toLowerCase().replace(/[’']/g, '\'').replace(/[^a-z0-9' -]/g, ' ').replace(/\s+/g, ' ').trim()} `
}

const SET_UP = ['set this up', 'set it up', 'set that up', 'start it', 'start this', 'start that', 'start the experiment',
  'start an experiment', 'start one', 'try it', 'try this', 'let\'s try', 'lets try', 'do the experiment', 'begin it']
const LIGHTER = ['make today easier', 'make today smaller', 'make today lighter', 'lighter day', 'easier day',
  'make it lighter', 'make it easier', 'shrink today', 'too much today', 'lighten today', 'cut today down']
const PLAY_GUIDE = ['play today\'s guided', 'play the guided', 'play my guided', 'play today\'s guide', 'play the guide',
  'play my guide', 'play a guided', 'start the guided', 'start my guided', 'start today\'s guided', 'play the session', 'play my session']

/** An experiment named in what they said: its title, or the words people use for it. */
const NAMED: Record<ExperimentDef['key'], string[]> = {
  morning_promise: ['promise before 9', 'before 9', 'before nine', 'morning promise', 'morning'],
  small_promise: ['keep it small', 'small promise', 'smaller promise', 'small'],
  guide_first: ['guide first', 'guided first', 'guide before'],
}

function namedExperiment(t: string): ExperimentDef['key'] | null {
  let best: { key: ExperimentDef['key']; len: number } | null = null
  for (const [key, words] of Object.entries(NAMED) as [ExperimentDef['key'], string[]][]) {
    for (const w of words) if (t.includes(` ${w}`) && (!best || w.length > best.len)) best = { key, len: w.length }
  }
  return best?.key ?? null
}

export function experimentSetupHref(key: ExperimentDef['key']): string {
  return `/patterns/experiment/${key}`
}

export function resolveIntent(text: string, ctx: IntentContext = {}): Intent {
  const t = clean(text)

  if (PLAY_GUIDE.some(p => t.includes(` ${p}`))) return { kind: 'play_guide' }
  if (LIGHTER.some(p => t.includes(` ${p}`))) return { kind: 'lighter_day' }

  const startWords = SET_UP.some(p => t.includes(` ${p}`)) || /\b(start|try|begin)\b/.test(t)
  if (startWords) {
    const key = namedExperiment(t) ?? (SET_UP.some(p => t.includes(` ${p}`)) ? ctx.experiment ?? null : null)
    if (key) {
      const def = EXPERIMENTS.find(e => e.key === key)!
      return { kind: 'go', say: `Here's the setup for ${def.title}. Tap Start when you're ready.`, href: experimentSetupHref(key) }
    }
    if (SET_UP.some(p => t.includes(` ${p}`)) || /\bexperiment/.test(t)) {
      return { kind: 'go', say: 'Here are the experiments. Pick the one you want to set up.', href: '/patterns', spot: 'laws-experiments' }
    }
  }

  return resolveNav(text, ctx)
}

/**
 * In "Talk it through", is this a command (handled like the panel) or part
 * of the conversation (sent to the coach)? Only something phrased as a
 * command: "I missed yesterday and feel awful" mentions a lesson topic, and
 * hijacking it into navigation would be the worst possible reply.
 */
export function isCommand(text: string): boolean {
  const t = clean(text).trim()
  return /^(please |can you |could you |voxu |hey voxu )?(take me|go to|go back to|open|show me|bring me|play|start|set (this|it|that) up|make today|let's try|lets try)\b/.test(t)
}
