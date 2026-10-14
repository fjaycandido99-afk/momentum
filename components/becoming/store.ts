// Shared state between the page (HTML) and the sculpture (3D). Plain
// objects, read every frame by the scene, so nothing re-renders.

export type Section =
  | 'hero'
  | 'potential'
  | 'intention'
  | 'discipline'
  | 'strength'
  | 'polish'
  | 'stoic'
  | 'samurai'
  | 'scholar'
  | 'final'
export const SECTIONS: Section[] = ['hero', 'potential', 'intention', 'discipline', 'strength', 'polish', 'stoic', 'samurai', 'scholar', 'final']

export const sculpt = {
  /** Scroll progress through the pinned stage, 0..SECTIONS.length (one unit per chapter). */
  p: 0,
  /** Carving the visitor did by hand (holding on the statue, the demos), per stage, 0..1. */
  manual: { block: 0, head: 0, torso: 0, legs: 0, polish: 0 },
  /** Recent carving activity (0..1), drives the dust. */
  activity: 0,
  pointer: { x: 0, y: 0 },
  /** Where the chisel is touching the statue while held (world space), or null. */
  hit: null as null | { x: number; y: number; z: number },
}

export type Stage = keyof typeof sculpt.manual
export const sectionAt = (p: number): Section => SECTIONS[Math.min(SECTIONS.length - 1, Math.max(0, Math.floor(p)))]
/** Which stage a chapter works on (for hand carving and the demos). */
export const STAGE_OF: Record<Section, Stage> = {
  hero: 'block',
  potential: 'block',
  intention: 'head',
  discipline: 'torso',
  strength: 'legs',
  polish: 'polish',
  stoic: 'polish',
  samurai: 'polish',
  scholar: 'polish',
  final: 'polish',
}

/** Carve a stage by hand (clamped), and kick up some dust. */
export function carve(stage: Stage, amount: number) {
  sculpt.manual[stage] = Math.min(1, sculpt.manual[stage] + amount)
  sculpt.activity = Math.min(1, sculpt.activity + amount * 6)
}

/** How far the carving has got, scroll or hand, whichever is further (for the chapter shown). */
export function carvedProgress() {
  const m = sculpt.manual
  const hand = m.polish >= 1 ? 5.5 : m.legs >= 1 ? 4.4 + m.polish : m.torso >= 1 ? 3.45 + m.legs : m.head >= 1 ? 2.5 + m.torso : m.block >= 1 ? 1.55 + m.head : m.block * 1.55
  return Math.max(sculpt.p, hand)
}
