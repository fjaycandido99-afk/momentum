/**
 * Voxu speaking — the one client path for any line said in Voxu's voice.
 *
 * Goes through /api/ai/chat-voice, which is signed-in, cached by text,
 * metered per user (free 1 new line a day, premium 30, with premium's
 * reserve) and capped at 600 characters, and speaks in VOXU_VOICE_ID. The
 * old /api/tts path had none of that — one user could spend the month's
 * shared ElevenLabs allowance — and spoke in the old per-mindset voices.
 */

/** chat-voice's cap. */
export const VOXU_MAX_CHARS = 600

/** Cut to the cap at a sentence end where one is close, else a word. */
export function clipForVoice(text: string, max = VOXU_MAX_CHARS - 10): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '))
  if (end > max * 0.5) return cut.slice(0, end + 1)
  return `${cut.slice(0, cut.lastIndexOf(' ')).trimEnd()}…`
}

export type VoxuAudioResult =
  | { ok: true; audio: HTMLAudioElement }
  | { ok: false; reason: 'locked' | 'signin' | 'unavailable' }

/** Fetch a line in Voxu's voice, ready to play. Never throws. */
export async function fetchVoxuAudio(text: string): Promise<VoxuAudioResult> {
  try {
    const res = await fetch('/api/ai/chat-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: clipForVoice(text) }),
    })
    if (res.status === 403) return { ok: false, reason: 'locked' }
    if (res.status === 401) return { ok: false, reason: 'signin' }
    if (!res.ok) return { ok: false, reason: 'unavailable' }
    const data = await res.json()
    if (!data?.audio) return { ok: false, reason: 'unavailable' }
    return { ok: true, audio: new Audio(`data:audio/mpeg;base64,${data.audio}`) }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
