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
  /** The visitor just did something in a chapter's demo: its object reacts. */
  react: { chapter: 0, at: 0 },
  /** Loudness of the audio preview (0..1), for the headphones. */
  audio: 0,
  /** The app screen on the 3D phone: which screen, what the visitor did, a version to redraw on, and whether it's brought close (phones). */
  phone: { section: null as Section | null, demo: null as unknown, v: 0, focus: false },
  /** Which object is picked: 0 = the overview, 1..5 = a chapter. */
  pick: 0,
  /**
   * The centrepiece (the unfinished self): how many worlds have been opened on
   * this visit (it carves itself a little more for each), when its reveal last
   * started (performance.now, 0 = never), and the page's hook for it.
   */
  core: { opened: 0, reveal: 0, onReveal: null as null | (() => void) },
  /** Fly the story to a chapter (set by the page; the scene calls it when an object is tapped). */
  jump: null as null | ((i: number) => void),
  /** Where the chisel is touching the statue while held (world space), or null. */
  hit: null as null | { x: number; y: number; z: number },
}

/**
 * The climb: the chapters in the order a visitor is led through them (Daily
 * Eras, Habit Builder, AI Coach, Guided Audio, Reflection), each a step up
 * toward the bust. Any step can still be opened directly.
 */
export const STEPS = [1, 4, 3, 5, 2]
export const STEP_NAME: Record<number, string> = { 1: 'Daily Eras', 4: 'Habit Builder', 3: 'AI Coach', 5: 'Guided Audio', 2: 'Reflection', 6: 'Achievements' }
/** David at the top of the climb: his achievements (the coins you earn). Opened like a step, but not one of the five. */
export const SUMMIT = 6
/** Chapters opened on this visit. */
export const visited = new Set<number>()
/** The first step not yet opened (the start for a new visitor), or 0 once all are. */
export const nextStep = () => STEPS.find((c) => !visited.has(c)) ?? 0
/** The way up: the five steps, then David at the summit. */
const PATH = [...STEPS, SUMMIT]
/** The step after a chapter on the way up (the summit after the last step), or 0 at the top. */
export const stepAfter = (chapter: number) => PATH[PATH.indexOf(chapter) + 1] ?? 0
/** The step before a chapter, or 0 before the first. */
export const stepBefore = (chapter: number) => PATH[PATH.indexOf(chapter) - 1] ?? 0


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

// ---- Promises as chisel marks ------------------------------------------------
// Every promise made in the demo strikes the stone and leaves a mark that
// stays (gold, faint). In "Every day leaves a mark" the marks of a whole
// 30-day era light up, one by one.
export const promises = {
  /** Promises made on this visit. */
  made: 0,
  /** Set when a promise is made; the scene strikes the next mark and clears it. */
  strikeRequested: false,
}
export function makePromise() {
  promises.made = Math.min(30, promises.made + 1)
  promises.strikeRequested = true
  carve('head', 0.25)
}
