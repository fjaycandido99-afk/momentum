/**
 * Fonts for next/og images (share cards, link previews). next/og can't use
 * next/font — it needs the font file's bytes — so this fetches Cormorant
 * Garamond's TTF from Google Fonts once per server instance and keeps it.
 *
 * Google serves TTF (which next/og needs; it can't read woff2) to a plain
 * server fetch. If the fetch fails the image still renders, in the default
 * font — a card in the wrong typeface beats no card.
 */

type OgFont = { name: string; data: ArrayBuffer; weight: 500 | 600; style: 'normal' }

let cache: Promise<OgFont[]> | null = null

async function loadCormorant(weight: 500 | 600): Promise<OgFont | null> {
  try {
    const css = await fetch(`https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@${weight}`).then(r => r.text())
    const url = css.match(/src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype)'\)/)?.[1]
      ?? css.match(/url\((https:[^)]+\.ttf)\)/)?.[1]
    if (!url) return null
    const data = await fetch(url).then(r => r.arrayBuffer())
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
