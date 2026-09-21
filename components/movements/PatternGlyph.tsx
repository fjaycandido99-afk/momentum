import type { MovementPattern } from '@/lib/movements/library'

/**
 * A mark for each movement pattern.
 *
 * Deliberately abstract: these draw the SHAPE the pattern is named for — a
 * squat descends and returns, a horizontal push travels away from the body
 * — which is what the words already say, so the mark claims nothing the
 * name doesn't.
 *
 * No arrowheads. The first version used them and the squat mark read as a
 * download icon in a list of exercises, which is exactly the kind of
 * mistake a person shouldn't have to decode. Lines, bars and caps only.
 *
 * What they are not is a picture of a person doing the lift. An
 * illustration of form is form instruction: a drawing gets copied more
 * faithfully than a sentence, so a wrong one is worse than none.
 *
 * `Record<MovementPattern, …>` on purpose: a new pattern in the library
 * without a mark here is a type error, not a blank square.
 */
const GLYPHS: Record<MovementPattern, React.ReactNode> = {
  // Down and back up.
  squat: (
    <>
      <path d="M4 5v4l8 10 8-10V5" />
    </>
  ),
  // A pivot: one end stays, the other travels.
  hinge: (
    <>
      <circle cx="6" cy="17" r="1.8" />
      <path d="M7.5 15.5L18 7" />
      <path d="M4 20.5h16" />
    </>
  ),
  // One side at a time.
  single_leg: (
    <>
      <path d="M9 4v16" />
      <path d="M15 8v12" strokeDasharray="2 3" />
      <path d="M4 20.5h16" />
    </>
  ),
  // Away from the body: a bar, then travel, then where it ends up.
  horizontal_push: (
    <>
      <path d="M4 4v16" />
      <path d="M7 12h9" />
      <path d="M19 8v8" />
    </>
  ),
  // Toward the body.
  horizontal_pull: (
    <>
      <path d="M20 4v16" />
      <path d="M17 12H8" />
      <path d="M5 8v8" />
    </>
  ),
  // Overhead.
  vertical_push: (
    <>
      <path d="M4 20.5h16" />
      <path d="M12 17V7" />
      <path d="M7 4h10" />
    </>
  ),
  // Down to you, or you up to it.
  vertical_pull: (
    <>
      <path d="M4 3.5h16" />
      <path d="M12 7v10" />
      <path d="M7 20h10" />
    </>
  ),
  // The middle, holding.
  core: (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M5.5 12h13" />
    </>
  ),
  // One joint closing.
  elbow_flexion: (
    <>
      <path d="M6 20V8" />
      <path d="M6 8a6 6 0 0 1 10 3" />
      <path d="M13 14h6" />
    </>
  ),
  // One joint opening.
  elbow_extension: (
    <>
      <path d="M8 4v7" />
      <path d="M8 11l7 8" />
      <path d="M5 21h6" />
    </>
  ),
  // Out to the side.
  lateral_raise: (
    <>
      <path d="M12 20V8" />
      <path d="M4 9h5" />
      <path d="M15 9h5" />
    </>
  ),
  // The knee closing.
  knee_flexion: (
    <>
      <path d="M4 18h8" />
      <path d="M12 18a7 7 0 0 0 5-12" />
      <circle cx="12" cy="18" r="1.6" />
    </>
  ),
  // The knee opening.
  knee_extension: (
    <>
      <path d="M6 6v8" />
      <circle cx="6" cy="14" r="1.6" />
      <path d="M7.5 15.5L19 19" />
    </>
  ),
  // Up onto the toes.
  calf: (
    <>
      <path d="M4 20.5h16" />
      <path d="M8 20.5V13" />
      <path d="M8 13h6" />
      <path d="M16 9.5v3" />
    </>
  ),
  // Holding something while you walk.
  carry: (
    <>
      <path d="M12 4v11" />
      <path d="M8 15h8" />
      <path d="M6 20.5h4" />
      <path d="M14 20.5h4" />
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
