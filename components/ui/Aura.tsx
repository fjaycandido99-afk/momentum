'use client'

import type { CSSProperties, ReactNode } from 'react'

/* ============================================================================
   The signature aura — Voxu's iconic visual anchor, in monochrome light.

   <AuraRing>  a glowing portal ring that wraps center content (a timer, a
               score, a Whisk texture). Use it on Focus, Breathing, the home
               progress ring.
   <AIOrb>     the AI presence — a breathing plasma sphere. Use it on Coach.

   Both are pure CSS/SVG (see the aura-* keyframes in globals.css): a conic
   arc orbits the ring, a radial halo breathes, the orb body floats. Only
   transform/opacity animate, so it's cheap on the Capacitor WebView, and it
   freezes to a still glow under prefers-reduced-motion. Drive the mood with
   `state` — speed + glow intensity scale up from calm to active.
   ============================================================================ */

// ── Aura ring ───────────────────────────────────────────────────────────────

export type AuraRingState = 'idle' | 'active' | 'pulse'

const RING_TUNING: Record<AuraRingState, { spin: string; breathe: string; glow: number; arc: number }> = {
  idle:   { spin: '26s', breathe: '7s',   glow: 0.5,  arc: 0.7 },
  active: { spin: '13s', breathe: '4s',   glow: 0.75, arc: 0.85 },
  pulse:  { spin: '8s',  breathe: '2.4s', glow: 0.95, arc: 1 },
}

interface AuraRingProps {
  /** Diameter in px. */
  size?: number
  state?: AuraRingState
  /** Ring stroke thickness in px. */
  stroke?: number
  /**
   * Whether the halo breathes on its own loop. Set false when the ring's
   * scale is driven externally (e.g. a paced inhale/exhale guide) so the two
   * rhythms don't fight — the halo stays a steady glow while you scale it.
   */
  breathe?: boolean
  /**
   * 0–1 data fill. When set, the ring shows a glowing progress arc (a score,
   * completion) instead of the decorative orbiting light — turning the portal
   * into a data ring while keeping the same aura.
   */
  progress?: number
  className?: string
  /** Centered content — timer, number, image, etc. */
  children?: ReactNode
}

export function AuraRing({ size = 240, state = 'idle', stroke = 2, breathe = true, progress, className = '', children }: AuraRingProps) {
  const t = RING_TUNING[state]

  // Progress / decorative-arc geometry (viewBox units).
  const pw = Math.max(1.5, (stroke / size) * 100)
  const pr = 50 - pw / 2
  const circ = 2 * Math.PI * pr
  const fill = Math.max(0, Math.min(1, progress ?? 0))

  // Per-state glow alpha baked into the gradient so the breathing keyframe
  // doesn't need to read CSS vars (iOS WebKit can't animate var() values).
  const a1 = (0.22 * t.glow * 1.6).toFixed(3)
  const a2 = (0.06 * t.glow * 1.6).toFixed(3)
  const glowStyle: CSSProperties = {
    background: `radial-gradient(circle, rgba(255,255,255,${a1}) 0%, rgba(255,255,255,${a2}) 38%, transparent 68%)`,
    willChange: 'transform, opacity',
    ...(breathe
      ? { animation: `aura-breathe ${t.breathe} ease-in-out infinite` }
      : { opacity: 0.85 }),
  }

  return (
    <div
      className={`aura-ring relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={!children}
    >
      {/* Soft breathing halo (no animated blur — softness is in the gradient) */}
      <div className="absolute inset-[-18%] rounded-full pointer-events-none" style={glowStyle} />
      {/* Base ring */}
      <div className="absolute inset-0 rounded-full border border-white/15" />
      {progress != null ? (
        /* Glowing progress arc (data) — starts at 12 o'clock */
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100" aria-hidden>
          <circle
            cx="50" cy="50" r={pr} fill="none" stroke="white" strokeOpacity="0.9"
            strokeWidth={pw} strokeLinecap="round"
            strokeDasharray={`${fill * circ} ${circ}`}
            style={{ filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.45))', transition: 'stroke-dasharray 600ms ease-out' }}
          />
        </svg>
      ) : (
        /* Orbiting light arc (decorative). SVG + CSS rotation — reliable on iOS,
           unlike conic-gradient + mask + rotate (the previous approach went
           static in the Capacitor WebView). */
        <svg
          className="absolute inset-0"
          viewBox="0 0 100 100"
          aria-hidden
          style={{
            animation: `aura-spin ${t.spin} linear infinite`,
            willChange: 'transform',
          }}
        >
          <circle
            cx="50" cy="50" r={pr}
            fill="none" stroke="white" strokeOpacity={t.arc}
            strokeWidth={pw} strokeLinecap="round"
            pathLength={100}
            strokeDasharray="22 78"
          />
        </svg>
      )}
      {/* Inner faint ring for depth */}
      <div className="absolute inset-[7%] rounded-full border border-white/[0.06]" />
      {/* Center content */}
      {children != null && <div className="relative z-10 grid place-items-center text-center">{children}</div>}
    </div>
  )
}

// ── AI orb ───────────────────────────────────────────────────────────────────

export type AIOrbState = 'idle' | 'thinking' | 'listening' | 'speaking'

const ORB_TUNING: Record<AIOrbState, { float: string; shimmer: string; ring: string; glow: number }> = {
  idle:      { float: '9s', shimmer: '5s',   ring: '28s', glow: 0.5 },
  thinking:  { float: '4s', shimmer: '1.6s', ring: '9s',  glow: 0.8 },
  listening: { float: '6s', shimmer: '2.6s', ring: '15s', glow: 0.7 },
  speaking:  { float: '3s', shimmer: '0.9s', ring: '6s',  glow: 0.95 },
}

interface AIOrbProps {
  /** Diameter in px. */
  size?: number
  state?: AIOrbState
  className?: string
}

export function AIOrb({ size = 120, state = 'idle', className = '' }: AIOrbProps) {
  const t = ORB_TUNING[state]

  // Bake per-state intensity into the gradient — see AuraRing comment for why.
  const a1 = (0.2 * t.glow * 1.6).toFixed(3)
  const a2 = (0.05 * t.glow * 1.6).toFixed(3)
  const haloStyle: CSSProperties = {
    background: `radial-gradient(circle, rgba(255,255,255,${a1}) 0%, rgba(255,255,255,${a2}) 42%, transparent 70%)`,
    animation: `aura-breathe ${t.shimmer} ease-in-out infinite`,
    willChange: 'transform, opacity',
  }

  return (
    <div
      className={`ai-orb relative grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="AI presence"
    >
      {/* Breathing halo */}
      <div className="absolute inset-[-28%] rounded-full pointer-events-none" style={haloStyle} />
      {/* Orbiting ring — SVG (reliable on iOS WebKit; conic+mask+rotate goes static there) */}
      <svg
        className="absolute inset-0"
        viewBox="0 0 100 100"
        aria-hidden
        style={{ animation: `aura-spin ${t.ring} linear infinite`, willChange: 'transform' }}
      >
        <circle
          cx="50" cy="50" r="49.25"
          fill="none" stroke="white" strokeOpacity="0.7"
          strokeWidth="1.5" strokeLinecap="round"
          pathLength={100}
          strokeDasharray="22 78"
        />
      </svg>
      {/* Orb body — luminous plasma sphere */}
      <div
        className="relative rounded-full"
        style={{
          width: '62%',
          height: '62%',
          background:
            'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.95) 0%, rgba(220,222,232,0.5) 45%, rgba(120,122,140,0.16) 70%, rgba(0,0,0,0) 100%)',
          boxShadow: 'inset 0 0 22px rgba(255,255,255,0.22), 0 0 34px rgba(255,255,255,0.15)',
          animation: `aura-orb-float ${t.float} ease-in-out infinite`,
        }}
      >
        {/* Inner counter-highlight shimmer */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle at 68% 72%, rgba(255,255,255,0.45) 0%, transparent 50%)',
            animation: `aura-orb-shimmer ${t.shimmer} ease-in-out infinite`,
          }}
        />
      </div>
    </div>
  )
}
