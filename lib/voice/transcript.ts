/**
 * A guide's transcript, for reading along or instead of listening.
 *
 * The text is the exact script the audio was generated from (the voice
 * library is keyed by script index — app/api/daily-guide/voices), so this
 * is a true transcript, not a summary. Scripts are one long block with
 * "..." for pauses; this only breaks them into short paragraphs so the
 * words are readable on a phone. Nothing is reworded.
 *
 * Pure.
 */

/** Sentences per paragraph. */
export const SENTENCES_PER_PARAGRAPH = 3

export function transcriptParagraphs(text: string | null | undefined): string[] {
  if (!text?.trim()) return []
  const out: string[] = []
  for (const block of text.split(/\n\s*\n/)) {
    const clean = block.replace(/\s+/g, ' ').trim()
    if (!clean) continue
    // A sentence ends at . ? ! (not a "..." pause) followed by a capital.
    const sentences = clean.split(/(?<=[^.][.?!])\s+(?=[A-Z"“])/)
    for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
      out.push(sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(' '))
    }
  }
  return out
}
