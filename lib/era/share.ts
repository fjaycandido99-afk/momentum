import { ERA_PRESETS_BY_KEY, eraName } from './presets'

/**
 * Sharing an era: the link, the words, and the slug in the URL.
 *
 * Only PRESET eras are joinable. A custom era ("Dad Mode") is personal and
 * its title is the user's own words, so a shared custom era links to the
 * picker rather than to a join page that would expose — or have to invent —
 * its name.
 */

export const SITE_URL = 'https://voxu.app'

/** locked_in → locked-in (nicer in a URL, and what people will type). */
export function eraSlug(key: string): string {
  return key.replace(/_/g, '-')
}

/** locked-in → locked_in, or null if it isn't a preset era. */
export function eraKeyFromSlug(slug: string): string | null {
  const key = slug.toLowerCase().replace(/-/g, '_')
  return ERA_PRESETS_BY_KEY.has(key) ? key : null
}

/**
 * The "Join this era" link. `from` is the sharer's era id, so a join can be
 * credited to that era (EraReferral). It's an opaque id — nothing about the
 * person is in the link.
 */
export function joinUrl(eraKey: string, fromEraId?: string | null): string {
  if (!ERA_PRESETS_BY_KEY.has(eraKey)) return `${SITE_URL}/era`
  const base = `${SITE_URL}/join/${eraSlug(eraKey)}`
  return fromEraId ? `${base}?from=${encodeURIComponent(fromEraId)}` : base
}

/** What goes with the card in the share sheet. */
export function shareText(era: { key: string; title: string; day: number; lengthDays: number; complete?: boolean }): string {
  const lead = era.complete
    ? `I finished my ${eraName(era.title)} — ${era.lengthDays} days, one promise a day.`
    : `Day ${era.day} of my ${eraName(era.title)}. One promise a day for ${era.lengthDays} days.`
  return ERA_PRESETS_BY_KEY.has(era.key) ? `${lead} Join me:` : `${lead} Start yours:`
}
