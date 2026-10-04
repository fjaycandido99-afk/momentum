import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Signs a line the opener's own server route wrote (first-moment's reply),
 * so the voice route can speak it to someone without an account — and only
 * that text. Without this, an unsigned-in voice endpoint would be free
 * text-to-speech for anything. Server only.
 */
function secret(): string | null {
  return process.env.VOICE_SIGNING_SECRET || process.env.CRON_SECRET || null
}

export function signVoiceLine(text: string): string | null {
  const s = secret()
  return s ? createHmac('sha256', s).update(`opener:${text}`).digest('hex').slice(0, 32) : null
}

export function verifyVoiceLine(text: string, sig: unknown): boolean {
  if (typeof sig !== 'string' || sig.length !== 32) return false
  const expected = signVoiceLine(text)
  if (!expected) return false
  return timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
}
