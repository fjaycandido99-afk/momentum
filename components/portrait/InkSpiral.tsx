/* ============================================================================
   InkSpiral — generative profile fingerprint that grows from journaling.

   The user's profile "image" is a deterministic sunflower-style spiral of
   ink strokes. Each journal entry adds ONE stroke at the golden angle
   (137.5°) so the strokes naturally distribute into a beautiful pattern
   without overlapping. Early days = single dot, ~30 entries = first
   visible bloom, ~150 entries = full inner ring, ~365 = woven mandala.

   Pure SVG, monochrome, no images, no storage, no moderation. The seed
   (user_id) introduces small deterministic variations per person so even
   two users with the same entry count get visually distinct spirals.

   Milestone rings render at 7, 30, 100, 365 entries — quiet visual
   reward for showing up. Each one fades on a different radius so the
   spiral feels more "earned" the longer you've been with Voxu.

   Renders cleanly from ~20px (tiny avatar) up to ~200px (profile hero).
   ============================================================================ */

interface InkSpiralProps {
  /** Stable per-user seed — pass the user_id. */
  seed: string
  /** Number of journal entries this user has written. Drives growth. */
  entryCount: number
  /** Render size in pixels (square). */
  size?: number
  /** Optional override; defaults to white-on-transparent. */
  color?: string
  /** When true, render a subtle outer ring (used on profile-page hero). */
  withFrame?: boolean
}

// ---------------------------------------------------------------------------
// Deterministic RNG — small LCG seeded from a string hash. Same seed →
// same sequence of pseudo-random numbers in [0, 1).
// ---------------------------------------------------------------------------
function hashSeed(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeRng(seedStr: string): () => number {
  let state = hashSeed(seedStr) || 1
  return () => {
    state = Math.imul(state, 1664525) + 1013904223
    state = state >>> 0
    return state / 0xffffffff
  }
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)) // ≈ 137.5°

// Milestones at which a concentric ring quietly appears. Each ring is
// drawn at a stable radius (fraction of max), so the spiral acquires
// rings as the user reaches each threshold — earned, not given.
const MILESTONE_RINGS: { at: number; radiusPct: number }[] = [
  { at: 7,   radiusPct: 0.30 },
  { at: 30,  radiusPct: 0.55 },
  { at: 100, radiusPct: 0.78 },
  { at: 365, radiusPct: 0.95 },
]

export function InkSpiral({
  seed,
  entryCount,
  size = 48,
  color = 'rgba(255,255,255,0.92)',
  withFrame = false,
}: InkSpiralProps) {
  const cx = size / 2
  const cy = size / 2
  const maxRadius = size * 0.42
  const minRadius = size * 0.05

  const rng = makeRng(seed || 'anon')
  const baseAngle = rng() * Math.PI * 2

  // Cap the visible stroke count so very-long-running users don't render
  // 10,000 SVG lines (perf + visual). After ~400 strokes the spiral is
  // fully filled visually anyway.
  const N = Math.min(entryCount, 400)

  // Stroke widths scale with render size so it reads at any avatar size.
  const strokeWidth = Math.max(0.6, size / 64)
  const ringStrokeWidth = Math.max(0.4, size / 110)

  const lines: { x1: number; y1: number; x2: number; y2: number; o: number }[] = []

  for (let i = 0; i < N; i++) {
    const angle = baseAngle + i * GOLDEN_ANGLE
    // Square-root growth so the spiral fills outward evenly (sunflower seeds).
    const t = Math.sqrt(Math.min(1, i / 350))
    const r = minRadius + (maxRadius - minRadius) * t

    // Stroke length shortens slightly as we move outward to keep the
    // outer edge crisp instead of bushy.
    const len = (size / 22) * (1 - t * 0.4)
    const dx = Math.cos(angle) * len
    const dy = Math.sin(angle) * len

    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r

    lines.push({
      x1: x - dx / 2,
      y1: y - dy / 2,
      x2: x + dx / 2,
      y2: y + dy / 2,
      // Per-stroke opacity jitter so the spiral reads as ink, not print.
      o: 0.55 + rng() * 0.40,
    })
  }

  // Earned milestone rings.
  const rings = MILESTONE_RINGS.filter(m => entryCount >= m.at).map(m => ({
    r: m.radiusPct * maxRadius,
  }))

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Ink spiral profile — ${entryCount} ${entryCount === 1 ? 'reflection' : 'reflections'}`}
      style={{ display: 'block' }}
    >
      {/* Subtle frame ring on profile hero. */}
      {withFrame && (
        <circle
          cx={cx}
          cy={cy}
          r={size / 2 - 0.5}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={1}
        />
      )}

      {/* Always-visible center dot — day-zero starting point. */}
      <circle cx={cx} cy={cy} r={Math.max(1, size / 36)} fill={color} />

      {/* Milestone concentric rings — quietly earned. */}
      {rings.map((ring, i) => (
        <circle
          key={`r${i}`}
          cx={cx}
          cy={cy}
          r={ring.r}
          fill="none"
          stroke={color}
          strokeOpacity={0.18}
          strokeWidth={ringStrokeWidth}
        />
      ))}

      {/* Ink strokes — one per journal entry, golden-angle distributed. */}
      {lines.map((l, i) => (
        <line
          key={i}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke={color}
          strokeOpacity={l.o}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
    </svg>
  )
}
