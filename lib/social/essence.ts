/**
 * Essence extractor — pulls the single most resonant sentence from a
 * community post so the card can render it as a large pulled quote
 * above the rest of the body.
 *
 * Cheap: ~one Groq llama-3.1-8b call per post create, ~200ms,
 * negligible cost. Best-effort: any failure returns null and the
 * post still saves without an essence (UI just renders the body
 * as usual).
 *
 * Heuristic skip: posts under 120 chars (one short line / aphorism)
 * already ARE their own essence — extracting one would duplicate
 * the body and look silly.
 */

import { createChatCompletion, GROQ_FALLBACK_MODEL } from '@/lib/groq'

const MIN_BODY_FOR_ESSENCE = 120

export async function extractEssence(body: string): Promise<string | null> {
  const text = body.trim()
  if (text.length < MIN_BODY_FOR_ESSENCE) return null

  try {
    const result = await createChatCompletion({
      model: GROQ_FALLBACK_MODEL, // 8b-instant — cheap + fast for this
      messages: [
        {
          role: 'system',
          content:
            'You read short personal journal reflections and pick the single most emotionally resonant sentence — the line a stranger would quote back. ' +
            'Return ONLY that sentence, verbatim, no quotes, no commentary, no preface. ' +
            'It must be a sentence that already appears in the text. ' +
            'Pick the line that lands hardest emotionally, not the longest or first one.',
        },
        { role: 'user', content: text.slice(0, 1800) },
      ],
      max_tokens: 120,
      temperature: 0.3,
    })
    const raw = (result.choices[0]?.message?.content || '').trim()
    if (!raw) return null
    // Strip surrounding quotes the model sometimes adds despite instructions.
    const cleaned = raw.replace(/^["'""'']+|["'""'']+$/g, '').trim()
    if (cleaned.length < 12 || cleaned.length > 240) return null
    // Sanity: only accept if it actually appears in the body (case-insensitive,
    // whitespace-normalized) — otherwise the model paraphrased instead of
    // extracting.
    const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[''""]/g, '"')
    if (!normalize(text).includes(normalize(cleaned))) return null
    return cleaned
  } catch (err) {
    console.warn('[essence] extraction failed:', err)
    return null
  }
}
