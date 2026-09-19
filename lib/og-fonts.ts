/**
 * Fonts for next/og images (share cards, link previews). next/og can't use
 * next/font — it needs the font file's bytes — so this fetches Cormorant
 * Garamond's TTF from Google Fonts once per server instance and keeps it.
 *
 * Google serves TTF (which next/og needs; it can't read woff2) to a plain
 * server fetch. If the fetch fails the image still renders, in the default
 * font — a card in the wrong typeface beats no card.
 */

/** Straight apostrophe → typographic ’, as a set serif line should read. */
export const typeset = (s: string) => s.replace(/'/g, '’')

type OgFont = { name: string; data: ArrayBuffer; weight: 500 | 600; style: 'normal' }

/**
 * Switch off the font's kerning. next/og (satori) measures each word without
 * kerning but draws it with kerning, so any word with a kerned pair — "You",
 * "To", "We" — came out narrower than the space it was given, leaving a
 * visible gap after it ("You're  not"). Renaming the GPOS/kern table tags
 * makes the renderer skip them, so measuring and drawing agree.
 */
function withoutKerning(data: ArrayBuffer): ArrayBuffer {
  try {
    const view = new DataView(data)
    const tables = view.getUint16(4)
    for (let i = 0; i < tables; i++) {
      const at = 12 + i * 16
      const tag = String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3))
      if (tag === 'GPOS' || tag === 'kern') view.setUint8(at, 0x58) // → "XPOS" / "Xern"
    }
  } catch { /* not a font we can read — use it as it is */ }
  return data
}

let cache: Promise<OgFont[]> | null = null

async function loadCormorant(weight: 500 | 600): Promise<OgFont | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@${weight}`).then(r => r.text())
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1]
      ?? css.match(/url\((https:[^)]+\.ttf)\)/)?.[1]
    if (!url) return null
    const data = withoutKerning(await fetch(url).then(r => r.arrayBuffer()))
    return { name: 'Cormorant', data, weight, style: 'normal' }
  } catch {
    return null
  }
}

export function ogFonts(): Promise<OgFont[]> {
  if (!cache) {
    cache = Promise.all([loadCormorant(500), loadCormorant(600)])
      .then(fonts => fonts.filter((f): f is OgFont => f !== null))
    // A failed load shouldn't be cached forever — retry on the next card.
    cache.then(f => { if (f.length === 0) cache = null })
  }
  return cache
}
