import { prisma } from '@/lib/prisma'

/**
 * What Voxu calls someone.
 *
 * One place decides it, because it is said in a lot of voices — the coach's
 * morning reply, the wake-up call, journal reflections, someone's circle —
 * and being called the wrong thing by all of them at once is worse than
 * being called nothing.
 *
 * Order: the name they chose, then the FIRST WORD of the name the auth
 * provider gave us, then nothing. Never the full legal name, and never an
 * email — "Good morning, fjay.candido99@gmail.com" is how an app announces
 * that nobody is home.
 */

/** Longest name we'll say. Long enough for real names, short enough to speak. */
export const NAME_MAX = 24

/**
 * Drops characters that are invisible or unspeakable: control codes,
 * zero-width joiners, direction marks, separators. A loop over code points
 * rather than a regex class, so a name made entirely of invisible
 * characters comes out empty instead of looking blank but passing as text.
 */
function stripUnspeakable(value: string): string {
  let out = ''
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0
    if (code < 32 || code === 127) continue // control characters
    if (code >= 0x200b && code <= 0x200f) continue // zero-width + direction marks
    if (code === 0x2028 || code === 0x2029) continue // line / paragraph separators
    if (code === 0xfeff) continue // byte-order mark
    out += ch
  }
  return out
}

/**
 * Cleans a name someone typed. Returns null for anything that isn't a name
 * — empty, an email, a link — so a bad value is stored as "no name" rather
 * than said out loud.
 */
export function cleanPreferredName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const collapsed = stripUnspeakable(value).replace(/\s+/g, ' ').trim()
  if (!collapsed) return null
  // An email or a URL here is someone testing the field, not a name.
  if (/[@<>{}\\/|]/.test(collapsed) || /https?:/i.test(collapsed)) return null
  return collapsed.slice(0, NAME_MAX)
}

/** The display name from a user row, without a database round trip. */
export function displayNameFrom(
  user: { preferred_name?: string | null; name?: string | null } | null | undefined,
): string | null {
  const chosen = cleanPreferredName(user?.preferred_name)
  if (chosen) return chosen
  const first = user?.name?.trim().split(/\s+/)[0]
  return cleanPreferredName(first)
}

/** The display name for a user id, or null if they have none worth saying. */
export async function getDisplayName(userId: string): Promise<string | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferred_name: true, name: true },
    })
    return displayNameFrom(user)
  } catch {
    return null
  }
}
