import type { PatternReport } from '@/lib/patterns/rules'
import type { ExperimentWire } from '@/lib/patterns/experiments-server'

/**
 * What the coach may know about their LAWS and experiments (/patterns).
 *
 * Only solid patterns — the ones that passed the chance test — and only
 * their headlines, which already carry both counts. "Still watching"
 * patterns are left out: the coach saying a coin flip out loud would make
 * it sound settled. Experiments: the running one (where they are in it),
 * and finished ones that came to a verdict.
 *
 * Counts and their own record; never their words.
 *
 * Pure.
 */

export const LAWS_GUIDANCE = [
  'THEIR LAWS — patterns in their own record that passed a chance test, with the counts already worked out.',
  'Quote one only when it bears on what they are talking about, and quote the numbers exactly as written.',
  'A law is what tends to happen together in their record, not proof of why: say "your record shows",',
  'never "this causes" or "you always". Never turn one into a label about who they are. One law per',
  'reply at most, and not in every reply.',
  'If an experiment is running, you may ask how it is going or mention today\'s part — once in a',
  'conversation, not every message. Report a finished one\'s result as written: "promising" is not "proven".',
].join('\n')

/** How many finished experiments to mention — the latest ones. */
export const FINISHED_SHOWN = 2

export function lawsLines(
  report: Pick<PatternReport, 'patterns'> | null,
  experiments: { active: ExperimentWire | null; finished: ExperimentWire[] } | null,
): string[] {
  const lines: string[] = []

  for (const p of report?.patterns ?? []) {
    if (p.strength === 'solid') lines.push(`Law: ${p.headline}`)
  }

  const active = experiments?.active
  if (active && active.day) {
    // Only ever 'done today': this block is cached for minutes, and a stale
    // 'not done yet' would have the coach nudge someone who already did it.
    const done = active.followedToday ? ', done today' : ''
    lines.push(`Running a 7-day experiment — ${active.title} (${active.ask}): day ${active.day} of 7${done}.`)
  }

  const finished = (experiments?.finished ?? [])
    .filter(f => f.result && f.result.verdict !== 'not_enough')
    .slice(0, FINISHED_SHOWN)
  for (const f of finished) lines.push(`Finished experiment — ${f.title}: ${f.result!.line}`)

  return lines
}

export function lawsSection(
  report: Pick<PatternReport, 'patterns'> | null,
  experiments: { active: ExperimentWire | null; finished: ExperimentWire[] } | null,
): string | null {
  const lines = lawsLines(report, experiments)
  return lines.length ? `${LAWS_GUIDANCE}\n\n${lines.join('\n')}` : null
}
