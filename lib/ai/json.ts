/**
 * Getting an object out of a model that was asked for JSON.
 *
 * `response_format: { type: 'json_object' }` is not the safe choice it looks
 * like on the serving model. Measured in production: the book summary asked
 * for it and got back
 *
 *   400 Failed to validate JSON. Please adjust your prompt.
 *
 * on half its calls — the model is a REASONING model, it emits thinking
 * before it writes, and the provider's validator rejects the result rather
 * than handing over what it did produce. The same error accounts for the
 * failures on the untagged `unknown` endpoint.
 *
 * So: ask for JSON in the prompt, do NOT constrain the format, and parse
 * what comes back tolerantly. A model that wraps its answer in a ```json
 * fence or says "Here you go:" first has still answered; refusing it because
 * of the wrapper is throwing away a good reply.
 *
 * Pure.
 */

/**
 * The first JSON object in a string, or null.
 *
 * Braces are matched by depth rather than by a greedy regex, because a
 * summary that contains a `}` in its text would break a lazy match and a
 * greedy one would swallow trailing prose. Strings are tracked so a brace
 * inside a quoted value does not count, with escapes honoured.
 */
export function firstJsonObject(raw: string): string | null {
  const start = raw.indexOf('{')
  if (start === -1) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]

    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }

    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }

  return null
}

/**
 * Parse a model's reply as an object, tolerating what models actually send.
 *
 * Returns null rather than throwing: every caller has to handle "no usable
 * answer" anyway, and an exception here would turn a bad reply into a 500.
 */
export function parseModelJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null

  // The common shapes, cheapest first.
  const candidates = [raw.trim()]

  // ```json { … } ``` — a fence the prompt never asked for and models add
  // anyway.
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) candidates.push(fenced[1].trim())

  const braced = firstJsonObject(raw)
  if (braced) candidates.push(braced)

  for (const candidate of candidates) {
    if (!candidate.startsWith('{') && !candidate.startsWith('[')) continue
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object') return parsed as T
    } catch {
      // Try the next shape.
    }
  }

  return null
}
