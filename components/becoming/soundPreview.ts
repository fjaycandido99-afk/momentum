// The Guided Audio demo plays real recordings (phoneScreens.ts AUDIO, in that
// order): two guided-session narrators saying the same moment in their own
// tone (/api/voice/tone-preview) and Voxu Voice answering a journal entry
// (/api/voice/voxu-preview). Each is voiced once on the server and cached, so
// playing them costs nothing; the clip is fetched on first play and kept.

const SOURCES = ['/api/voice/tone-preview?tone=calm', '/api/voice/tone-preview?tone=direct', '/api/voice/voxu-preview?n=0']

const loaded = new Map<number, Promise<string | null>>()
let current: HTMLAudioElement | null = null
/** Which clip is playing; a newer play or stop makes older ones give up. */
let token = 0

function load(i: number) {
  let p = loaded.get(i)
  if (!p) {
    p = fetch(SOURCES[i])
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { audio?: string } | null) => (j?.audio ? `data:audio/mpeg;base64,${j.audio}` : null))
      .catch(() => null)
    loaded.set(i, p)
    // A failure shouldn't stick: let the next tap try again.
    p.then((src) => {
      if (!src) loaded.delete(i)
    })
  }
  return p
}

export function stopSound() {
  token++
  current?.pause()
  current = null
}

/** Play clip i; onEnd runs when it finishes (or can't play). */
export function playSound(i: number, onEnd?: () => void) {
  stopSound()
  const mine = token
  load(i).then((src) => {
    if (mine !== token) return
    if (!src) {
      onEnd?.()
      return
    }
    const a = new Audio(src)
    current = a
    a.onended = () => {
      if (mine === token) {
        current = null
        onEnd?.()
      }
    }
    a.play().catch(() => onEnd?.())
  })
}
