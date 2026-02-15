'use client'

import type { MindsetId } from '@/lib/mindset/types'

// Pure ambient backgrounds — no text, no icons, just atmosphere.
// Parent hero card handles all text overlay.

// ── Stoic: Marble columns with light rays ──
function StoicScene() {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden bg-gradient-to-b from-white/[0.03] to-black/60">
      {/* Columns */}
      {[10, 25, 42, 58, 75, 90].map((left, i) => (
        <div key={i} className="absolute bottom-0" style={{ left: `${left}%` }}>
          <div
            className="w-[2px] rounded-t-sm"
            style={{
              height: `${50 + (i % 3) * 25}px`,
              background: 'linear-gradient(to right, rgba(255,255,255,0.08), rgba(255,255,255,0.25), rgba(255,255,255,0.08))',
            }}
          />
          <div className="w-2.5 h-[2px] bg-white/15 rounded-sm -ml-[3.5px] -mt-px" />
        </div>
      ))}

      {/* Soft light rays */}
      {[15, 40, 65].map((left, i) => (
        <div
          key={`ray-${i}`}
          className="absolute top-0"
          style={{
            left: `${left}%`,
            width: '60px',
            height: '100%',
            background: 'linear-gradient(170deg, rgba(255,255,255,0.07), transparent 65%)',
            animation: `ray-sweep 6s ease-in-out infinite`,
            animationDelay: `${i * 2}s`,
          }}
        />
      ))}

      {/* Dust particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={`dust-${i}`}
          className="absolute rounded-full bg-white/20"
          style={{
            width: '1.5px',
            height: '1.5px',
            left: `${12 + i * 14}%`,
            bottom: `${25 + (i * 17) % 50}%`,
            animation: `float ${4 + (i % 3)}s ease-in-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  )
}

// ── Existentialist: Void with swirling particles ──
function ExistentialistScene() {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden bg-gradient-to-b from-black/20 to-black/60">
      {/* Central vortex */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full animate-[spin-slow_25s_linear_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%)' }}
      />

      {/* Orbiting particles */}
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i * 36) * (Math.PI / 180)
        const radius = 35 + (i % 3) * 20
        const cx = 50 + Math.cos(angle) * (radius / 2)
        const cy = 50 + Math.sin(angle) * (radius / 2.5)
        return (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${1.5 + (i % 3)}px`,
              height: `${1.5 + (i % 3)}px`,
              left: `${cx}%`,
              top: `${cy}%`,
              opacity: 0.15 + (i % 3) * 0.1,
              animation: `star-pulse ${3 + (i % 4)}s ease-in-out infinite`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        )
      })}

      {/* Dissolving text fragments */}
      {['?', '∞', '—'].map((char, i) => (
        <span
          key={i}
          className="absolute text-white/10 text-[10px] font-light"
          style={{
            left: `${20 + i * 25}%`,
            top: `${30 + (i * 19) % 40}%`,
            animation: `star-pulse ${5 + i}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}

// ── Cynic: Bonfire with rising embers ──
function CynicScene() {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden bg-gradient-to-b from-black/10 to-black/60">
      {/* Fire glow */}
      <div
        className="absolute bottom-0 left-1/2 -translate-x-1/2 w-36 h-28 rounded-full animate-[flicker_2.5s_ease-in-out_infinite]"
        style={{ background: 'radial-gradient(ellipse, rgba(255,255,255,0.08), transparent 70%)' }}
      />

      {/* Flame layers */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-1">
        {[
          { h: 24, w: 5, op: 0.35, delay: '0s' },
          { h: 32, w: 7, op: 0.45, delay: '0.3s' },
          { h: 26, w: 6, op: 0.25, delay: '0.6s' },
        ].map((f, i) => (
          <div
            key={i}
            className="rounded-full animate-[flicker_1.8s_ease-in-out_infinite]"
            style={{
              width: `${f.w}px`,
              height: `${f.h}px`,
              background: `linear-gradient(to top, rgba(255,255,255,${f.op}), transparent)`,
              animationDelay: f.delay,
            }}
          />
        ))}
      </div>

      {/* Rising embers */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={`ember-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            width: `${1 + (i % 2)}px`,
            height: `${1 + (i % 2)}px`,
            left: `${42 + (i * 3) % 16}%`,
            bottom: '35px',
            opacity: 0.2 + (i % 3) * 0.15,
            animation: `ember-rise ${2.5 + (i % 3)}s ease-out infinite`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}

      {/* Ground logs */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="w-11 h-1 bg-white/10 rounded-full -rotate-12" />
        <div className="w-9 h-1 bg-white/8 rounded-full rotate-6" />
      </div>

      <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  )
}

// ── Hedonist: Blooming garden ──
function HedonistScene() {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden bg-gradient-to-b from-white/[0.02] to-black/50">
      {/* Ground */}
      <div className="absolute bottom-0 w-full h-10 bg-gradient-to-t from-white/[0.03] to-transparent" />

      {/* Vines */}
      {[15, 38, 62, 85].map((left, i) => (
        <div key={`vine-${i}`} className="absolute bottom-0" style={{ left: `${left}%` }}>
          <div
            className="w-px bg-gradient-to-t from-white/10 to-transparent"
            style={{
              height: `${35 + (i * 18) % 45}px`,
              animation: `bloom-flower ${3.5 + i}s ease-out forwards`,
              animationDelay: `${i * 0.6}s`,
            }}
          />
        </div>
      ))}

      {/* Subtle flowers */}
      {['🌸', '🌺', '🌷'].map((flower, i) => (
        <div
          key={`flower-${i}`}
          className="absolute"
          style={{
            left: `${15 + i * 28}%`,
            bottom: `${28 + (i * 15) % 25}%`,
            animation: `bloom-flower ${2.5 + i * 0.5}s ease-out forwards`,
            animationDelay: `${0.8 + i * 1}s`,
            opacity: 0,
            fontSize: '12px',
          }}
        >
          {flower}
        </div>
      ))}

      {/* Floating petals */}
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={`petal-${i}`}
          className="absolute text-[10px]"
          style={{
            left: `${20 + i * 18}%`,
            top: '-8px',
            animation: `petal-fall ${5 + (i % 3)}s ease-in infinite`,
            animationDelay: `${i * 2}s`,
            opacity: 0.6,
          }}
        >
          🍃
        </span>
      ))}

      <div className="absolute bottom-0 w-full h-12 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  )
}

// ── Samurai: Ink wash with cherry blossoms ──
function SamuraiScene() {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden bg-gradient-to-b from-black/10 to-black/60">
      {/* Mountain silhouette */}
      <div className="absolute bottom-8 w-full">
        <svg viewBox="0 0 400 80" className="w-full h-20 opacity-10">
          <path d="M0,80 L60,35 L100,50 L160,15 L200,40 L260,25 L300,45 L340,20 L400,50 L400,80 Z" fill="white" />
        </svg>
      </div>

      {/* Ink wash circles */}
      {[25, 50, 72].map((left, i) => (
        <div
          key={`ink-${i}`}
          className="absolute rounded-full"
          style={{
            width: `${45 + i * 15}px`,
            height: `${45 + i * 15}px`,
            left: `${left}%`,
            top: `${28 + i * 10}%`,
            background: 'radial-gradient(circle, rgba(255,255,255,0.03), transparent 70%)',
            animation: `ink-spread ${4 + i}s ease-out forwards`,
            animationDelay: `${i * 1}s`,
          }}
        />
      ))}

      {/* Cherry blossoms — fewer, softer */}
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={`blossom-${i}`}
          className="absolute text-[10px]"
          style={{
            left: `${8 + i * 18}%`,
            top: '-8px',
            animation: `petal-fall ${4 + (i % 3)}s ease-in infinite`,
            animationDelay: `${i * 1.2}s`,
            opacity: 0.7,
          }}
        >
          🌸
        </span>
      ))}

      {/* Mist */}
      <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-black/30 to-transparent" />
      <div className="absolute top-1/3 w-full h-8 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent animate-[ray-sweep_10s_ease-in-out_infinite]" />
    </div>
  )
}

// ── Scholar: Constellations and cosmic depth ──
function ScholarScene() {
  return (
    <div className="relative w-full h-full min-h-[180px] overflow-hidden bg-gradient-to-b from-blue-950/30 to-black/60">
      {/* Deep sky gradient */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(30,58,138,0.15), transparent 70%)' }}
      />

      {/* Stars / constellation dots */}
      {[
        { x: 15, y: 20 }, { x: 28, y: 35 }, { x: 42, y: 18 }, { x: 55, y: 40 },
        { x: 68, y: 22 }, { x: 80, y: 38 }, { x: 35, y: 55 }, { x: 62, y: 60 },
        { x: 20, y: 65 }, { x: 75, y: 70 }, { x: 48, y: 75 }, { x: 88, y: 55 },
      ].map((star, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-200"
          style={{
            width: `${1.5 + (i % 3)}px`,
            height: `${1.5 + (i % 3)}px`,
            left: `${star.x}%`,
            top: `${star.y}%`,
            opacity: 0.2 + (i % 4) * 0.1,
            animation: `star-pulse ${3 + (i % 4)}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`,
          }}
        />
      ))}

      {/* Constellation lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="15" y1="20" x2="28" y2="35" stroke="white" strokeWidth="0.3" />
        <line x1="28" y1="35" x2="42" y2="18" stroke="white" strokeWidth="0.3" />
        <line x1="42" y1="18" x2="55" y2="40" stroke="white" strokeWidth="0.3" />
        <line x1="55" y1="40" x2="68" y2="22" stroke="white" strokeWidth="0.3" />
        <line x1="68" y1="22" x2="80" y2="38" stroke="white" strokeWidth="0.3" />
        <line x1="35" y1="55" x2="62" y2="60" stroke="white" strokeWidth="0.3" />
        <line x1="48" y1="75" x2="62" y2="60" stroke="white" strokeWidth="0.3" />
      </svg>

      {/* Central mandala glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full animate-[spin-slow_30s_linear_infinite]"
        style={{ background: 'radial-gradient(circle, rgba(147,197,253,0.06), transparent 70%)' }}
      />

      {/* Floating symbols */}
      {['☽', '☉', '♃'].map((sym, i) => (
        <span
          key={i}
          className="absolute text-white/[0.07] text-xs"
          style={{
            left: `${22 + i * 25}%`,
            top: `${25 + (i * 20) % 45}%`,
            animation: `float ${5 + i}s ease-in-out infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        >
          {sym}
        </span>
      ))}

      <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  )
}

// ── Main ──
interface PathSceneProps {
  mindsetId: MindsetId
}

export function PathScene({ mindsetId }: PathSceneProps) {
  switch (mindsetId) {
    case 'stoic': return <StoicScene />
    case 'existentialist': return <ExistentialistScene />
    case 'cynic': return <CynicScene />
    case 'hedonist': return <HedonistScene />
    case 'samurai': return <SamuraiScene />
    case 'scholar': return <ScholarScene />
  }
}
