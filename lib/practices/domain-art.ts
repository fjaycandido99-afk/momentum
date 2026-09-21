import type { PracticeDomain } from './presets'

/**
 * Art for the other kinds of training.
 *
 * Same rules as the movement art: a still of the place and the kit, shot
 * near-dark, no text baked in. Objects rather than people doing things —
 * partly for the house style, partly because a picture of somebody
 * studying is a picture of somebody else's life, and this screen belongs
 * to the person holding the phone.
 *
 * A domain without art shows no image at all rather than a stand-in. An
 * empty header is quieter than a wrong one.
 */
export const DOMAIN_IMAGES: Partial<Record<PracticeDomain, string>> = {
  gym: '/movements/kit-squat.webp',
  read: '/practices/read.webp',
  study: '/practices/study.webp',
  work: '/practices/work.webp',
  mind: '/practices/mind.webp',
  // run: still to generate. The header stays empty until it exists.
}

export function domainArt(domain: PracticeDomain | undefined): string | null {
  if (!domain) return null
  return DOMAIN_IMAGES[domain] ?? null
}

/**
 * What the picture is, for a screen reader.
 *
 * Describes the room, never the activity: "where the work happens", not
 * "a person studying".
 */
export function domainArtAlt(label: string): string {
  return `${label} — where it happens`
}
