/**
 * What listening goes on the record, and what it counts for.
 *
 *   guide       a FINISHED guided session counts as proof for its day —
 *               like a mindset exercise, it is a thing deliberately done.
 *   music,      long and often in the background: kept on the day's record
 *   motivation  as context ("52 min of focus music") once a sitting reaches
 *               MIN_CONTEXT_SECONDS, but never what makes a day count.
 *               Having lo-fi on while you work is not keeping something.
 *
 * Pure.
 */

export const AUDIO_KINDS = ['guide', 'music', 'motivation'] as const
export type AudioKind = (typeof AUDIO_KINDS)[number]

/** One sitting of music or motivation must reach this to be recorded. */
export const MIN_CONTEXT_SECONDS = 10 * 60

export interface AudioSessionInput {
  kind: AudioKind
  itemId: string
  title: string
  seconds: number
  completed: boolean
}

/** Validated input, or null when it isn't worth recording. */
export function cleanAudioSession(raw: unknown): AudioSessionInput | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const kind = r.kind
  if (typeof kind !== 'string' || !(AUDIO_KINDS as readonly string[]).includes(kind)) return null
  const itemId = typeof r.itemId === 'string' ? r.itemId.trim().slice(0, 80) : ''
  const title = typeof r.title === 'string' ? r.title.replace(/\s+/g, ' ').trim().slice(0, 120) : ''
  const seconds = typeof r.seconds === 'number' && Number.isFinite(r.seconds) ? Math.round(r.seconds) : 0
  const completed = r.completed === true
  if (!itemId || !title) return null
  // A day has 86,400 seconds; anything beyond one sitting of that is noise.
  if (seconds < 0 || seconds > 86_400) return null
  const input = { kind: kind as AudioKind, itemId, title, seconds, completed }
  return shouldRecord(input) ? input : null
}

export function shouldRecord(s: Pick<AudioSessionInput, 'kind' | 'seconds' | 'completed'>): boolean {
  if (s.kind === 'guide') return s.completed
  return s.seconds >= MIN_CONTEXT_SECONDS
}

/** Does this session make its day count on Proof? Only a finished guide. */
export function countsAsProof(s: { kind: string; completed: boolean }): boolean {
  return s.kind === 'guide' && s.completed
}

/** "Breathing · finished", "52 min of Lo-Fi", "Focus motivation · 18 min". */
export function audioLine(s: { kind: string; title: string; seconds: number; completed: boolean }): string {
  const min = Math.max(1, Math.round(s.seconds / 60))
  if (s.kind === 'guide') return `${s.title} · finished`
  if (s.kind === 'music') return `${min} min of ${s.title}`
  return `${s.title} · ${min} min`
}
