/**
 * What Voxu says about the book somebody is reading, and the rules it keeps.
 *
 * The ask: type a book, get a summary that connects to your era. The value
 * is the second half — a summary of Atomic Habits is a search away, but "you
 * are on day 9 of Discipline Era, and here is the one idea in this book that
 * serves that" is not.
 *
 * Four things this must not become, each of which the validator enforces
 * rather than trusts a prompt to prevent:
 *
 *  1. A REPLACEMENT for the book. A chapter-by-chapter breakdown is a
 *     substitute for reading, which is the opposite of what a reading
 *     practice is for — and it is the version that is a copyright problem.
 *     Short, thematic, in Voxu's own words, no quotes.
 *  2. A CONFIDENT GUESS. Models will describe a book they do not know, and a
 *     plausible summary of the wrong book is worse than no summary. Hence the
 *     `unknown` escape: the model is told to use it and the validator honours
 *     it instead of overriding it.
 *  3. A PRESCRIPTION. "Read 20 pages a night" is the app writing somebody's
 *     practice for them; the minimum is theirs. Same rule as the movement
 *     library's cues.
 *  4. A CLAIM TO HAVE READ IT. Voxu did not read the book, and the reading
 *     sheet already promises "Voxu doesn't grade them, count them or write
 *     them for you."
 *
 * Pure. The model call lives in app/api/books/summary.
 */

/** Voxu did not read the book, and must not imply it. */
const CLAIMS_TO_HAVE_READ =
  /\b(I (have |just )?(read|finished|reread)|when I read|my (copy|favourite part)|I loved|rereading)\b/i

/** A stand-in for the book rather than a pointer to it. */
const CHAPTER_RECAP = /\b(chapter|part|section)\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i

/**
 * The app deciding somebody's dose. Their minimum is their own.
 *
 * Number WORDS count: "two chapters each day" is the same instruction as "2
 * chapters each day", and a digits-only version of this rule caught the
 * first and missed the second. A quantity is still required though — "it
 * takes minutes a day" is a fact about the book, not an instruction.
 */
const PRESCRIPTION =
  /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|an?)\s+(pages?|chapters?|minutes?|mins?|hours?)\s+(a|per|each|every)\s+(day|night|morning|week|session)\b|\bread\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten|an?)\s+(pages?|chapters?)\b/i

/** Borrowed authority. Same ban as the movement cues. */
const EVIDENCE = /\b(studies show|research shows|scientifically|clinically proven|proven to)\b/i

/** Model artefacts that mean the answer was never about the book. */
const NOT_AN_ANSWER = /\b(as an ai|as a language model|I cannot|I'm unable|I do not have access)\b/i

/**
 * Quoted text. Not "one short quote is fine" — none is.
 *
 * A quote is the one thing here that is definitely the author's words rather
 * than Voxu's, and the summary has no need of any. Catching the quote MARKS
 * is enough; the model is told not to quote at all.
 */
const QUOTED = /["“”][^"“”]{25,}["“”]/

const LIMITS = { about: 420, forYourEra: 320, whileYouRead: 220 } as const

export interface BookSummary {
  /** What the book is about, in Voxu's words. */
  about: string
  /** The one idea that serves the era they are in right now. */
  forYourEra: string
  /** Optional: what to watch for while reading it. */
  whileYouRead?: string
}

export interface SummaryDraft {
  /**
   * The model's own escape hatch. True when it does not know the book well
   * enough to say anything true about it — which is a correct answer, not a
   * failure, and is shown to the reader as itself.
   */
  unknown?: boolean
  about?: string
  forYourEra?: string
  whileYouRead?: string
}

export type SummaryError =
  | 'UNKNOWN_BOOK'
  | 'EMPTY'
  | 'TOO_LONG'
  | 'CLAIMS_TO_HAVE_READ'
  | 'CHAPTER_RECAP'
  | 'PRESCRIPTION'
  | 'EVIDENCE'
  | 'QUOTED'
  | 'NOT_AN_ANSWER'

/**
 * Whether this draft may be shown.
 *
 * Returns the reason it may not, or null when it is fine. UNKNOWN_BOOK is a
 * refusal the UI should render honestly ("Voxu doesn't know this one") rather
 * than an error to retry.
 */
export function validateSummary(draft: SummaryDraft): SummaryError | null {
  if (draft.unknown) return 'UNKNOWN_BOOK'

  const about = draft.about?.trim() ?? ''
  const forYourEra = draft.forYourEra?.trim() ?? ''
  const whileYouRead = draft.whileYouRead?.trim() ?? ''

  if (!about || !forYourEra) return 'EMPTY'

  if (
    about.length > LIMITS.about ||
    forYourEra.length > LIMITS.forYourEra ||
    whileYouRead.length > LIMITS.whileYouRead
  ) {
    return 'TOO_LONG'
  }

  const all = [about, forYourEra, whileYouRead].join('\n')

  if (NOT_AN_ANSWER.test(all)) return 'NOT_AN_ANSWER'
  if (CLAIMS_TO_HAVE_READ.test(all)) return 'CLAIMS_TO_HAVE_READ'
  if (CHAPTER_RECAP.test(all)) return 'CHAPTER_RECAP'
  if (PRESCRIPTION.test(all)) return 'PRESCRIPTION'
  if (EVIDENCE.test(all)) return 'EVIDENCE'
  if (QUOTED.test(all)) return 'QUOTED'

  return null
}

/** The validated draft as the thing the UI renders. Call only after validating. */
export function toSummary(draft: SummaryDraft): BookSummary {
  const whileYouRead = draft.whileYouRead?.trim()
  return {
    about: draft.about!.trim(),
    forYourEra: draft.forYourEra!.trim(),
    ...(whileYouRead ? { whileYouRead } : {}),
  }
}

export interface SummaryContext {
  title: string
  author: string
  /** Era title, e.g. "Discipline Era". Absent when they have no era running. */
  eraTitle?: string | null
  /** Day N of the era. */
  eraDay?: number | null
  /** What they said they are trying to change, in their own words. */
  eraIntent?: string | null
}

export const SUMMARY_SYSTEM_PROMPT = `You write one short card about a book for someone who is reading it, inside an app where they have committed to a 30-day era.

Return ONLY JSON:
{"about": "...", "forYourEra": "...", "whileYouRead": "..."}

Or, if you do not know this exact book well enough to say something TRUE about it:
{"unknown": true}

Use the unknown escape freely. A plausible summary of the wrong book is the worst thing you can return here, and returning it will be caught. If the title is misspelled, obscure, or could be several different books, say unknown.

about — what the book is actually about, 2 to 3 sentences, in your own words.
forYourEra — the ONE idea in this book that serves what this person is working on right now. Name the era. 1 to 2 sentences.
whileYouRead — optional, one sentence: what to watch for as they read. Omit if you have nothing real to add.

Rules:
- Never quote the book. Not one line.
- Never break it down by chapter or section. This points at the book; it does not replace it.
- Never tell them how much to read. Their minimum is their own.
- Never claim to have read it, or to have a favourite part.
- No "studies show", no "proven to".
- Plain, direct, warm. No hype, no exclamation marks.`

export function buildSummaryPrompt(ctx: SummaryContext): string {
  const lines = [`Book: ${ctx.title}`, `Author: ${ctx.author}`]
  if (ctx.eraTitle) {
    lines.push(
      ctx.eraDay ? `Their era: ${ctx.eraTitle}, day ${ctx.eraDay} of 30` : `Their era: ${ctx.eraTitle}`,
    )
  } else {
    // No era running. forYourEra still has a job — what this book serves in
    // general — but it must not name an era that does not exist.
    lines.push('Their era: none right now. Do not invent one; speak to what the book is good for.')
  }
  if (ctx.eraIntent) lines.push(`What they said they are trying to change: "${ctx.eraIntent}"`)
  return lines.join('\n')
}
