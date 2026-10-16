import { sculpt } from './store'

// A short sound made in the browser for the Guided Audio demo (Web Audio, no
// files): a soft drone for "Guided", rain-like filtered noise for
// "Soundscape", slow breathing noise for "Sleep". It is an example of the
// kind of audio, not a Voxu recording, and it says so on the page. Its
// loudness drives the headphones (sculpt.audio).

let ctx: AudioContext | null = null
let stopCurrent: (() => void) | null = null
let raf = 0

function noise(c: AudioContext, seconds = 4) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate)
  const d = buf.getChannelData(0)
  // Brown noise: soft and low.
  let last = 0
  for (let i = 0; i < d.length; i++) {
    const w = Math.random() * 2 - 1
    last = (last + 0.02 * w) / 1.02
    d[i] = last * 3.2
  }
  const src = c.createBufferSource()
  src.buffer = buf
  src.loop = true
  return src
}

export function stopSound() {
  stopCurrent?.()
  stopCurrent = null
  cancelAnimationFrame(raf)
  sculpt.audio = 0
}

/** Play example sound `kind` (0 guided, 1 soundscape, 2 sleep). */
export function playSound(kind: number) {
  stopSound()
  const C = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext) as typeof AudioContext
  ctx = ctx ?? new C()
  const c = ctx
  void c.resume()
  const out = c.createGain()
  out.gain.value = 0
  out.gain.linearRampToValueAtTime(0.5, c.currentTime + 1.2)
  const meter = c.createAnalyser()
  meter.fftSize = 256
  out.connect(meter)
  meter.connect(c.destination)
  const nodes: AudioScheduledSourceNode[] = []

  if (kind === 0) {
    // A warm two-note drone, breathing slowly.
    for (const [f, g] of [
      [110, 0.25],
      [165, 0.16],
      [220, 0.06],
    ]) {
      const o = c.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const og = c.createGain()
      og.gain.value = g
      o.connect(og).connect(out)
      nodes.push(o)
    }
    const lfo = c.createOscillator()
    lfo.frequency.value = 0.18
    const lg = c.createGain()
    lg.gain.value = 0.15
    lfo.connect(lg).connect(out.gain)
    nodes.push(lfo)
  } else {
    const n = noise(c)
    const filter = c.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = kind === 1 ? 1400 : 420
    n.connect(filter).connect(out)
    nodes.push(n)
    if (kind === 2) {
      // Slow breathing: in for four, out for six.
      const lfo = c.createOscillator()
      lfo.frequency.value = 0.1
      const lg = c.createGain()
      lg.gain.value = 0.35
      lfo.connect(lg).connect(out.gain)
      nodes.push(lfo)
    }
  }
  nodes.forEach((s) => s.start())

  const data = new Uint8Array(meter.frequencyBinCount)
  const tick = () => {
    meter.getByteTimeDomainData(data)
    let peak = 0
    for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
    // Never quite still while a sound plays (some browsers report silence to the meter).
    sculpt.audio = Math.max(0.18, Math.min(1, peak / 40))
    raf = requestAnimationFrame(tick)
  }
  tick()

  stopCurrent = () => {
    const t = c.currentTime
    out.gain.cancelScheduledValues(t)
    out.gain.setValueAtTime(out.gain.value, t)
    out.gain.linearRampToValueAtTime(0, t + 0.4)
    nodes.forEach((s) => s.stop(t + 0.45))
  }
}
