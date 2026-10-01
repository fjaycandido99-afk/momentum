import type { EraOutcome } from './keep'

/**
 * "Hear your era close" — what Voxu says when an era ends.
 *
 * A FIXED script filled with their real counts, never written by a model:
 * no promise text goes anywhere, nothing is guessed, and the same era
 * always produces the same words — so /api/ai/chat-voice (metered, cached
 * by text) generates it once and every replay after that is free.
 *
 * No celebration a bad month didn't earn (same rule as OUTCOME_LINE), and
 * what they carried forward is named in their own words.
 *
 * Pure.
 */

export interface EraCloseInput {
  /** "Locked In era" (eraName). */
  eraName: string
  lengthDays: number
  kept: number
  answered: number
  outcome: EraOutcome
  /** Disciplines carried forward from it, their own labels. */
  stayed: string[]
}

const SPOKEN_OUTCOME: Record<EraOutcome, string> = {
  strong: 'You showed up, again and again.',
  mixed: 'Some of it held. Some of it didn’t.',
  poor: 'It didn’t go the way you planned. That’s allowed.',
}

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function eraCloseScript(input: EraCloseInput): string {
  const lines = [`${input.lengthDays} days of your ${input.eraName} are finished.`]

  lines.push(
    input.answered > 0
      ? `You kept ${input.kept} of ${input.answered} promises.`
      : 'You didn’t mark your promises, so there’s no count to give — and that’s part of the record too.',
  )
  lines.push(SPOKEN_OUTCOME[input.outcome])

  const stayed = input.stayed.filter(s => s.trim())
  if (stayed.length === 0) {
    lines.push('Nothing has to come with you. The era ends here.')
  } else {
    lines.push(`You chose to carry forward ${list(stayed)}.`)
    lines.push(stayed.length === 1 ? 'The era ends here. That doesn’t.' : 'The era ends here. Those don’t.')
  }
  return lines.join(' ')
}
