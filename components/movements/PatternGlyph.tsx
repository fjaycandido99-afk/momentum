import type { MovementPattern } from '@/lib/movements/library'

/**
 * A mark for each movement pattern.
 *
 * Deliberately abstract. These draw the DIRECTION the pattern is named for
 * — a horizontal push goes away from you, a vertical pull comes down to you
 * — which is what the words already say, so the mark claims nothing the
 * name doesn't.
 *
 * What they are not is a picture of a person doing the lift. An
 * illustration of form is form instruction: a drawing gets copied more
 * faithfully than a sentence, so a wrong one is worse than none. Real
 * demonstrations need footage of a real body, shot or licensed, and someone
 * qualified putting their name to it. Until that exists, the app shows
 * where a movement sits and not how to perform it.
 *
 * `Record<MovementPattern, …>` on purpose: a new pattern in the library
 * without a mark here is a type error, not a blank square.
 */
const GLYPHS: Record<MovementPattern, React.ReactNode> = {
  // Down, between the floor and where you started.
  squat: (
    <>
      <path d="M4 4h16" />
      <path d="M4 20h16" />
      <path d="M12 8v7" />
      <path d="M9 12.5l3 3 3-3" />
    </>
  ),
  // A pivot: the bar travels, the hinge stays put.
  hinge: (
    <>
      <path d="M5 7h10" />
      <path d="M19 17a7 7 0 0 0-7-7" />
      <circle cx="19" cy="17" r="1.6" />
      <path d="M5 20h14" />
    </>
  ),
  // Away from you.
  horizontal_push: (
    <>
      <path d="M5 5v14" />
      <path d="M8 12h10" />
      <path d="M15 9l3 3-3 3" />
    </>
  ),
  // Toward you.
  horizontal_pull: (
    <>
      <path d="M19 5v14" />
      <path d="M16 12H6" />
      <path d="M9 9l-3 3 3 3" />
    </>
  ),
  // Overhead.
  vertical_push: (
    <>
      <path d="M4 20h16" />
      <path d="M12 16V6" />
      <path d="M9 9l3-3 3 3" />
    </>
  ),
  // Down to you.
  vertical_pull: (
    <>
      <path d="M4 4h16" />
      <path d="M12 8v10" />
      <path d="M9 15l3 3 3-3" />
    </>
  ),
  // One side at a time.
  single_leg: (
    <>
      <path d="M9 4v16" />
      <path d="M15 4v16" strokeDasharray="2 3" />
      <path d="M4 20h16" />
    </>
  ),
  // The middle, holding.
  core: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M5.5 12h13" />
    </>
  ),
}

export function PatternGlyph({
  pattern,
  className = 'w-5 h-5',
}: {
  pattern: MovementPattern
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {GLYPHS[pattern]}
    </svg>
  )
}

export const PATTERN_GLYPH_KEYS = Object.keys(GLYPHS) as MovementPattern[]
