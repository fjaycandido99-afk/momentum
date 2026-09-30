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

/** 5:00–11:59 sunrise · 12:00–19:59 sunset · 20:00–4:59 night. */
export function dayPhase(hour: number): DayPhase {
  if (hour >= 5 && hour < 12) return 'sunrise'
  if (hour >= 12 && hour < 20) return 'sunset'
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
