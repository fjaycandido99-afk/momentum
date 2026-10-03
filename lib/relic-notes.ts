/**
 * A relic's memory note — one line, theirs, on a coin they earned ("this was
 * the month reading stuck"). The same shape as the era reflection: optional,
 * never generated, never suggested from their promises or journal.
 *
 * Private. It shows to them only: not in circles, not on a share card, not
 * in any analytics. It IS in their data export.
 *
 * Pure.
 */

export const NOTE_MAX = 140

/** Trimmed to one line and the cap; empty means none (clears it). */
export function cleanRelicNote(text: unknown): string | null {
  if (typeof text !== 'string') return null
  const one = text.replace(/\s+/g, ' ').trim().slice(0, NOTE_MAX).trim()
  return one || null
}
