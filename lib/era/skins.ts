/**
 * Era skins — the era changes how Voxu feels, not how it works.
 *
 * ── WHAT A SKIN MAY TOUCH ─────────────────────────────────────────────
 *
 * One accent per era, used ONLY for atmosphere: glows, progress fill, the
 * "due now" ring, the hero's tint, the widget's edge. Text and buttons stay
 * white on black in every era — Voxu's base look is the constant, and a red
 * label on a red photograph is unreadable. Layout, navigation and how
 * anything is logged never change with the skin.
 *
 * Most eras are monochrome on purpose: their accent is a near-white steel,
 * stone or graphite, so they look like Voxu always has. Only the eras whose
 * whole idea is a light — Comeback's ember, Study's lamp, 5AM's dawn — carry
 * colour, and only as that accent.
 *
 * Keys are era keys (lib/era/programs.ts). Pure.
 */

export interface EraSkin {
  /** "r g b", for rgb(var(--era-accent) / a) in CSS. */
  accent: [number, number, number]
  /** True when the accent is a near-neutral — the era reads monochrome. */
  mono: boolean
}

export const ERA_SKINS: Record<string, EraSkin> = {
  locked_in: { accent: [203, 213, 225], mono: true },   // steel
  discipline: { accent: [214, 214, 219], mono: true },  // cold white
  gym_arc: { accent: [176, 186, 196], mono: true },     // graphite
  stoic_mode: { accent: [222, 214, 199], mono: true },  // stone, muted ivory
  confidence: { accent: [245, 245, 245], mono: true },  // bright white
  comeback: { accent: [233, 98, 62], mono: false },     // ember
  study: { accent: [222, 170, 96], mono: false },       // lamp amber
  five_am: { accent: [112, 160, 236], mono: false },    // dawn blue
  custom: { accent: [220, 220, 224], mono: true },
}

const NEUTRAL: EraSkin = { accent: [255, 255, 255], mono: true }

export function eraSkin(key: string | null | undefined): EraSkin {
  return (key && ERA_SKINS[key]) || NEUTRAL
}

/** The CSS custom property the skin classes in globals.css read. */
export function eraSkinVars(key: string | null | undefined): Record<string, string> {
  const [r, g, b] = eraSkin(key).accent
  return { '--era-accent': `${r} ${g} ${b}` }
}

/** "#rrggbb", for the widget. */
export function eraAccentHex(key: string | null | undefined): string {
  return `#${eraSkin(key).accent.map(n => n.toString(16).padStart(2, '0')).join('')}`
}
