import type { Section } from './store'

// The app screens for the 3D phone, drawn onto a canvas (so they sit
// exactly on the glass and stay crisp): era picker, morning promise, night
// check-in, the record. They mirror the app's own UI (monochrome, Cormorant
// headings, white pill buttons) with example data only.

export const SCREEN_W = 936 // 2x of a 468px-wide screen
export const SCREEN_H = 2040

const css = (v: string, fallback: string) => {
  try {
    const s = getComputedStyle(document.body).getPropertyValue(v).trim()
    return s || fallback
  } catch {
    return fallback
  }
}

function rr(x: CanvasRenderingContext2D, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath()
  x.roundRect(px, py, w, h, r)
}
function wrap(x: CanvasRenderingContext2D, text: string, px: number, py: number, maxW: number, lh: number) {
  let line = ''
  let y = py
  for (const word of text.split(' ')) {
    const t = line ? `${line} ${word}` : word
    if (x.measureText(t).width > maxW && line) {
      x.fillText(line, px, y)
      line = word
      y += lh
    } else line = t
  }
  if (line) x.fillText(line, px, y)
  return y + lh
}

export function drawScreen(c: HTMLCanvasElement, section: Section) {
  const x = c.getContext('2d')!
  const W = SCREEN_W
  const H = SCREEN_H
  const serif = css('--font-cormorant', 'Georgia') + ', Georgia, serif'
  const sans = 'Inter, system-ui, sans-serif'
  const P = 64 // side padding
  // Background: the app's night gradient.
  const bg = x.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#0b0f1c')
  bg.addColorStop(1, '#040509')
  x.fillStyle = bg
  x.fillRect(0, 0, W, H)
  // Status bar.
  x.fillStyle = 'rgba(255,255,255,0.9)'
  x.font = `600 34px ${sans}`
  x.fillText('9:41', P, 84)
  rr(x, W - P - 64, 60, 64, 30, 9)
  x.fill()

  const eyebrow = (t: string, y: number) => {
    x.fillStyle = 'rgba(255,255,255,0.55)'
    x.font = `600 24px ${sans}`
    x.letterSpacing = '6px'
    x.fillText(t.toUpperCase(), P, y)
    x.letterSpacing = '0px'
  }
  const card = (y: number, h: number) => {
    x.fillStyle = 'rgba(255,255,255,0.06)'
    rr(x, P - 16, y, W - 2 * (P - 16), h, 40)
    x.fill()
    x.strokeStyle = 'rgba(255,255,255,0.14)'
    x.lineWidth = 2
    x.stroke()
  }
  const pill = (px: number, y: number, w: number, h: number, label: string, solid: boolean) => {
    x.fillStyle = solid ? '#ffffff' : 'rgba(255,255,255,0.06)'
    rr(x, px, y, w, h, 26)
    x.fill()
    if (!solid) {
      x.strokeStyle = 'rgba(255,255,255,0.18)'
      x.lineWidth = 2
      x.stroke()
    }
    x.fillStyle = solid ? '#000' : 'rgba(255,255,255,0.85)'
    x.font = `600 30px ${sans}`
    x.textAlign = 'center'
    x.fillText(label, px + w / 2, y + h / 2 + 11)
    x.textAlign = 'left'
  }

  if (section === 'potential') {
    x.fillStyle = 'rgba(255,255,255,0.55)'
    x.font = `400 28px ${sans}`
    x.fillText('Your Era · 30 days. One promise a day.', P, 200)
    x.fillStyle = '#fff'
    x.font = `500 52px ${sans}`
    x.fillText('Who are you becoming?', P, 290)
    x.fillStyle = 'rgba(255,255,255,0.55)'
    x.font = `400 28px ${sans}`
    x.fillText('Pick one for the next 30 days.', P, 340)
    const eras: [string, string][] = [
      ['LOCKED IN', 'Stop drifting. Do the work that matters.'],
      ['DISCIPLINE ERA', "Do it when you don't feel like it."],
      ['GYM ARC', 'Show up for your body, every day.'],
      ['STOIC MODE', 'Control what you can. Let go of the rest.'],
    ]
    eras.forEach(([t, g], i) => {
      const y = 400 + i * 270
      x.fillStyle = '#000'
      rr(x, P - 16, y, W - 2 * (P - 16), 240, 36)
      x.fill()
      x.strokeStyle = i === 2 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.14)'
      x.lineWidth = i === 2 ? 4 : 2
      x.stroke()
      x.fillStyle = '#fff'
      x.font = `600 54px ${serif}`
      x.fillText(t, P + 16, y + 140)
      x.fillStyle = 'rgba(255,255,255,0.65)'
      x.font = `400 26px ${sans}`
      x.fillText(g, P + 16, y + 192)
    })
    pill(P - 16, H - 240, W - 2 * (P - 16), 110, 'Begin Gym Arc', true)
  } else if (section === 'intention') {
    eyebrow('Current era', 200)
    x.fillStyle = '#fff'
    x.font = `600 92px ${serif}`
    x.fillText('GYM ARC', P, 300)
    x.fillStyle = 'rgba(255,255,255,0.55)'
    x.font = `400 28px ${sans}`
    x.fillText('Chapter II · Day 12 / 30', P, 350)
    card(420, 560)
    eyebrow("Today's promise", 500)
    x.fillStyle = '#fff'
    x.font = `600 56px ${serif}`
    wrap(x, 'Read for 15 minutes before bed.', P + 16, 590, W - 2 * P - 32, 66)
    x.fillStyle = 'rgba(255,255,255,0.55)'
    x.font = `400 26px ${sans}`
    x.fillText('How sure are you?', P + 16, 790)
    for (let n = 1; n <= 5; n++) {
      const px = P + 16 + (n - 1) * 100
      x.fillStyle = n === 4 ? '#fff' : 'rgba(255,255,255,0.08)'
      rr(x, px, 820, 80, 80, 20)
      x.fill()
      x.fillStyle = n === 4 ? '#000' : 'rgba(255,255,255,0.75)'
      x.font = `600 30px ${sans}`
      x.textAlign = 'center'
      x.fillText(String(n), px + 40, 872)
      x.textAlign = 'left'
    }
    card(1030, 470)
    eyebrow('Your coach', 1110)
    x.fillStyle = 'rgba(255,255,255,0.25)'
    x.fillRect(P + 16, 1150, 5, 300)
    x.fillStyle = 'rgba(255,255,255,0.82)'
    x.font = `400 32px ${sans}`
    wrap(x, 'Fifteen minutes is small enough to keep. On day one you said you wanted your evenings back. This is how.', P + 50, 1190, W - 2 * P - 70, 50)
  } else if (section === 'discipline') {
    eyebrow('Day 12 / 30', 200)
    card(260, 620)
    x.fillStyle = 'rgba(255,255,255,0.6)'
    x.font = `400 30px ${sans}`
    x.fillText('Tonight — did you keep it?', P + 16, 350)
    x.fillStyle = '#fff'
    x.font = `600 56px ${serif}`
    wrap(x, 'Read for 15 minutes before bed.', P + 16, 440, W - 2 * P - 32, 66)
    const bw = (W - 2 * P - 32 - 24) / 2
    pill(P + 16, 640, bw, 110, '✓ I kept it', true)
    pill(P + 16 + bw + 24, 640, bw, 110, '✕ I didn’t', false)
    x.fillStyle = 'rgba(255,255,255,0.9)'
    x.font = `500 36px ${sans}`
    x.fillText('Kept. That one counts.', P, 990)
    x.fillStyle = 'rgba(255,255,255,0.55)'
    x.font = `400 28px ${sans}`
    x.fillText('What helped?', P, 1070)
    let px = P
    let py = 1110
    ;['Started early', 'Kept it small', 'The audio', 'The reminder', 'Someone knew'].forEach((t, i) => {
      x.font = `400 28px ${sans}`
      const w = x.measureText(t).width + 56
      if (px + w > W - P) {
        px = P
        py += 90
      }
      x.fillStyle = i === 1 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)'
      rr(x, px, py, w, 70, 35)
      x.fill()
      x.strokeStyle = i === 1 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.16)'
      x.lineWidth = 2
      x.stroke()
      x.fillStyle = 'rgba(255,255,255,0.85)'
      x.fillText(t, px + 28, py + 45)
      px += w + 16
    })
  } else if (section === 'strength') {
    eyebrow('Gym Arc', 200)
    x.fillStyle = '#fff'
    x.font = `400 104px ${sans}`
    x.fillText('Day 12', P, 320)
    const w12 = x.measureText('Day 12').width
    x.fillStyle = 'rgba(255,255,255,0.35)'
    x.fillText(' / 30', P + w12, 320)
    x.fillStyle = 'rgba(255,255,255,0.6)'
    x.font = `400 28px ${sans}`
    x.fillText('Promises kept: 83% (10 of 12) · 4-day streak', P, 380)
    const cols = 6
    const gap = 22
    const s = (W - 2 * P - gap * (cols - 1)) / cols
    const broken = new Set([4, 9])
    for (let i = 0; i < 30; i++) {
      const d = i + 1
      const px = P + (i % cols) * (s + gap)
      const py = 440 + Math.floor(i / cols) * (s + gap)
      rr(x, px, py, s, s, 18)
      if (d < 12 && !broken.has(d)) {
        x.fillStyle = '#fff'
        x.fill()
      } else if (d === 12) {
        x.strokeStyle = 'rgba(255,255,255,0.8)'
        x.lineWidth = 6
        x.stroke()
      } else if (broken.has(d)) {
        x.strokeStyle = 'rgba(255,255,255,0.3)'
        x.lineWidth = 2
        x.stroke()
      } else {
        x.fillStyle = 'rgba(255,255,255,0.04)'
        x.fill()
      }
      x.fillStyle = d < 12 && !broken.has(d) ? '#000' : d === 12 ? '#fff' : 'rgba(255,255,255,0.3)'
      x.font = `500 28px ${sans}`
      x.textAlign = 'center'
      x.fillText(String(d), px + s / 2, py + s / 2 + 10)
      x.textAlign = 'left'
      if (broken.has(d)) {
        x.strokeStyle = 'rgba(255,255,255,0.35)'
        x.lineWidth = 2
        x.beginPath()
        x.moveTo(px + s / 2 - 18, py + s / 2)
        x.lineTo(px + s / 2 + 18, py + s / 2)
        x.stroke()
      }
    }
    card(1430, 300)
    eyebrow('On day 1 you said', 1510)
    x.fillStyle = '#fff'
    x.font = `600 48px ${serif}`
    x.fillText('“I want my evenings back.”', P + 16, 1600)
  }
}

export const SCREENS: Section[] = ['potential', 'intention', 'discipline', 'strength']
