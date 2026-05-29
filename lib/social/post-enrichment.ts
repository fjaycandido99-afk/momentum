/**
 * Post enrichment — one Groq call at post-create time produces THREE
 * AI artifacts at once:
 *
 *   1. essence — the single most resonant sentence pulled VERBATIM
 *      from the body (rendered as a pulled quote on the card).
 *   2. themes  — 1–2 single-word themes from a fixed vocabulary,
 *      so chips on the card stay consistent and become filterable.
 *   3. echo    — a related short quote from a real thinker, with
 *      attribution. Surfaces at the bottom of the post as a
 *      "Echoes" companion line.
 *
 * Combining into one call saves cost + latency vs three sequential
 * Groq hits. Returns all fields nullable — any failure on a single
 * field just leaves it null. Best-effort, never blocks the post.
 */

import { createChatCompletion, GROQ_FALLBACK_MODEL } from '@/lib/groq'

export interface PostEnrichment {
  essence: string | null
  themes: string[]
  echo_quote: string | null
  echo_attribution: string | null
  /// META-LESSON — AI's synthesized crystallization of what the post is
  /// REALLY about. Punchline + one-line elaboration. Adds visual variety
  /// + shareable value beyond the raw post text.
  lesson_title: string | null
  lesson_body: string | null
}

const EMPTY: PostEnrichment = {
  essence: null,
  themes: [],
  echo_quote: null,
  echo_attribution: null,
  lesson_title: null,
  lesson_body: null,
}

const THEMES_VOCAB = [
  'gratitude', 'growth', 'doubt', 'accountability', 'courage', 'surrender',
  'clarity', 'grief', 'joy', 'fear', 'purpose', 'stillness',
  'hustle', 'healing', 'discipline', 'identity', 'connection', 'loneliness',
  'wonder', 'patience', 'forgiveness', 'agency',
]

export async function enrichPost(body: string, mindsetId: string | null): Promise<PostEnrichment> {
  const text = body.trim()
  if (text.length < 60) return EMPTY

  const system = `You read short personal journal reflections and return structured insight.

Return ONLY valid JSON with this exact shape:
{
  "essence": "the single most emotionally resonant sentence pulled VERBATIM from the text — must appear character-for-character, no paraphrasing. null if the text is too short or has no clear standout line.",
  "themes": ["1-2 themes from this vocabulary, lowercase: ${THEMES_VOCAB.join(', ')}"],
  "echo_quote": "a short (under 160 chars) related quote from a real thinker, philosopher, writer, athlete, or public figure that genuinely resonates with this reflection. Prefer non-obvious choices over the most-quoted ones. Must be a real quote you're confident is attributed correctly.",
  "echo_attribution": "the name of that thinker",
  "lesson_title": "the crystallized meta-insight underneath the surface story, max 36 chars, no period. Think 'Rest isn't quitting' for someone burned out, or 'Acceptance is the unlock' for someone in conflict. Punchline only.",
  "lesson_body": "one sentence elaboration of the lesson, max 110 chars. Like 'It's strategic recovery.' or 'You can't outrun what you won't face.'"
}

If you can't find a real attributable quote you're sure about, return null for both echo_quote AND echo_attribution. Never invent quotes.

For the lesson: this IS your synthesis (unlike essence, which must be verbatim). Pull the underlying truth, not the surface complaint. If the story is too thin to crystallize, return null for both lesson_title AND lesson_body.`

  const user = `Reflection ${mindsetId ? `(${mindsetId} mindset)` : ''}:\n\n${text.slice(0, 1800)}`

  try {
    const result = await createChatCompletion({
      model: GROQ_FALLBACK_MODEL, // 8b-instant — cheap + fast
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
      temperature: 0.4,
    })
    const raw = (result.choices[0]?.message?.content || '').trim()
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<PostEnrichment>

    const out: PostEnrichment = { ...EMPTY }

    // Essence — must appear in the body (case + whitespace normalized).
    if (typeof parsed.essence === 'string') {
      const candidate = parsed.essence.replace(/^["'""'']+|["'""'']+$/g, '').trim()
      if (candidate.length >= 12 && candidate.length <= 240) {
        const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[''""]/g, '"')
        if (normalize(text).includes(normalize(candidate))) {
          out.essence = candidate
        }
      }
    }

    // Themes — intersect with our fixed vocabulary so we don't accept
    // weird custom words. Cap at 2.
    if (Array.isArray(parsed.themes)) {
      const allowed = new Set(THEMES_VOCAB)
      out.themes = parsed.themes
        .map(t => String(t || '').trim().toLowerCase())
        .filter(t => allowed.has(t))
        .slice(0, 2)
    }

    // Echo — both quote and attribution must exist + be sane lengths.
    if (
      typeof parsed.echo_quote === 'string' &&
      typeof parsed.echo_attribution === 'string'
    ) {
      const q = parsed.echo_quote.replace(/^["'""'']+|["'""'']+$/g, '').trim()
      const a = parsed.echo_attribution.trim()
      if (q.length >= 8 && q.length <= 220 && a.length >= 2 && a.length <= 60) {
        out.echo_quote = q
        out.echo_attribution = a
      }
    }

    // Lesson — both title and body must be present + reasonable.
    if (
      typeof parsed.lesson_title === 'string' &&
      typeof parsed.lesson_body === 'string'
    ) {
      const lt = parsed.lesson_title.replace(/[.!?]+$/g, '').trim()
      const lb = parsed.lesson_body.trim()
      if (lt.length >= 6 && lt.length <= 60 && lb.length >= 10 && lb.length <= 180) {
        out.lesson_title = lt
        out.lesson_body = lb
      }
    }

    return out
  } catch (err) {
    console.warn('[post-enrichment] failed:', err)
    return EMPTY
  }
}
