/**
 * Home's light follows the clock: sunrise in the morning, sunset through the
 * afternoon and evening, night after eight. The greeting already changes with
 * the hour ("Late night · Rest is part of the work"); the photograph now agrees
 * with it.
 *
 * Computed on the device, from the device's own clock — no request, nothing
 * to keep in step on a server. Pure; the hook that reads the clock lives with
 * the component.
 */

export type DayPhase = 'sunrise' | 'sunset' | 'night'

/**
 * The hour night falls, by month (0 = January). Sunset moves through the
 * year — a fixed 8pm showed a sunset sky in Hawaii at 7pm in October, an
 * hour after dark. These are rounded sunsets for the northern mid-latitudes
 * most people live in: 5pm in deep winter, 8pm in high summer.
 *
 * Device-local, no location: the app doesn't know where anyone is and isn't
 * going to ask for a backdrop. Southern-hemisphere seasons run backwards
 * here — a known limit, and the sky is decoration, not information.
 */
export const NIGHT_FROM: readonly number[] = [18, 18, 19, 19, 20, 20, 20, 20, 19, 18, 17, 17]

/** The hour the sunrise sky starts: later in the dark months. */
export const SUNRISE_FROM: readonly number[] = [6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 6, 6]

/** sunrise from SUNRISE_FROM until noon · sunset until NIGHT_FROM · night after. */
export function dayPhase(hour: number, month: number = new Date().getMonth()): DayPhase {
  const m = ((month % 12) + 12) % 12
  if (hour >= SUNRISE_FROM[m] && hour < 12) return 'sunrise'
  if (hour >= 12 && hour < NIGHT_FROM[m]) return 'sunset'
  return 'night'
}

export interface PhaseScene {
  /** Tall (phone, iPad portrait). */
  tall: string | null
  /** Landscape (iPad landscape). */
  wide: string | null
  /** The figure behind the greeting. */
  hero: string | null
}

/**
 * A phase whose photos aren't made yet borrows sunset's — the set that
 * exists — so the page never shows an empty sky. Each field falls back on
 * its own: a phase with only a tall photo still gets sunset's wide one.
 */
export function sceneFor(phase: DayPhase, scenes: Record<DayPhase, PhaseScene>): PhaseScene {
  const own = scenes[phase]
  const base = scenes.sunset
  return {
    tall: own.tall ?? base.tall,
    wide: own.wide ?? base.wide,
    hero: own.hero ?? base.hero,
  }
}
