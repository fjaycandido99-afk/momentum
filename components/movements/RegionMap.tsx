import { REGION_LABELS, type Region } from '@/lib/movements/library'

/**
 * Where a region is, drawn on a plain figure.
 *
 * The mockup's "primary muscles" column. This is a location, which is a
 * fact — glutes are at the back of the hips whoever you are — so it's the
 * one piece of body information the app can draw without a reviewer.
 *
 * What it deliberately doesn't say is how MUCH. No percentages, no
 * primary-versus-secondary ranking, no heat map: that varies by person, by
 * load and by how they move, and the app knows none of those. Every
 * highlighted region is drawn the same weight.
 *
 * Posterior regions get the back of the figure, anterior ones the front,
 * so "back" and "chest" can't end up highlighting the same shape. A
 * silhouette has no face either way, and the view is named in the label
 * for anyone who can't see it.
 */

const POSTERIOR: Region[] = ['back', 'glutes', 'hamstrings', 'triceps']

/** Where each region sits, as shapes on a 40 × 96 figure. */
const ZONES: Record<Region, React.ReactNode> = {
  shoulders: (
    <>
      <ellipse cx="11" cy="24" rx="4" ry="3.4" />
      <ellipse cx="29" cy="24" rx="4" ry="3.4" />
    </>
  ),
  chest: <rect x="13" y="26" width="14" height="9" rx="3" />,
  back: <rect x="13" y="26" width="14" height="14" rx="3" />,
  core: <rect x="15" y="36" width="10" height="11" rx="3" />,
  biceps: (
    <>
      <rect x="6" y="28" width="4.5" height="11" rx="2.2" />
      <rect x="29.5" y="28" width="4.5" height="11" rx="2.2" />
    </>
  ),
  triceps: (
    <>
      <rect x="6" y="28" width="4.5" height="11" rx="2.2" />
      <rect x="29.5" y="28" width="4.5" height="11" rx="2.2" />
    </>
  ),
  grip: (
    <>
      <circle cx="8" cy="45" r="2.6" />
      <circle cx="32" cy="45" r="2.6" />
    </>
  ),
  glutes: <rect x="13" y="47" width="14" height="8" rx="3.5" />,
  quads: (
    <>
      <rect x="14" y="55" width="5.5" height="15" rx="2.6" />
      <rect x="20.5" y="55" width="5.5" height="15" rx="2.6" />
    </>
  ),
  hamstrings: (
    <>
      <rect x="14" y="56" width="5.5" height="14" rx="2.6" />
      <rect x="20.5" y="56" width="5.5" height="14" rx="2.6" />
    </>
  ),
  calves: (
    <>
      <rect x="14.5" y="72" width="5" height="11" rx="2.4" />
      <rect x="20.5" y="72" width="5" height="11" rx="2.4" />
    </>
  ),
}

export function RegionMap({
  region,
  className = 'w-10 h-24',
}: {
  region: Region
  className?: string
}) {
  const view = POSTERIOR.includes(region) ? 'back' : 'front'

  return (
    <svg
      viewBox="0 0 40 96"
      className={className}
      role="img"
      aria-label={`${REGION_LABELS[region]}, shown on the ${view} of the body`}
    >
      {/* The figure. Flat, faceless, no proportion claims. */}
      <g fill="currentColor" opacity="0.18">
        <circle cx="20" cy="12" r="6" />
        <path d="M13 22h14a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H13a3 3 0 0 1-3-3V25a3 3 0 0 1 3-3z" />
        <rect x="6" y="24" width="4.5" height="22" rx="2.2" />
        <rect x="29.5" y="24" width="4.5" height="22" rx="2.2" />
        <rect x="14" y="50" width="5.5" height="34" rx="2.6" />
        <rect x="20.5" y="50" width="5.5" height="34" rx="2.6" />
      </g>
      {/* The region, at one weight — never a heat map. */}
      <g fill="currentColor" opacity="0.92">
        {ZONES[region]}
      </g>
    </svg>
  )
}

export const REGION_MAP_KEYS = Object.keys(ZONES) as Region[]
