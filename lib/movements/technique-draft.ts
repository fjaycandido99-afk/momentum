import { MOVEMENTS_BY_ID, PATTERN_LABELS, PATTERN_MEANS, regionsOf } from './library'
import { TECHNIQUE_LIMITS, validateTechnique, type TechniqueDraft } from './technique'

/**
 * Asking the model for a first draft, so a reviewer edits instead of types.
 *
 * This is the honest use of AI here. Seventy-nine blank forms is a week
 * nobody has; seventy-nine drafts to correct is an afternoon. What the
 * model must never do is SIGN one — a draft is invisible until a person
 * puts their name on it, and that rule lives in the database read path
 * (technique-server.ts filters on `published`), not in a policy document.
 *
 * The prompt is deliberately narrow: describe the movement, nothing else.
 * No dose, no evidence claims, no medical language, no encouragement, no
 * era voice. The same validator that guards the human form runs over the
 * model's output, so a draft that breaks a rule is rejected rather than
 * quietly stored.
 *
 * Pure. The caller does the network and the database.
 */

export const DRAFT_SYSTEM_PROMPT = `You write first drafts of strength-training technique notes for a human reviewer to correct. You are not the reviewer. Your text is never shown to anyone until a named person has approved it.

Write plainly, in the second person, in British English. Short sentences. No motivation, no encouragement, no filler.

HARD RULES — output breaking any of these is thrown away:
- No sets, reps, weights, loads, percentages, times, tempos or rest. Not "3 x 8", not "hold for 30 seconds", not "80% of your max". How much is never yours to say.
- No claims about research, studies, or what is "proven" or "optimal".
- No medical language. Nothing treats, cures, heals, diagnoses or rehabilitates.
- No cues about pain. If something hurts that is the reviewer's business, not a cue.
- Never say one movement is better, best or superior to another.
- Do not mention Voxu, apps, coaches or disclaimers. Just the movement.

Return ONLY minified JSON, no prose around it, in exactly this shape:
{"steps":["..."],"cues":[{"label":"...","detail":"..."}],"mistakes":[{"label":"...","detail":"..."}],"callouts":[{"label":"...","detail":"...","x":30,"y":25,"side":"left"}]}

steps: up to ${TECHNIQUE_LIMITS.steps.max} short steps, in order, describing how the movement is performed.
cues: up to ${TECHNIQUE_LIMITS.cues.max}. label is two to four words. detail is one short sentence.
mistakes: up to ${TECHNIQUE_LIMITS.mistakes.max}. label names what goes wrong, detail says what to do instead. Never blame the reader.
callouts: up to ${TECHNIQUE_LIMITS.callouts.max}, drawn from the cues. x and y are percentages of a photograph of someone performing the movement, 0,0 being top left. Put each near the part of the body it refers to, and set side to "left" or "right" depending on which half of the picture is free.`

/** What the model is told about the movement it is drafting. */
export function draftUserPrompt(movementId: string): string | null {
  const movement = MOVEMENTS_BY_ID.get(movementId)
  if (!movement) return null

  return [
    `Movement: ${movement.name}`,
    `Pattern: ${PATTERN_LABELS[movement.pattern]} — ${PATTERN_MEANS[movement.pattern]}`,
    `Equipment: ${movement.equipment.join(', ')}`,
    `Regions it works: ${regionsOf(movement).join(', ')}`,
    movement.aliases?.length ? `Also called: ${movement.aliases.join(', ')}` : null,
    'Draft the technique notes for this movement.',
  ]
    .filter(Boolean)
    .join('\n')
}

export type DraftBody = Omit<TechniqueDraft, 'movementId' | 'reviewedBy' | 'reviewedOn'>

export interface DraftResult {
  draft: DraftBody
  /** Why this draft was rejected, if it was. Never stored when set. */
  rejected?: string
}

/** Pull the JSON out of whatever the model wrapped it in. */
function extractJson(text: string): unknown {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1))
  } catch {
    return null
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * Drop a detail that just repeats its label.
 *
 * The model does this: "Bar on upper traps / Bar on upper traps". On screen
 * it reads as a stutter, and a reviewer shouldn't have to delete it by hand
 * on every movement.
 */
const detailFor = (label: string, detail: string): string | undefined => {
  if (!detail) return undefined
  const same = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '')
  return same(detail) === same(label) ? undefined : detail
}
const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

/**
 * Turn a model response into a draft, or say why not.
 *
 * Runs the real validator with a placeholder name and today's date, so a
 * draft clears exactly the same bar as a human's text — minus the
 * signature, which is the one thing the model cannot supply.
 */
export function parseDraft(movementId: string, text: string, today: string): DraftResult | null {
  if (!MOVEMENTS_BY_ID.has(movementId)) return null

  const raw = extractJson(text) as Record<string, unknown> | null
  if (!raw) return { draft: { steps: [] }, rejected: 'The model did not return usable JSON.' }

  const pairs = (value: unknown, max: number) =>
    (Array.isArray(value) ? value : [])
      .slice(0, max)
      .map(item => {
        const obj = (item ?? {}) as Record<string, unknown>
        const label = str(obj.label)
        const detail = detailFor(label, str(obj.detail))
        return detail ? { label, detail } : { label }
      })
      .filter(p => p.label)

  const draft: DraftBody = {
    steps: (Array.isArray(raw.steps) ? raw.steps : [])
      .slice(0, TECHNIQUE_LIMITS.steps.max)
      .map(str)
      .filter(Boolean),
    cues: pairs(raw.cues, TECHNIQUE_LIMITS.cues.max),
    mistakes: pairs(raw.mistakes, TECHNIQUE_LIMITS.mistakes.max),
    callouts: (Array.isArray(raw.callouts) ? raw.callouts : [])
      .slice(0, TECHNIQUE_LIMITS.callouts.max)
      .map(item => {
        const obj = (item ?? {}) as Record<string, unknown>
        const label = str(obj.label)
        return {
          label,
          detail: detailFor(label, str(obj.detail)),
          // Clamped rather than rejected: a callout a few percent off the
          // edge is a nudge for the reviewer, not a reason to bin the draft.
          x: Math.min(100, Math.max(0, num(obj.x, 50))),
          y: Math.min(100, Math.max(0, num(obj.y, 50))),
          side: obj.side === 'right' ? ('right' as const) : ('left' as const),
        }
      })
      .filter(c => c.label),
  }

  const problem = validateTechnique({
    movementId,
    reviewedBy: 'Draft reviewer',
    reviewedOn: today,
    ...draft,
  })

  if (problem) return { draft, rejected: `The draft broke a rule (${problem}) and was not kept.` }

  return { draft }
}
