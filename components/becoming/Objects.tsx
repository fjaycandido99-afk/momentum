'use client'

import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, PerformanceMonitor, MeshReflectorMaterial, RoundedBox, useGLTF, useTexture } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { Line2 } from 'three/examples/jsm/lines/Line2.js'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js'
import { promises, sculpt } from './store'
import { FallingLeaves, SoundRings, makeCoreFx, makeFx, useBonsaiFx, useBrainFx } from './artefactFx'
import { DEMO_START, drawScreen, SCREEN_H, SCREEN_W, type DemoState } from './phoneScreens'

// "The Art of Becoming": the five parts of Voxu as artefacts on stone
// pedestals (Meshy image-to-3D, compressed with meshopt), an inner cosmos in a
// black void: the AI Coach is the core, the other four are worlds riding slow
// gold orbits around it, with small dark moons, travelling beads of light and
// drifting rock. Tap one and the orbits stop, the camera flies to it and the
// rest falls back into the dark; scroll (or "Back to the universe") flies back
// out and the system turns again. Phones get their own tall arrangement.

type Id = 'column' | 'scroll' | 'brain' | 'bonsai' | 'headphones'
type Obj = {
  url: string
  h: number
  /** Its chapter (1..5). */
  chapter: number
  label: string
  /** One line on hover: the chapter's own headline, so it promises nothing new. */
  line: string
  phase: number
}
const OBJS: Record<Id, Obj> = {
  column: { url: '/models/column.glb', h: 1.4, chapter: 1, label: 'Daily Eras', line: 'Choose who you are becoming.', phase: 0 },
  scroll: { url: '/models/scroll.glb', h: 0.68, chapter: 2, label: 'Reflection', line: 'Every night, an honest answer.', phase: 1.3 },
  brain: { url: '/models/brain.glb', h: 1.3, chapter: 3, label: 'AI Coach', line: 'A coach that remembers your word.', phase: 2.6 },
  bonsai: { url: '/models/bonsai.glb', h: 1.3, chapter: 4, label: 'Habit Builder', line: 'Motivation fades. Your word remains.', phase: 3.9 },
  headphones: { url: '/models/headphones.glb', h: 1.05, chapter: 5, label: 'Guided Audio', line: 'Focus by day. Rest by night.', phase: 5.2 },
}
const IDS = Object.keys(OBJS) as Id[]
const BY_CHAPTER = Object.fromEntries(IDS.map((id) => [OBJS[id].chapter, id])) as Record<number, Id>

/** Where an object rides: which orbit (0 = the core), at what angle, raised by how much. */
type Seat = { s: number; th: number; lift: number }
type Layout = {
  overview: { cam: THREE.Vector3; look: THREE.Vector3; fov: number }
  /** The orbit plane: a point on it is c + a·cos θ·s + b·sin θ·s (b leans, so the far side rides higher). */
  orbit: { c: THREE.Vector3; a: THREE.Vector3; b: THREE.Vector3 }
  /** The rings drawn (orbit sizes); the worlds ride some of them. */
  rings: number[]
  /** Which rings carry a moon, and where. */
  moons: { s: number; th: number; r: number }[]
  /** The centrepiece at the orbits' centre: raised by how much, how tall. */
  core: { lift: number; h: number }
  seat: Record<Id, Seat>
  /** Wide screens turn the whole system; phones only sway, so nothing drifts behind the core or the words. */
  turns: boolean
  /** The orbit plane is a floor (wide): things stand on it rather than float, and the mirror floor sits at it. */
  grounded: boolean
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const deg = (d: number) => (d * Math.PI) / 180
const LAYOUTS: Record<'wide' | 'tall', Layout> = {
  wide: {
    overview: { cam: v(0, 3.3, 6.7), look: v(0, -0.05, -1.9), fov: 42 },
    // Flat: the orbit plane is the polished floor everything stands on.
    orbit: { c: v(0, -0.6, -1.75), a: v(4.3, 0, 0), b: v(0, 0, 2.3) },
    rings: [0.42, 0.84, 1, 1.18],
    moons: [
      { s: 0.42, th: deg(20), r: 0.07 },
      { s: 0.42, th: deg(200), r: 0.09 },
      { s: 0.84, th: deg(95), r: 0.1 },
      { s: 0.84, th: deg(250), r: 0.08 },
      { s: 0.84, th: deg(5), r: 0.1 },
      { s: 1.18, th: deg(60), r: 0.12 },
      { s: 1.18, th: deg(185), r: 0.11 },
      { s: 1.18, th: deg(290), r: 0.09 },
    ],
    // Five worlds around the core; the AI Coach on the outer ring at the back, off the core's shoulder.
    core: { lift: 0, h: 2.3 },
    seat: {
      column: { s: 1, th: deg(152), lift: 0 },
      scroll: { s: 1, th: deg(28), lift: 0 },
      bonsai: { s: 0.84, th: deg(208), lift: 0 },
      headphones: { s: 0.84, th: deg(312), lift: 0 },
      brain: { s: 1.18, th: deg(250), lift: 0 },
    },
    turns: true,
    grounded: true,
  },
  tall: {
    overview: { cam: v(0, 0.6, 9.6), look: v(0, 0.2, -1.6), fov: 50 },
    orbit: { c: v(0, -0.05, -1.6), a: v(1.6, 0, 0.2), b: v(0, 2.5, -0.2) },
    rings: [0.5, 1, 1.22],
    moons: [
      { s: 1.22, th: deg(120), r: 0.1 },
      { s: 1.22, th: deg(180), r: 0.13 },
      { s: 1.22, th: deg(0), r: 0.09 },
      { s: 1.22, th: deg(270), r: 0.11 },
    ],
    core: { lift: -0.35, h: 2.0 },
    seat: {
      // Beside the core rather than above and below it, so the bottom two stay clear of the words; the AI Coach on top.
      brain: { s: 1, th: deg(90), lift: 0 },
      column: { s: 1, th: deg(145), lift: 0 },
      headphones: { s: 1, th: deg(35), lift: 0 },
      bonsai: { s: 1, th: deg(215), lift: 0 },
      scroll: { s: 1, th: deg(325), lift: 0 },
    },
    turns: false,
    grounded: false,
  },
}
/** Which arrangement is on screen (set by the camera from the canvas shape). */
const layout = { tall: false }
const L = () => LAYOUTS[layout.tall ? 'tall' : 'wide']

/**
 * The system's motion, advanced by the Director every frame: `t` is orbit time,
 * which slows while a world is hovered and stops while one is open (so the
 * camera flies to a world that stays put).
 */
const orbit = { t: 0, speed: 1, hover: null as Id | null }
/** One turn in ten minutes on wide screens; phones sway ±11° over seventy seconds. */
const spin = () => (L().turns ? orbit.t * ((Math.PI * 2) / 600) : 0.2 * Math.sin((orbit.t * Math.PI * 2) / 70))
/** A point on an orbit of size s at angle th (before the system's spin). */
function orbitPoint(s: number, th: number, out: THREE.Vector3) {
  const o = L().orbit
  const a = th + spin()
  return out.copy(o.c).addScaledVector(o.a, Math.cos(a) * s).addScaledVector(o.b, Math.sin(a) * s)
}
/** Where the centrepiece stands (it doesn't orbit). */
function corePos(out = new THREE.Vector3()) {
  return out.copy(L().orbit.c).setY(L().orbit.c.y + L().core.lift)
}
/** The close shot of the centrepiece's face, for its reveal. */
function faceShot() {
  const at = corePos()
  const h = L().core.h
  const look = v(at.x, at.y + h * 0.8, at.z)
  const from = L().overview.cam
  const dir = v(from.x - look.x, (from.y - look.y) * 0.3, from.z - look.z).normalize()
  return { cam: look.clone().addScaledVector(dir, h * 1.15), look, fov: 34 }
}
/** Where an object is right now. */
function posOf(id: Id, out = new THREE.Vector3()) {
  const st = L().seat[id]
  orbitPoint(st.s, st.th, out)
  out.y += st.lift
  return out
}

/** The close shot for an object: in front of it (toward the overview camera), a little to one side and above. */
function shotFor(id: Id) {
  const o = OBJS[id]
  const at = posOf(id)
  const from = L().overview.cam
  const toCam = v(from.x - at.x, 0, from.z - at.z).normalize()
  const side = v(toCam.z, 0, -toCam.x)
  // The scroll is long and low: frame it by its width.
  const d = 1.8 + o.h * 1.1 * (id === 'scroll' ? 1.7 : 1)
  const cam = v(at.x, at.y + o.h * 0.72, at.z).addScaledVector(toCam, d).addScaledVector(side, d * 0.3)
  return { cam, look: v(at.x, at.y + o.h * 0.5, at.z), fov: 34 }
}

const ease = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** The flight between shots, shared with the objects and the ring. */
const flight = { pick: 0, k: 1 }

/**
 * The asteroid (Meshy, one model): its geometry centred and scaled to radius 1,
 * for every rock in the scene, each with its own fadeable copy of the material.
 * Rocks vary by turning and stretching it, so one model reads as many.
 */
function useAsteroid(opts: { fade: boolean }) {
  const { scene } = useGLTF('/models/asteroid.glb')
  return useMemo(() => {
    let mesh: THREE.Mesh | null = null
    scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    const m = mesh as unknown as THREE.Mesh
    const geo = m.geometry.clone()
    geo.computeBoundingSphere()
    const bs = geo.boundingSphere!
    geo.translate(-bs.center.x, -bs.center.y, -bs.center.z)
    geo.scale(1 / bs.radius, 1 / bs.radius, 1 / bs.radius)
    const mat = (m.material as THREE.MeshStandardMaterial).clone()
    if (opts.fade) {
      mat.transparent = true
      mat.opacity = 0
    }
    return { geo, mat }
  }, [scene, opts.fade])
}

/** A sphere whose front (facing +z) carries the planet photo: its outline meets the photo's edge exactly. */
const PLANET_GEO = (() => {
  const g = new THREE.SphereGeometry(1, 96, 64)
  const p = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) * 0.5, 0.5 + p.getY(i) * 0.5)
  return g
})()

/** A soft warm radial glow, shared by the light pools and the core's halo. */
let glowTex: THREE.CanvasTexture | null = null
function glowTexture() {
  if (glowTex) return glowTex
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,226,180,0.9)')
  gr.addColorStop(0.35, 'rgba(255,214,160,0.35)')
  gr.addColorStop(1, 'rgba(0,0,0,0)')
  x.fillStyle = gr
  x.fillRect(0, 0, 128, 128)
  glowTex = new THREE.CanvasTexture(c)
  return glowTex
}

const GOLD = '#C9AE82'
/** A thin flat ring (the halo under each pedestal), radius 1. */
const HALO_GEO = new THREE.RingGeometry(0.955, 1, 128)
const haloMaterial = () =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(1.9, 1.4, 0.75), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })

/** A model, scaled to its height and standing on the origin, with its own fadeable material. */
function useArtefact(url: string, h: number) {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    const model = scene.clone(true)
    const box = new THREE.Box3().setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const k = h / size.y
    const c = box.getCenter(new THREE.Vector3())
    model.scale.setScalar(k)
    model.position.set(-c.x * k, -box.min.y * k, -c.z * k)
    const mats: THREE.MeshStandardMaterial[] = []
    model.traverse((o) => {
      const me = o as THREE.Mesh
      if (!me.isMesh) return
      const m = (me.material as THREE.MeshStandardMaterial).clone()
      m.envMapIntensity = 1
      m.opacity = 0
      me.material = m
      mats.push(m)
    })
    // Its width, for effects placed at its sides.
    const width = (size.x / size.y) * h
    return { model, mats, width }
  }, [scene, h])
}

/** One object failing to load costs that object, not the scene. */
class Skip extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[becoming] an object failed to load', err)
  }
  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children
  }
}

/** Dragging across the scene turns the open artefact (with a little momentum). */
const drag = { down: false, x: 0, vel: 0, moved: 0 }

function DragSpin() {
  const gl = useThree((st) => st.gl)
  useMemo(() => {
    const el = gl.domElement
    const down = (e: PointerEvent) => {
      if (flight.pick === 0) return
      drag.down = true
      drag.x = e.clientX
      drag.moved = 0
    }
    const move = (e: PointerEvent) => {
      if (!drag.down) return
      const dx = e.clientX - drag.x
      drag.x = e.clientX
      drag.moved += Math.abs(dx)
      drag.vel = dx * 0.012
    }
    const up = () => {
      drag.down = false
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])
  useFrame((_, dt) => {
    if (!drag.down) drag.vel = THREE.MathUtils.damp(drag.vel, 0, 3, dt)
  })
  return null
}

/** Chapters already opened on this visit: their labels get a small gold mark. */
const seen = new Set<number>()

function Artefact({ id }: { id: Id }) {
  const o = OBJS[id]
  const { model, mats, width } = useArtefact(o.url, o.h)
  // Its own response to the visitor (brain, bonsai, headphones).
  const fx = useMemo(() => (id === 'brain' || id === 'bonsai' ? makeFx(id, model, mats) : null), [id, model, mats])
  const leaves = useRef<{ drop: (n: number) => void } | null>(null)
  useBrainFx(id === 'brain' ? fx : null, () => (flight.pick === o.chapter ? 1 : 0))
  useBonsaiFx(id === 'bonsai' ? fx : null, { drop: (n) => leaves.current?.drop(n) })
  const place = useRef<THREE.Group>(null)
  const float = useRef<THREE.Group>(null)
  const label = useRef<HTMLDivElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  const line = useRef<HTMLSpanElement>(null)
  const tick = useRef<HTMLSpanElement>(null)
  const st = useRef({ hover: 0, shown: 0, born: -1, solid: false })
  const [hovered, setHovered] = useState(false)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  // The halo it stands on.
  const haloR = Math.min(width * 0.6 + 0.05, o.h * 0.9)
  const haloMat = useMemo(() => haloMaterial(), [])
  const at = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = st.current
    if (s.born < 0) s.born = t
    const picked = flight.pick === o.chapter
    const someone = flight.pick !== 0
    if (picked) {
      seen.add(o.chapter)
      sculpt.core.opened = seen.size
    }
    if (hovered && !someone) orbit.hover = id
    else if (orbit.hover === id) orbit.hover = null
    // Where it rides on its orbit (the arrangement depends on the screen), facing the overview camera.
    posOf(id, at)
    const cam = L().overview.cam
    if (place.current) {
      place.current.position.copy(at)
      place.current.rotation.y = Math.atan2(cam.x - at.x, cam.z - at.z)
    }
    // Turning slowly; on phones (no floor) also drifting and bobbing around its
    // spot, while on a floor it stands still on its ring. The picked one settles.
    // With Reduce Motion on it still floats, at half the drift: the scene is
    // meant to be alive, and a slow float isn't the kind of motion that hurts.
    if (float.current) {
      const free = L().grounded ? 0 : (picked ? 1 - flight.k : 1) * (reduced ? 0.5 : 1)
      float.current.position.set(
        Math.sin(t * 0.31 + o.phase) * 0.16 * free,
        Math.sin(t * 0.83 + o.phase) * 0.1 * free,
        Math.cos(t * 0.27 + o.phase) * 0.12 * free,
      )
      float.current.rotation.y += dt * (0.1 + 0.45 * s.hover)
      float.current.rotation.z = Math.sin(t * 0.5 + o.phase) * 0.035 * free
    }
    if (float.current) {
      // You turn the open one by dragging.
      if (picked) float.current.rotation.y += drag.vel
      // It gives a small start when you do something in its demo...
      const u = (performance.now() - sculpt.react.at) / 900
      const jolt = sculpt.react.chapter === o.chapter && u >= 0 && u < 1 ? Math.sin(Math.PI * u) * (1 - u) : 0
      if (jolt > 0) float.current.rotation.y += dt * 4 * jolt
      // ...and the headphones move with the sound.
      const beat = o.chapter === 5 ? sculpt.audio * 0.05 : 0
      // A hovered world leans in a little.
      float.current.scale.setScalar(1 + 0.08 * jolt + beat + 0.06 * s.hover)
    }
    s.hover = THREE.MathUtils.damp(s.hover, hovered && !someone ? 1 : 0, 6, dt)
    // Fades in once loaded; falls back into the dark while another one is open.
    const want = Math.min(1, (t - s.born) / 1.2) * (someone && !picked ? 0 : 1)
    s.shown = THREE.MathUtils.damp(s.shown, want, 4, dt)
    const solid = s.shown > 0.995
    for (const m of mats) {
      m.opacity = s.shown
      if (s.solid !== solid) {
        m.transparent = !solid
        m.depthWrite = solid
      }
    }
    s.solid = solid
    if (place.current) place.current.visible = s.shown > 0.01
    // The halo: brighter on hover, faint while it is open, gone while another is.
    const ring = s.shown * (picked ? 0.3 : someone ? 0 : 0.42 + 0.5 * s.hover)
    haloMat.opacity = ring
    // Names only in the overview; brighter on hover, with its one line; a gold mark once explored.
    if (label.current) {
      label.current.style.opacity = !someone && flight.k > 0.6 ? String(0.72 + 0.28 * s.hover) : '0'
      label.current.style.pointerEvents = someone ? 'none' : 'auto'
    }
    if (line.current) line.current.style.opacity = s.hover < 0.03 ? '0' : String(s.hover)
    if (tick.current) tick.current.style.opacity = String(1 - s.hover)
    if (mark.current) mark.current.style.opacity = seen.has(o.chapter) ? '1' : '0'
  })
  const go = () => {
    if (flight.pick === 0) sculpt.jump?.(o.chapter)
  }
  return (
    <group ref={place}>
      <group ref={float}>
        <primitive object={model} />
        {id === 'bonsai' && <FallingLeaves h={o.h} api={leaves} />}
        {id === 'headphones' && <SoundRings h={o.h} w={width} />}
      </group>
      {/* The halo it floats over, with a bead of light at its front edge. */}
      <mesh geometry={HALO_GEO} material={haloMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={haloR} />
      <mesh position={[0, 0.012, haloR]} material={haloMat}>
        <sphereGeometry args={[0.028, 12, 8]} />
      </mesh>
      {/* What you tap: a plain box around the object (cheaper than the object itself). */}
      <mesh
        position={[0, o.h / 2, 0]}
        onClick={(e) => {
          e.stopPropagation()
          go()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          if (flight.pick === 0) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[o.h * 1.1, o.h * 1.25, o.h * 1.1]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {/* Hung from the halo's front edge: the name, then a dotted line down, or its one line on hover. */}
      <Html position={[0, 0, haloR]} zIndexRange={[5, 0]}>
        <div
          ref={label}
          style={{ opacity: 0, transition: 'opacity 0.5s', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
        >
          <button
            onClick={go}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            style={{
              color: GOLD,
              font: '600 11px/1 Inter, system-ui, sans-serif',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              background: 'none',
              border: 0,
              padding: '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <span ref={mark} aria-hidden style={{ opacity: 0, width: 5, height: 5, borderRadius: 9, background: GOLD, transition: 'opacity 0.5s' }} />
            {o.label}
          </button>
          <span ref={tick} aria-hidden style={{ width: 0, height: 18, borderLeft: `1px dotted ${GOLD}`, opacity: 1 }} />
          <span
            ref={line}
            style={{
              position: 'absolute',
              top: 32,
              opacity: 0,
              color: 'rgba(255,255,255,0.82)',
              font: 'italic 500 15px/1.2 var(--font-cormorant), Georgia, serif',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              textShadow: '0 1px 8px rgba(0,0,0,0.9)',
            }}
          >
            {o.line}
          </span>
        </div>
      </Html>
    </group>
  )
}

// ---- The centrepiece ------------------------------------------------------
// The unfinished self: a marble bust at the centre of the orbits, partly still
// raw stone. Every world the visitor opens carves a little more of it (a gold
// seam runs along the line, the new part glints, chips fly off into orbit);
// it never finishes. Once all five
// worlds are opened, the camera goes in close to its face and back out, and
// the page says what it means. Tapping it plays that too.

const CORE_URL = '/models/core.glb'
/** How much is carved: half to start (the face is already there), more per world opened, never all of it. */
const carvedFor = (opened: number) => 0.5 + 0.4 * Math.min(1, opened / 5)
/** Its moment, in seconds: in close by 2.2, held until 4.4, back out by 7.2. */
const REVEAL = { in: 2.2, hold: 4.4, out: 7.2 }
function revealAmount() {
  const at = sculpt.core.reveal
  if (!at) return 0
  const u = (performance.now() - at) / 1000
  if (u < 0 || u > REVEAL.out) return 0
  if (u < REVEAL.in) return ease(u / REVEAL.in)
  if (u < REVEAL.hold) return 1
  return 1 - ease((u - REVEAL.hold) / (REVEAL.out - REVEAL.hold))
}
function startReveal() {
  if (flight.pick !== 0 || revealAmount() > 0) return
  sculpt.core.reveal = performance.now()
  sculpt.core.onReveal?.()
}

/** Drives a centrepiece model (or the stand-in): the carving, fading with the system. */
function useCoreBody(model: THREE.Object3D, mats: THREE.MeshStandardMaterial[]) {
  const fx = useMemo(() => makeCoreFx(model, mats), [model, mats])
  const st = useRef({ shown: 0, born: -1, solid: false, opened: -1, from: carvedFor(0), to: carvedFor(0), at: -99 })
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = st.current
    if (s.born < 0) s.born = t
    const u = fx.uniforms
    // It carves only where it can be seen: back in the overview.
    const opened = sculpt.core.opened
    if (opened !== s.opened && flight.pick === 0 && flight.k > 0.7) {
      const first = s.opened === -1
      s.from = first ? carvedFor(opened) : u.uDone.value
      s.to = carvedFor(opened)
      s.at = first ? -99 : t
      s.opened = opened
      if (!first && s.to > s.from) core.chip(t, 3)
    }
    const since = t - s.at
    u.uDone.value = s.from + (s.to - s.from) * ease(since / 2.2)
    u.uFrom.value = s.from
    u.uFresh.value = s.to > s.from ? Math.max(0, 1 - Math.max(0, since - 0.4) / 2.4) : 0
    u.uLight.value = THREE.MathUtils.damp(u.uLight.value, revealAmount(), 3, dt)
    // Every world opened and the carving shown: its moment, once.
    if (opened >= 5 && !core.autoRevealed && flight.pick === 0 && flight.k > 0.95 && since > 2.6) {
      core.autoRevealed = true
      startReveal()
    }
    const want = Math.min(1, (t - s.born) / 1.2) * (flight.pick === 0 ? 1 : 0)
    s.shown = THREE.MathUtils.damp(s.shown, want, 4, dt)
    const solid = s.shown > 0.995
    for (const m of mats) {
      m.opacity = s.shown
      if (s.solid !== solid) {
        m.transparent = !solid
        m.depthWrite = solid
      }
    }
    s.solid = solid
    model.visible = s.shown > 0.01
  })
}

/** Shared between the centrepiece's parts. */
const core = {
  /** Send n chips of stone off the bust into orbit. */
  chip: (_t: number, _n: number) => {},
  autoRevealed: false,
}

function CoreModel() {
  // Normalised to height 1; the group around it scales it to the layout.
  const { model, mats } = useArtefact(CORE_URL, 1)
  useCoreBody(model, mats)
  return <primitive object={model} />
}

/** Until the real bust exists: a plain turned bust shape, carved the same way. */
function CoreStandIn() {
  const { model, mats } = useMemo(() => {
    const prof = [
      [0, 0], [0.36, 0], [0.36, 0.12], [0.3, 0.14], [0.13, 0.17], [0.11, 0.24], [0.3, 0.3], [0.34, 0.4],
      [0.24, 0.47], [0.11, 0.52], [0.1, 0.6], [0.16, 0.66], [0.19, 0.76], [0.17, 0.88], [0.1, 0.96], [0, 1],
    ].map(([x, y]) => new THREE.Vector2(x, y))
    const geo = new THREE.LatheGeometry(prof, 64)
    geo.computeVertexNormals()
    const m = new THREE.MeshStandardMaterial({ color: '#efebe4', roughness: 0.3, metalness: 0, envMapIntensity: 1, transparent: true, opacity: 0 })
    const g = new THREE.Group()
    g.add(new THREE.Mesh(geo, m))
    return { model: g, mats: [m] }
  }, [])
  useCoreBody(model, mats)
  return <primitive object={model} />
}

/** Chips of stone circling low around the plinth (clear of the face); more break away as it is carved. */
function Fragments() {
  const N = 22
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { geo, mat } = useAsteroid({ fade: true })
  const bits = useMemo(
    () =>
      Array.from({ length: N }, (_, i) => ({
        r: 0.4 + Math.random() * 0.25,
        y: 0.04 + Math.random() * 0.26,
        th: Math.random() * Math.PI * 2,
        w: (0.12 + Math.random() * 0.15) * (Math.random() < 0.5 ? -1 : 1),
        tilt: (Math.random() - 0.5) * 0.5,
        size: 0.012 + Math.random() * 0.025,
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        // The first six are already out; the rest wait to be carved off.
        born: i < 6 ? -99 : Infinity,
      })),
    [],
  )
  core.chip = (t, n) => {
    let left = n
    for (const b of bits) {
      if (left <= 0) break
      if (b.born === Infinity) {
        b.born = t + (n - left) * 0.15
        left--
      }
    }
  }
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), from: new THREE.Vector3(), sc: new THREE.Vector3() }), [])
  useFrame(({ clock }, dt) => {
    const im = mesh.current
    if (!im) return
    const t = clock.elapsedTime
    const { m, q, p, from, sc } = tmp
    mat.opacity = systemShown()
    bits.forEach((b, i) => {
      const age = t - b.born
      b.th += dt * b.w
      b.rot.x += dt * 0.6
      b.rot.y += dt * 0.4
      p.set(Math.cos(b.th) * b.r, b.y + Math.sin(b.th) * b.tilt * b.r, Math.sin(b.th) * b.r)
      if (age < 2) {
        // Breaking off the surface and drifting out into its orbit.
        from.set(Math.cos(b.th) * 0.12, b.y, Math.sin(b.th) * 0.12)
        p.lerpVectors(from, p, ease(Math.max(0, age) / 2))
      }
      q.setFromEuler(b.rot)
      sc.setScalar(age >= 0 ? b.size : 0)
      m.compose(p, q, sc)
      im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, mat, N]} frustumCulled={false} />
}

function Core() {
  const group = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const halos = useMemo(() => [haloMaterial(), haloMaterial()], [])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    corePos(g.position)
    g.scale.setScalar(L().core.h)
    // Faces the overview camera, turning slowly a little either way.
    const cam = L().overview.cam
    g.rotation.y = Math.atan2(cam.x - g.position.x, cam.z - g.position.z) + Math.sin(clock.elapsedTime * 0.12) * 0.35
    const shown = systemShown()
    const breath = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 0.6)
    const rev = revealAmount()
    halos[0].opacity = shown * 0.45
    halos[1].opacity = shown * 0.2
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = shown * (0.13 + 0.12 * rev) * breath
    if (lamp.current) lamp.current.intensity = shown * (2.4 + 3 * rev) * breath
  })
  return (
    <group ref={group}>
      <Skip fallback={<CoreStandIn />}>
        <Suspense fallback={null}>
          <CoreModel />
        </Suspense>
      </Skip>
      <Suspense fallback={null}>
        <Fragments />
      </Suspense>
      <mesh geometry={HALO_GEO} material={halos[0]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} scale={0.38} />
      <mesh geometry={HALO_GEO} material={halos[1]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} scale={0.5} />
      {/* Warm light from within: a glow behind it and a lamp on its face and the nearest worlds. */}
      <mesh ref={glow} position={[0, 0.55, -0.25]} scale={1.6}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTexture()} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </mesh>
      <pointLight ref={lamp} position={[0, 0.45, 0.55]} color="#ffc98a" intensity={0} distance={6} decay={2} />
      {/* What you tap. */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={(e) => {
          e.stopPropagation()
          startReveal()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (flight.pick === 0) document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <boxGeometry args={[0.6, 1, 0.6]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </group>
  )
}

/** How much of the system shows: all of it in the overview, nothing while a world is open. */
const systemShown = () => (flight.pick === 0 ? flight.k : 1 - flight.k)

/**
 * The orbits: thin gold rings around the core, beads of light travelling along
 * them, small dark moons riding them. A hovered world's ring brightens. It all
 * fades while a world is open.
 */
function Orbits() {
  const BEADS = 3
  const size = useThree((st) => st.size)
  const gl = useThree((st) => st.gl)
  // Every ring the layouts draw, made once; each frame lays
  // the visible ones onto the current orbit plane (only when it changes).
  const { rings, beads } = useMemo(() => {
    const rings = Array.from({ length: 5 }, () => {
      // Opaque, faded by colour: on the black a dark line is no line, and a
      // transparent one doubles up where its segments overlap, beading the ring.
      const mat = new LineMaterial({ linewidth: 1.6, toneMapped: false, fog: false })
      const line = new Line2(new LineGeometry(), mat)
      line.frustumCulled = false
      // After the floor, which would otherwise paint over the half of each ring below the horizon.
      line.renderOrder = 2
      return { line, mat, s: -1, tall: false, lit: 0 }
    })
    const n = rings.length * BEADS
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const seeds = Array.from({ length: n }, (_, i) => ({ th: Math.random() * Math.PI * 2, w: (0.04 + Math.random() * 0.08) * (i % 2 ? 1 : 1.3) }))
    return { rings, beads: { g, seeds } }
  }, [])
  // Gold dust strewn through the orbits.
  const dust = useMemo(() => {
    const n = LIGHT ? 260 : 700
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const seeds = Array.from({ length: n }, () => ({ s: 0.25 + Math.pow(Math.random(), 0.7) * 1.35, th: Math.random() * Math.PI * 2, y: Math.random() * (Math.random() < 0.8 ? 0.2 : 1.1) }))
    return { g, seeds }
  }, [])
  const beadMat = useRef<THREE.PointsMaterial>(null)
  const dustMat = useRef<THREE.PointsMaterial>(null)
  const moons = useRef<(THREE.Mesh | null)[]>([])
  const moonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1714', metalness: 0.75, roughness: 0.32, envMapIntensity: 1.3, transparent: true, opacity: 0 }), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const pts = useMemo(() => new Float32Array(201 * 3), [])
  useFrame((_, dt) => {
    const lay = L()
    const shown = systemShown()
    const hoverS = orbit.hover ? lay.seat[orbit.hover].s : -1
    const turn = spin()
    rings.forEach((r, i) => {
      const s = lay.rings[i]
      r.line.visible = s !== undefined && shown > 0.01
      if (!r.line.visible) return
      // In drawing-buffer pixels: on a 2x or 3x screen a CSS-pixel width falls under one device pixel and breaks into dots.
      const dpr = gl.getPixelRatio()
      r.mat.resolution.set(size.width * dpr, size.height * dpr)
      r.mat.linewidth = 1.6 * dpr
      if (r.s !== s || r.tall !== layout.tall) {
        // The circle at this size on the orbit plane (it doesn't turn: a circle looks the same turned).
        for (let k = 0; k <= 200; k++) {
          orbitPoint(s, (k / 200) * Math.PI * 2 - turn, p)
          pts.set([p.x, p.y, p.z], k * 3)
        }
        ;(r.line.geometry as LineGeometry).setPositions(pts)
        r.s = s
        r.tall = layout.tall
      }
      // Inner rings a touch brighter; the hovered world's ring glows.
      const lit = s === hoverS ? 1 : 0.42 - i * 0.04
      r.lit = THREE.MathUtils.damp(r.lit, lit * shown, 6, dt)
      // Gold above white, so the bloom catches it.
      r.mat.color.setRGB(1.75 * r.lit, 1.25 * r.lit, 0.66 * r.lit)
    })
    const pos = beads.g.attributes.position as THREE.BufferAttribute
    beads.seeds.forEach((sd, i) => {
      const s = lay.rings[Math.floor(i / BEADS)]
      if (s === undefined) {
        pos.setXYZ(i, 0, -999, 0)
        return
      }
      // Beads keep moving even while the system is held still: the cosmos stays alive.
      sd.th += dt * sd.w
      orbitPoint(s, sd.th - turn, p)
      pos.setXYZ(i, p.x, p.y, p.z)
    })
    pos.needsUpdate = true
    const dpos = dust.g.attributes.position as THREE.BufferAttribute
    dust.seeds.forEach((d, i) => {
      orbitPoint(d.s, d.th, p)
      dpos.setXYZ(i, p.x, p.y + d.y, p.z)
    })
    dpos.needsUpdate = true
    if (beadMat.current) beadMat.current.opacity = shown
    if (dustMat.current) dustMat.current.opacity = 0.75 * shown
    moonMat.opacity = shown
    moonMat.transparent = shown < 0.995
    moons.current.forEach((me, i) => {
      if (!me) return
      const mo = lay.moons[i]
      me.visible = !!mo && shown > 0.01
      if (!mo) return
      orbitPoint(mo.s, mo.th, me.position)
      if (lay.grounded) me.position.y += mo.r
      me.scale.setScalar(mo.r)
    })
  })
  return (
    <>
      {rings.map((r, i) => (
        <primitive key={i} object={r.line} />
      ))}
      <points geometry={beads.g} frustumCulled={false}>
        <pointsMaterial ref={beadMat} size={0.09} color={new THREE.Color(2.4, 1.85, 1.1)} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} sizeAttenuation />
      </points>
      <points geometry={dust.g} frustumCulled={false}>
        <pointsMaterial ref={dustMat} size={0.022} color={new THREE.Color(1.5, 1.15, 0.7)} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} sizeAttenuation />
      </points>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          ref={(me) => {
            moons.current[i] = me
          }}
          material={moonMat}
          visible={false}
        >
          <sphereGeometry args={[1, 32, 20]} />
        </mesh>
      ))}
    </>
  )
}

/** Dark stone fragments drifting at the edge of the system, slowly tumbling. */
function Rocks() {
  const N = LIGHT ? 14 : 28
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { geo, mat } = useAsteroid({ fade: false })
  const rocks = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        // In a loose band beyond the outer ring, a few near the lens.
        s: 1.35 + Math.random() * 0.8,
        th: Math.random() * Math.PI * 2,
        y: 0.15 + Math.random() * 1.1,
        r: 0.03 + Math.pow(Math.random(), 3) * 0.16,
        stretch: new THREE.Vector3(0.75 + Math.random() * 0.5, 0.6 + Math.random() * 0.5, 0.75 + Math.random() * 0.5),
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        tumble: (Math.random() - 0.5) * 0.3,
      })),
    [N],
  )
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), sc: new THREE.Vector3() }), [])
  useFrame((_, dt) => {
    const im = mesh.current
    if (!im) return
    const { m, q, p, sc } = tmp
    rocks.forEach((r, i) => {
      r.rot.x += dt * r.tumble
      r.rot.y += dt * r.tumble * 0.7
      orbitPoint(r.s, r.th, p)
      p.y += r.y
      q.setFromEuler(r.rot)
      sc.copy(r.stretch).multiplyScalar(r.r)
      m.compose(p, q, sc)
      im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, mat, N]} frustumCulled={false} />
}

/** A band of the galaxy across the upper sky: dense faint stars and soft warm clouds, no edges. */
function Galaxy() {
  const { stars, clouds } = useMemo(() => {
    // The band's great circle runs through these two directions (upper left, upper right).
    const d1 = v(-0.75, 0.25, -1).normalize()
    const d2 = v(0.85, 0.75, -1).normalize()
    const n = new THREE.Vector3().crossVectors(d1, d2).normalize()
    const u = d1.clone()
    const w = new THREE.Vector3().crossVectors(n, u).normalize()
    const N = LIGHT ? 1600 : 4200
    const p = new Float32Array(N * 3)
    const c = new Float32Array(N * 3)
    const dir = new THREE.Vector3()
    // Gaussian-ish spread across the band.
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5
    for (let i = 0; i < N; i++) {
      // Mostly along the visible arc, from upper left to upper right.
      const a = -0.25 + Math.random() * 1.7
      dir.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a)).addScaledVector(n, g() * 0.13).normalize()
      const r = 38 + Math.random() * 6
      p.set([dir.x * r, dir.y * r, dir.z * r], i * 3)
      const b = 0.25 + Math.random() * 0.55
      c.set([b, b * 0.94, b * 0.86], i * 3)
    }
    const sg = new THREE.BufferGeometry()
    sg.setAttribute('position', new THREE.BufferAttribute(p, 3))
    sg.setAttribute('color', new THREE.BufferAttribute(c, 3))
    const clouds = Array.from({ length: LIGHT ? 8 : 16 }, () => {
      const a = Math.random() * 1.5 - 0.15
      const d = u.clone().multiplyScalar(Math.cos(a)).addScaledVector(w, Math.sin(a)).addScaledVector(n, g() * 0.06).normalize()
      return { pos: d.multiplyScalar(36), s: 6 + Math.random() * 10, o: 0.05 + Math.random() * 0.06 }
    })
    return { stars: sg, clouds }
  }, [])
  const camera = useThree((st) => st.camera)
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    for (const m of refs.current) if (m) m.quaternion.copy(camera.quaternion)
  })
  return (
    <>
      <points geometry={stars}>
        <pointsMaterial size={0.06} vertexColors transparent opacity={0.8} depthWrite={false} fog={false} sizeAttenuation />
      </points>
      {clouds.map((cl, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          position={cl.pos}
          scale={cl.s}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={glowTexture()} color="#c9b8a0" transparent opacity={cl.o} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </>
  )
}

/**
 * The frame around the system, held in front of the lens: two great dark
 * planets cut by the corners, a cluster of stone low on the left and a few
 * out-of-focus specks of gold. It belongs to the overview and fades when a
 * world is opened.
 */
function Foreground() {
  const group = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const tex = useTexture('/textures/planet.webp')
  // The photo is lit already; dimmed, so the scene's own warm rim light reads on it.
  const planetMat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace
    return new THREE.MeshStandardMaterial({ map: tex, color: '#8a8a8a', roughness: 0.4, metalness: 0.3, envMapIntensity: 0.6, transparent: true, opacity: 0, fog: false })
  }, [tex])
  const { geo: rockGeo, mat: rockMat } = useAsteroid({ fade: true })
  const bokehMat = useMemo(() => new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#e8b766', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }), [])
  // Where things sit on screen (-1..1 each way) and how far from the lens.
  const items = useMemo(
    () => [
      { kind: 'planet', nx: -1.08, ny: 0.62, d: 16, r: 2.6 },
      { kind: 'planet', nx: 1.04, ny: -1.02, d: 12, r: 2.8 },
      ...Array.from({ length: 9 }, () => ({ kind: 'rock', nx: -0.98 + Math.random() * 0.35, ny: -0.95 + Math.random() * 0.5, d: 5 + Math.random() * 3, r: 0.05 + Math.random() * 0.16 })),
      ...Array.from({ length: 7 }, () => ({ kind: 'bokeh', nx: -1 + Math.random() * 0.5, ny: -1 + Math.random() * 0.45, d: 3.2, r: 0.12 + Math.random() * 0.28 })),
    ],
    [],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    // Phones keep only the upper planet: there is no room for the rest beside the words.
    const shown = systemShown()
    g.visible = shown > 0.01
    g.position.copy(camera.position)
    g.quaternion.copy(camera.quaternion)
    const cam = camera as THREE.PerspectiveCamera
    const tanH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const aspect = size.width / size.height
    items.forEach((it, i) => {
      const m = refs.current[i]
      if (!m) return
      m.visible = !layout.tall || i === 0
      m.position.set(it.nx * tanH * aspect * it.d, it.ny * tanH * it.d, -it.d)
      m.scale.setScalar(it.r)
      if (it.kind === 'rock') m.rotation.set(clock.elapsedTime * 0.05 + i, clock.elapsedTime * 0.04 + i * 2, 0)
    })
    planetMat.opacity = shown
    rockMat.opacity = shown
    bokehMat.opacity = 0.22 * shown
  })
  return (
    <group ref={group}>
      {items.map((it, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          material={it.kind === 'planet' ? planetMat : it.kind === 'rock' ? rockMat : bokehMat}
          geometry={it.kind === 'rock' ? rockGeo : it.kind === 'planet' ? PLANET_GEO : undefined}
        >
          {it.kind === 'bokeh' && <planeGeometry args={[1, 1]} />}
        </mesh>
      ))}
    </group>
  )
}

function Director() {
  const { camera, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const fly = useRef({ pick: -1, t0: 0, fromPos: new THREE.Vector3(), fromLook: new THREE.Vector3(), fromFov: 44, look: new THREE.Vector3(), tall: false })
  const fx = useRef({ shake: 0 })
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), l: new THREE.Vector3(), r: new THREE.Vector3() }), [])

  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const f = fly.current
    layout.tall = size.width / size.height < 0.85
    const want = sculpt.pick
    // The system turns: slower while a world is hovered, held still while one is
    // open. Reduce Motion halves it (a slow orbit is calm motion, not the kind that hurts).
    orbit.speed = THREE.MathUtils.damp(orbit.speed, want !== 0 ? 0 : orbit.hover ? 0.25 : 1, want !== 0 ? 5 : 1.5, dt)
    orbit.t += Math.min(dt, 0.1) * orbit.speed * (reduced ? 0.5 : 1)
    if (want !== f.pick || layout.tall !== f.tall) {
      // A new flight starts from wherever the camera is now (the first shot starts in place).
      const first = f.pick === -1 || layout.tall !== f.tall
      const start = want === 0 ? L().overview : shotFor(BY_CHAPTER[want])
      f.fromPos.copy(first ? start.cam : cam.position)
      f.fromLook.copy(first ? start.look : f.look)
      f.fromFov = first ? start.fov : cam.fov
      f.pick = want
      f.tall = layout.tall
      f.t0 = t
    }
    const target = want === 0 ? L().overview : shotFor(BY_CHAPTER[want])
    // Reduce Motion: a shorter, flatter glide rather than a jump cut.
    const k = ease((t - f.t0) / (reduced ? 1.1 : 1.7))
    flight.pick = want
    flight.k = k
    const { p, l, r } = tmp
    p.lerpVectors(f.fromPos, target.cam, k)
    l.lerpVectors(f.fromLook, target.look, k)
    // The centrepiece's moment: in close to its face, and back out.
    const rev = want === 0 ? revealAmount() : 0
    if (rev > 0) {
      const face = faceShot()
      p.lerp(face.cam, rev)
      l.lerp(face.look, rev)
    }
    // Rise a little in the middle of the flight, like a crane.
    p.y += Math.sin(k * Math.PI) * (reduced ? 0.15 : 0.6)
    f.look.copy(l)
    if (!reduced) {
      // A slow breath, and gentle depth parallax with the pointer.
      p.x += Math.sin(t * 0.23) * 0.03 + sculpt.pointer.x * 0.18
      p.y += Math.sin(t * 0.19 + 1) * 0.02 + sculpt.pointer.y * 0.1
    }
    if (promises.strikeRequested) {
      promises.strikeRequested = false
      fx.current.shake = 1
    }
    fx.current.shake = THREE.MathUtils.damp(fx.current.shake, 0, 5, dt)
    p.x += Math.sin(t * 61) * 0.02 * fx.current.shake
    p.y += Math.cos(t * 47) * 0.015 * fx.current.shake

    // Close shots sit beside the words: right of centre on wide screens,
    // high and a little further back on phones. The overview is centred.
    const wide = size.width >= 1024 && size.width / size.height > 1.2
    const close = want === 0 ? 1 - k : k
    // Wide screens share the view with the words and the phone: back off a little.
    // Phones: the artefact sits centred behind the words, whole.
    p.sub(l).multiplyScalar(1 + (wide ? 0.45 : 0.6) * close).add(l)
    cam.position.copy(p)
    cam.fov = THREE.MathUtils.lerp(THREE.MathUtils.lerp(f.fromFov, target.fov, k), 34, rev)
    const half = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * p.distanceTo(l)
    cam.lookAt(l)
    r.setFromMatrixColumn(cam.matrixWorld, 0)
    if (wide) l.addScaledVector(r, -half * (size.width / size.height) * 0.1 * close)
    cam.lookAt(l)
    cam.updateProjectionMatrix()
  })

  return (
    <>
      {/* Clean studio light: a soft sky fill, a warm key from the front-left, a cool rim behind. */}
      <hemisphereLight args={['#fff6ea', '#1a140e', 0.7]} />
      <directionalLight position={[-4, 6, 7]} intensity={1.6} color="#fff1e0" />
      <directionalLight position={[5, 3, 6]} intensity={0.5} color="#ffffff" />
      <directionalLight position={[2, 5, -8]} intensity={2.2} color="#ffbf6e" />
    </>
  )
}

/** Very sparse dust, in front of the lens. */
function Dust() {
  const ref = useRef<THREE.Points>(null)
  const { camera } = useThree()
  const geo = useMemo(() => {
    const n = 40
    const p = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      p[i * 3] = (Math.random() - 0.5) * 3
      p[i * 3 + 1] = (Math.random() - 0.5) * 2
      p[i * 3 + 2] = -0.8 - Math.random() * 2.5
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    return g
  }, [])
  useFrame(({ clock }) => {
    const pts = ref.current
    if (!pts) return
    pts.position.copy(camera.position)
    pts.quaternion.copy(camera.quaternion)
    pts.translateY(((clock.elapsedTime * 0.02) % 0.4) - 0.2)
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.007} color="#e3cfa8" transparent opacity={0.25} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}


// ---- The phone ------------------------------------------------------------
// A real 3D phone (titanium frame, black glass, the Dynamic Island) with the
// chapter's Voxu screen drawn onto the glass (phoneScreens.ts), redrawn as
// the visitor uses the demo. On wide screens it floats beside the open
// artefact, a little toward the camera; on phones it is brought up close when
// asked for ("See it in Voxu").
const PW = 1.04
const PH = 2.16
const PD = 0.1
const PR = 0.17
function roundedRectGeometry(w: number, h: number, r: number) {
  const sh = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  sh.moveTo(x + r, y)
  sh.lineTo(x + w - r, y)
  sh.quadraticCurveTo(x + w, y, x + w, y + r)
  sh.lineTo(x + w, y + h - r)
  sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  sh.lineTo(x + r, y + h)
  sh.quadraticCurveTo(x, y + h, x, y + h - r)
  sh.lineTo(x, y + r)
  sh.quadraticCurveTo(x, y, x + r, y)
  const g = new THREE.ShapeGeometry(sh, 16)
  const pos = g.attributes.position
  const uv = g.attributes.uv
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h)
  return g
}

function Phone3D() {
  const g = useRef<THREE.Group>(null)
  const { camera, size } = useThree()
  const screenGeo = useMemo(() => roundedRectGeometry(PW - 0.1, PH - 0.1, PR - 0.06), [])
  const glassGeo = useMemo(() => roundedRectGeometry(PW - 0.03, PH - 0.03, PR - 0.015), [])
  const { canvas, tex, mat } = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = SCREEN_W
    c.height = SCREEN_H
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 16
    t.minFilter = THREE.LinearMipmapLinearFilter
    t.generateMipmaps = true
    // Just under the glow threshold: the white type stays sharp instead of blooming.
    return { canvas: c, tex: t, mat: new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.8, 0.8, 0.8), toneMapped: false, transparent: true, opacity: 0 }) }
  }, [])
  const st = useRef({ v: -1, shown: 0, pos: new THREE.Vector3(), q: new THREE.Quaternion(), placed: false, lastId: 'brain' as Id })
  const tmp = useMemo(() => ({ d: new THREE.Vector3(), r: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), m: new THREE.Matrix4(), target: new THREE.Vector3(), q: new THREE.Quaternion() }), [])
  const fadeMats = useRef<THREE.Material[]>([])
  const label = useRef<HTMLParagraphElement>(null)
  // The screen itself is a real canvas element placed on the glass (sharp text at any size).
  const dom = useRef<HTMLCanvasElement>(null)
  const domWrap = useRef<HTMLDivElement>(null)
  const draw = () => {
    const ph = sculpt.phone
    const target = dom.current ?? canvas
    if (ph.section) drawScreen(target, ph.section, (ph.demo as DemoState) ?? DEMO_START)
    tex.needsUpdate = true
  }
  useMemo(() => {
    document.fonts?.ready.then(draw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(({ clock }, dt) => {
    const s = st.current
    const ph = sculpt.phone
    if (ph.v !== s.v) {
      s.v = ph.v
      draw()
    }
    const wide = size.width >= 1024 && size.width / size.height > 1.2
    const open = flight.pick !== 0 && !!ph.section && flight.k > 0.55
    const want = open && (wide || ph.focus) ? 1 : 0
    s.shown = THREE.MathUtils.damp(s.shown, want, want ? 3 : 8, Math.min(dt, 0.25))
    const grp = g.current
    if (!grp) return
    grp.visible = s.shown > 0.01
    // The screen and its caption are page elements: hide them with the phone,
    // or they stay floating where the phone was.
    if (domWrap.current) {
      domWrap.current.style.opacity = String(s.shown)
      domWrap.current.style.visibility = grp.visible ? 'visible' : 'hidden'
    }
    if (label.current) label.current.style.opacity = String(ph.focus || !grp.visible ? 0 : s.shown)
    if (!grp.visible) {
      s.placed = false
      return
    }
    const t = clock.elapsedTime
    const { d, r, up, m, target, q } = tmp
    let scale = 1
    if (ph.focus && !wide) {
      // Brought close, in front of the lens, filling most of the screen.
      camera.getWorldDirection(d)
      const dist = 2.6
      target.copy(camera.position).addScaledVector(d, dist)
      const visH = 2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * dist
      scale = Math.min((0.72 * visH) / PH, (0.8 * visH * (size.width / size.height)) / PW)
      m.lookAt(camera.position, target, up)
      q.setFromRotationMatrix(m)
    } else {
      // Beside the open artefact, a little toward the camera, to its right.
      // While it fades out after closing, it stays beside the artefact it belonged to.
      if (flight.pick !== 0) s.lastId = BY_CHAPTER[flight.pick] ?? s.lastId
      const id = s.lastId
      const shot = shotFor(id)
      d.subVectors(shot.cam, shot.look)
      const dist = d.length() * 1.45
      d.normalize()
      r.crossVectors(up, d).normalize()
      target.copy(shot.look).addScaledVector(r, dist * 0.225).addScaledVector(d, dist * 0.2)
      target.y += Math.sin(t * 0.7) * 0.03
      // About two fifths of the screen height.
      const away = camera.position.distanceTo(target)
      scale = (0.5 * 2 * Math.tan(THREE.MathUtils.degToRad((camera as THREE.PerspectiveCamera).fov / 2)) * away) / PH
      // Face the camera, turned a touch toward the artefact.
      m.lookAt(camera.position, target, up)
      q.setFromRotationMatrix(m)
      q.multiply(tmp.q.setFromAxisAngle(up, -0.05 + sculpt.pointer.x * 0.04))
    }
    if (!s.placed) {
      s.pos.copy(target)
      s.q.copy(q)
      s.placed = true
    }
    const l = 1 - Math.exp(-6 * dt)
    s.pos.lerp(target, l)
    s.q.slerp(q, l)
    grp.position.copy(s.pos)
    grp.quaternion.copy(s.q)
    // It rises into place as it appears.
    grp.position.y -= (1 - s.shown) * 0.25
    grp.scale.setScalar(scale * (0.9 + 0.1 * s.shown))
    mat.opacity = s.shown
    if (domWrap.current) domWrap.current.style.opacity = String(s.shown)
    if (label.current) label.current.style.opacity = String(ph.focus ? 0 : s.shown)
    const fading = s.shown < 0.995
    for (const fm of fadeMats.current) {
      fm.opacity = s.shown
      if (fm.transparent !== fading) {
        fm.transparent = fading
        fm.needsUpdate = true
      }
    }
  })
  const fade = (el: THREE.Material | null) => {
    if (el && !fadeMats.current.includes(el)) fadeMats.current.push(el)
  }
  return (
    <group ref={g} visible={false}>
      <Html position={[0, -PH / 2 - 0.2, 0]} center zIndexRange={[5, 0]}>
        <p ref={label} style={{ opacity: 0, color: 'rgba(255,255,255,0.55)', font: '600 10px/1 Inter, system-ui, sans-serif', letterSpacing: '0.25em', textTransform: 'uppercase', whiteSpace: 'nowrap', margin: 0 }}>In the app · example</p>
      </Html>
      <RoundedBox args={[PW, PH, PD]} radius={PR} smoothness={8}>
        <meshPhysicalMaterial ref={fade} color="#c9c6d3" metalness={0.85} roughness={0.25} clearcoat={0.7} clearcoatRoughness={0.15} envMapIntensity={1.2} transparent />
      </RoundedBox>
      <mesh geometry={glassGeo} position={[0, 0, PD / 2 + 0.002]}>
        <meshPhysicalMaterial ref={fade} color="#030306" roughness={0.2} metalness={0.2} clearcoat={0.3} clearcoatRoughness={0.3} transparent />
      </mesh>
      <mesh geometry={screenGeo} position={[0, 0, PD / 2 + 0.004]}>
        <meshBasicMaterial color="#05070d" />
      </mesh>
      {/* 1 CSS px = distanceFactor / 400 world units: 468 px across the 0.94 screen. */}
      <Html transform position={[0, 0, PD / 2 + 0.006]} distanceFactor={((PW - 0.1) / 468) * 400} zIndexRange={[4, 0]} pointerEvents="none">
        <div ref={domWrap} style={{ opacity: 0 }}>
          <canvas
            ref={(el) => {
              ;(dom as { current: HTMLCanvasElement | null }).current = el
              if (el) draw()
            }}
            width={SCREEN_W}
            height={SCREEN_H}
            style={{ width: 468, height: (468 * SCREEN_H) / SCREEN_W, borderRadius: 52, display: 'block' }}
          />
        </div>
      </Html>
      <RoundedBox args={[0.27, 0.075, 0.004]} radius={0.035} smoothness={4} position={[0, PH / 2 - 0.13, PD / 2 + 0.007]}>
        <meshBasicMaterial ref={fade} color="#000000" transparent />
      </RoundedBox>
      {[0.48, 0.28].map((y) => (
        <RoundedBox key={y} args={[0.02, 0.14, 0.05]} radius={0.008} position={[-PW / 2 - 0.006, y, 0]}>
          <meshStandardMaterial ref={fade} color="#c9c6d6" metalness={1} roughness={0.25} transparent />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.02, 0.24, 0.05]} radius={0.008} position={[PW / 2 + 0.006, 0.35, 0]}>
        <meshStandardMaterial ref={fade} color="#c9c6d6" metalness={1} roughness={0.25} transparent />
      </RoundedBox>
    </group>
  )
}

// ---- The world ------------------------------------------------------------
// A dark polished floor far below that catches faint reflections, a soft
// pool of warm light under each artefact, and a deep, slow field of stars;
// everything fades into the black.

/** Where the floor sits for the current arrangement. */
const floorY = () => (L().grounded ? L().orbit.c.y - 0.005 : -3.1)

/**
 * Phones and tablets get a lighter scene: a phone's graphics chip can't carry
 * the mirror floor (the whole scene drawn twice), the glow and anti-aliasing
 * passes and a 2x canvas, and the flights and effects stutter. At phone size
 * the lighter version looks the same.
 */
const LIGHT =
  typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px), (pointer: coarse)').matches

function Floor() {
  const ref = useRef<THREE.Mesh>(null)
  const width = useThree((s) => s.size.width)
  useFrame(() => {
    if (ref.current) ref.current.position.y = floorY()
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, -2]}>
      <planeGeometry args={[70, 70]} />
      {LIGHT ? (
        <meshStandardMaterial color="#040404" roughness={0.85} metalness={0.15} envMapIntensity={0.3} />
      ) : (
      <MeshReflectorMaterial
        resolution={width < 768 ? 256 : 512}
        blur={[260, 80]}
        mixBlur={0.8}
        mixStrength={3.2}
        mixContrast={1}
        roughness={1}
        depthScale={1.1}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.3}
        color="#060606"
        metalness={0.5}
        mirror={0}
      />
      )}
    </mesh>
  )
}

function Pools() {
  const tex = useMemo(() => glowTexture(), [])
  const refs = useRef<Partial<Record<Id, THREE.Mesh>>>({})
  const at = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    for (const id of IDS) {
      const m = refs.current[id]
      if (!m) continue
      posOf(id, at)
      m.position.set(at.x, floorY() + 0.01, at.z)
      const mat = m.material as THREE.MeshBasicMaterial
      const lit = flight.pick === 0 ? 1 : flight.pick === OBJS[id].chapter ? 1.4 : 0
      mat.opacity = THREE.MathUtils.damp(mat.opacity, 0.14 * lit, 3, dt)
      m.scale.setScalar(OBJS[id].h * 1.7)
    }
  })
  return (
    <>
      {IDS.map((id) => (
        <mesh
          key={id}
          ref={(m) => {
            refs.current[id] = m ?? undefined
          }}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
        </mesh>
      ))}
    </>
  )
}

function Stars() {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const n = LIGHT ? 600 : 1400
    const p = new Float32Array(n * 3)
    const c = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      // A shell far out, mostly above the floor.
      const u = Math.random() * Math.PI * 2
      const w = Math.acos(Math.random() * 1.6 - 0.6)
      const r = 26 + Math.random() * 22
      p[i * 3] = Math.sin(w) * Math.cos(u) * r
      p[i * 3 + 1] = Math.cos(w) * r
      p[i * 3 + 2] = Math.sin(w) * Math.sin(u) * r
      // Mostly cool white, a few warm.
      const warm = Math.random() < 0.18
      const b = 0.45 + Math.random() * 0.55
      c.set(warm ? [b, b * 0.85, b * 0.62] : [b * 0.92, b * 0.95, b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('color', new THREE.BufferAttribute(c, 3))
    return g
  }, [])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.006
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial size={0.09} vertexColors transparent opacity={0.75} depthWrite={false} fog={false} sizeAttenuation />
    </points>
  )
}

export default function Objects() {
  // Full sharpness (the screen's own pixel density, up to 3x on an iPhone) while
  // the frame rate holds; one step down when it drops, back up when it recovers.
  const [dpr, setDpr] = useState(() => (typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, LIGHT ? 3 : 2)))
  const top = typeof window === 'undefined' ? 2 : Math.min(window.devicePixelRatio || 1, LIGHT ? 3 : 2)
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      camera={{ fov: 44, position: [0, 2.7, 8.6], near: 0.05, far: 80 }}
      style={{ background: '#000' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(1, +(d - 0.5).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(top, +(d + 0.5).toFixed(2)))}
        flipflops={4}
        onFallback={() => setDpr(1)}
      />
      <color attach="background" args={['#000000']} />
      {/* Everything far away fades into the black. */}
      <fog attach="fog" args={['#000000', 11, 30]} />
      <Stars />
      <Galaxy />
      {/* Reflections only (the background stays black): a clean studio. */}
      <Environment resolution={LIGHT ? 64 : 128} frames={1}>
        <Lightformer form="rect" intensity={3} color="#fff4e8" position={[-4, 5, 5]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[5, 2, 3]} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#d9c19a" position={[0, 3, -6]} scale={[8, 2, 1]} />
      </Environment>
      <Director />
      {/* After the Director, so it follows this frame's camera, not the last one's. */}
      <Suspense fallback={null}>
        <Foreground />
      </Suspense>
      <DragSpin />
      <Orbits />
      <Core />
      <Suspense fallback={null}>
        <Rocks />
      </Suspense>
      {IDS.map((id) => (
        <Skip key={id}>
          <Suspense fallback={null}>
            <Artefact id={id} />
          </Suspense>
        </Skip>
      ))}
      <Floor />
      <Pools />
      <Suspense fallback={null}>
        <Phone3D />
      </Suspense>
      <Dust />
      {/* Crisp: no blur, no grain; a light glow on the brightest metal and a soft vignette. */}
      {/* Phones skip it: the renderer's own tone mapping and anti-aliasing are enough there. */}
      {!LIGHT && (
        <EffectComposer multisampling={4} enableNormalPass={false}>
          <Bloom intensity={0.25} luminanceThreshold={0.88} luminanceSmoothing={0.15} mipmapBlur />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          <Vignette offset={0.35} darkness={0.5} />
          <SMAA />
        </EffectComposer>
      )}
    </Canvas>
  )
}

useGLTF.preload('/models/core.glb')
useGLTF.preload('/models/asteroid.glb')
useGLTF.preload('/models/brain.glb')
