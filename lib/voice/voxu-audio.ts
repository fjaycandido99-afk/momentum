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
  // Always announce a start: a reused player (iPhone Safari) plays many
  // lines through ONE element, and each new line needs its own levels.
  if (speaking === next && next === null) return
  speaking = next
  try { window.dispatchEvent(new Event(VOXU_SPEAKING_EVENT)) } catch { /* no window */ }
}
/** Announce plays/stops of an element the caller owns (a reused player). */
export function trackVoxuAudio(a: HTMLAudioElement): HTMLAudioElement { return track(a) }
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

/**
 * iPhone Safari only lets a page play sound from an element a TAP started.
 * Each line used to get a brand-new Audio, so after the first only the
 * first line ever played. A VoxuPlayer is one element: unlock() it inside
 * the first tap (a silent blip), then play every line through it.
 */
const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
export interface VoxuPlayer {
  el: HTMLAudioElement
  unlock: () => void
  /** Play a fetched line; resolves when it ends ('played'), or at once. */
  play: (src: string) => Promise<'played' | 'blocked' | 'quiet'>
}
export function createVoxuPlayer(): VoxuPlayer {
  const el = track(new Audio())
  el.preload = 'auto'
  let unlocked = false
  return {
    el,
    unlock() {
      if (unlocked) return
      unlocked = true
      try {
        el.src = SILENCE
        const p = el.play()
        // Only stop the blip itself — never a real line that started meanwhile.
        if (p) p.then(() => { if (el.src === SILENCE) el.pause() }).catch(() => { unlocked = false })
      } catch { unlocked = false }
    },
    play(src) {
      return new Promise(done => {
        el.onended = () => done('played')
        el.onerror = () => done('quiet')
        el.src = src
        el.play().catch(() => done('blocked'))
      })
    },
  }
}

/**
 * The app-wide player every Voxu line goes through (opener, walkthrough,
 * Talk), unlocked by the first tap anywhere — so in an iPhone browser the
 * second line plays as surely as the first. The installed app allows sound
 * without a tap, so there this simply reuses one element.
 */
let shared: VoxuPlayer | null = null
export function sharedVoxuPlayer(): VoxuPlayer {
  return (shared ??= createVoxuPlayer())
}
let unlockInstalled = false
export function installVoxuUnlock(): void {
  if (unlockInstalled || typeof document === 'undefined') return
  unlockInstalled = true
  const once = () => {
    sharedVoxuPlayer().unlock()
    document.removeEventListener('pointerdown', once, true)
    document.removeEventListener('keydown', once, true)
  }
  document.addEventListener('pointerdown', once, true)
  document.addEventListener('keydown', once, true)
}
