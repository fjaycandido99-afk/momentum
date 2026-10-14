// Shared state between the page (HTML) and the sculpture (3D). Plain
// objects, read every frame by the scene, so nothing re-renders.

export type Section = 'hero' | 'potential' | 'intention' | 'discipline' | 'strength' | 'polish' | 'final'
export const SECTIONS: Section[] = ['hero', 'potential', 'intention', 'discipline', 'strength', 'polish', 'final']

/** Sections register their element; the scene reads scroll position from them. */
export const sectionEls: { id: Section; el: HTMLElement }[] = []

export const sculpt = {
  /** Carving the visitor did by hand (hold on the statue, the demos), per stage, 0..1. */
  manual: { block: 0, head: 0, torso: 0, legs: 0, polish: 0 },
  /** Recent carving activity (0..1), drives the dust. */
  activity: 0,
  pointer: { x: 0, y: 0 },
}

export type Stage = keyof typeof sculpt.manual
/** Which stage a section works on (for hand carving and the demos). */
export const STAGE_OF: Record<Section, Stage> = {
  hero: 'block',
  potential: 'block',
  intention: 'head',
  discipline: 'torso',
  strength: 'legs',
  polish: 'polish',
  final: 'polish',
}

/** Carve a stage by hand (clamped), and kick up some dust. */
export function carve(stage: Stage, amount: number) {
  sculpt.manual[stage] = Math.min(1, sculpt.manual[stage] + amount)
  sculpt.activity = Math.min(1, sculpt.activity + amount * 6)
}
