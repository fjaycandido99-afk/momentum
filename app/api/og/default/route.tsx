/**
 * GET /api/og/default — site-wide default OG image (1200x630 PNG).
 *
 * Used as the fallback unfurl card for /, /community, /journal, /about,
 * and anywhere else that doesn't render its own per-page OG. Bespoke
 * post cards live at /api/og/post?id=...
 *
 * Optional ?title= and ?subtitle= overrides let any future surface
 * customize without writing a new endpoint:
 *   /api/og/default?title=Join%20the%20Voxu%20Community&subtitle=...
 *
 * Edge-friendly (no DB hit) — pure render + cache. Wrapped in nodejs
 * runtime only for consistency with the post route; could move to
 * edge later if we want.
 */

import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const W = 1200
const H = 630

const DEFAULT_TITLE = 'Voxu'
const DEFAULT_SUBTITLE = 'Cinematic AI for the inner life.'
const DEFAULT_TAGLINE = 'Reflect. Be witnessed. Carry it forward.'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const title = (url.searchParams.get('title') || DEFAULT_TITLE).slice(0, 80)
  const subtitle = (url.searchParams.get('subtitle') || DEFAULT_SUBTITLE).slice(0, 160)
  const tagline = (url.searchParams.get('tagline') || DEFAULT_TAGLINE).slice(0, 80)

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 80,
          background:
            'radial-gradient(circle at 25% 25%, #1c1c26 0%, #050507 70%), radial-gradient(circle at 75% 75%, rgba(120,120,140,0.10) 0%, transparent 50%)',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top: Voxu mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 999,
              background: 'white',
              boxShadow: '0 0 32px rgba(255,255,255,0.6)',
            }}
          />
          <div style={{ fontSize: 32, fontWeight: 600, letterSpacing: -1 }}>{title}</div>
        </div>

        {/* Center: subtitle + tagline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 64,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              color: 'rgba(255,255,255,0.96)',
            }}
          >
            {subtitle}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              color: 'rgba(255,255,255,0.55)',
              letterSpacing: -0.2,
            }}
          >
            {tagline}
          </div>
        </div>

        {/* Bottom: faint aura accent + url */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: 4,
              textTransform: 'uppercase',
            }}
          >
            voxu.app
          </div>
          {/* Aura signature — concentric soft rings */}
          <div
            style={{
              display: 'flex',
              width: 96,
              height: 96,
              borderRadius: 999,
              border: '2px solid rgba(255,255,255,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 40px rgba(255,255,255,0.12), inset 0 0 30px rgba(255,255,255,0.06)',
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 999,
                background: 'white',
                boxShadow: '0 0 20px rgba(255,255,255,0.7)',
              }}
            />
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      headers: {
        // Default card almost never changes — cache aggressively at
        // the edge. Bumping the URL (e.g. add ?v=2) busts when needed.
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
