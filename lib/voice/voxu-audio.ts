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
/** chat-voice's tighter cap for 'explain' lines — longer ones would be refused. */
export const VOXU_EXPLAIN_MAX_CHARS = 280

// ── Who's speaking. Every line fetched here announces itself when it plays
// and when it stops, so the orb's ring (components/voice-guide/SpeakingRing)
// can come alive wherever Voxu is talking, without each player wiring it.
export const VOXU_SPEAKING_EVENT = 'voxu:speaking'
let speaking: HTMLAudioElement | null = null
export function currentVoxuAudio(): HTMLAudioElement | null { return speaking }
function announce(next: HTMLAudioElement | null) {
  if (speaking === next) return
  speaking = next
  try { window.dispatchEvent(new Event(VOXU_SPEAKING_EVENT)) } catch { /* no window */ }
}
function track(a: HTMLAudioElement): HTMLAudioElement {
  a.addEventListener('playing', () => announce(a))
  const quiet = () => { if (speaking === a) announce(null) }
  a.addEventListener('pause', quiet)
  a.addEventListener('ended', quiet)
  a.addEventListener('error', quiet)
  return a
}

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

/**
 * Fetch a line in Voxu's voice, ready to play. Never throws.
 *
 * `purpose: 'explain'` — Voxu explaining the app (the orb's walkthroughs).
 * Free, on its own meter; never spends a conversation's spoken reply.
 *
 * `purpose: 'onboarding'` — the first-launch opener: free for everyone,
 * signed up or not (the server checks the line is the opener's own; `sig`
 * carries first-moment's signature on its reply).
 */
export async function fetchVoxuAudio(text: string, purpose: 'explain' | 'talk' | 'onboarding' = 'talk', sig?: string | null): Promise<VoxuAudioResult> {
  try {
    const res = await fetch('/api/ai/chat-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Opener lines go as written — the server matches them exactly.
        text: purpose === 'onboarding' ? text : purpose === 'explain' ? clipForVoice(text, VOXU_EXPLAIN_MAX_CHARS - 10) : clipForVoice(text),
        purpose,
        ...(sig ? { sig } : {}),
      }),
    })
    if (res.status === 403) return { ok: false, reason: 'locked' }
    if (res.status === 401) return { ok: false, reason: 'signin' }
    if (!res.ok) return { ok: false, reason: 'unavailable' }
    const data = await res.json()
    if (!data?.audio) return { ok: false, reason: 'unavailable' }
    return { ok: true, audio: track(new Audio(`data:audio/mpeg;base64,${data.audio}`)) }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
