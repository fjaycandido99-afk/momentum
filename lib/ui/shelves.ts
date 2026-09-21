/**
 * Which home shelves someone wants to see.
 *
 * "Explore" is the home screen, and it carries every kind of content Voxu
 * has: guided audio, soundscapes, motivation, music, a wellness widget, a
 * wisdom card, an achievement shelf. All of it is real content, so none of
 * it should be deleted — but somebody who never plays music should not
 * scroll past music for thirty days.
 *
 * So: hide, not remove. Everything can be brought back from the same sheet
 * it was hidden in, the hidden ones are listed there so nothing is ever
 * quietly gone, and the era loop, today's practice and the day's audio can't
 * be hidden at all — that is the app, not a shelf.
 */

const KEY = 'voxu.home.hidden-shelves'

/** The shelves a person may turn off. Ids match the adaptive section ids. */
export interface Shelf {
  id: string
  label: string
  /** One line in the sheet, so the choice is informed. */
  detail: string
}

export const SHELVES: Shelf[] = [
  { id: 'guided', label: 'Guided audio', detail: 'Breathing, body scan, sleep and the rest.' },
  { id: 'soundscapes', label: 'Soundscapes', detail: 'Rain, waves, fire — sound to work or sleep to.' },
  { id: 'motivation', label: 'Motivation', detail: 'Short talks by topic.' },
  { id: 'music', label: 'Music', detail: 'Lo-fi, piano, ambient by genre.' },
  { id: 'wisdom', label: 'Wellness check', detail: 'Your mood, streak and modules at a glance.' },
  { id: 'achievements', label: 'Achievements', detail: 'What you have earned, and what is next.' },
  { id: 'quotes', label: 'Daily wisdom', detail: 'A quote and a question, chosen for your mindset.' },
]

export const SHELF_IDS = new Set(SHELVES.map(s => s.id))

/** Pure: read a stored list, ignoring anything unrecognisable. */
export function parseHidden(raw: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.filter((id): id is string => typeof id === 'string' && SHELF_IDS.has(id)))]
  } catch {
    // A corrupt value must not hide half the app.
    return []
  }
}

/** Pure: add or remove one id. */
export function toggleShelf(hidden: string[], id: string): string[] {
  if (!SHELF_IDS.has(id)) return hidden
  return hidden.includes(id) ? hidden.filter(x => x !== id) : [...hidden, id]
}

export function readHidden(): string[] {
  try {
    return parseHidden(localStorage.getItem(KEY))
  } catch {
    return []
  }
}

export function writeHidden(ids: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.filter(id => SHELF_IDS.has(id))))
  } catch {
    // The choice still applies to this view.
  }
}
