'use client'

import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, PerformanceMonitor, MeshReflectorMaterial, RoundedBox, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { promises, sculpt } from './store'
import { FallingLeaves, SoundRings, makeFx, useBonsaiFx, useBrainFx } from './artefactFx'
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
  column: { url: '/models/column.glb', h: 1.6, chapter: 1, label: 'Daily Eras', line: 'Choose who you are becoming.', phase: 0 },
  scroll: { url: '/models/scroll.glb', h: 0.9, chapter: 2, label: 'Reflection', line: 'Every night, an honest answer.', phase: 1.3 },
  // The core, larger than the rest.
  brain: { url: '/models/brain.glb', h: 1.85, chapter: 3, label: 'AI Coach', line: 'A coach that remembers your word.', phase: 2.6 },
  bonsai: { url: '/models/bonsai.glb', h: 1.45, chapter: 4, label: 'Habit Builder', line: 'Motivation fades. Your word remains.', phase: 3.9 },
  headphones: { url: '/models/headphones.glb', h: 1.2, chapter: 5, label: 'Guided Audio', line: 'Focus by day. Rest by night.', phase: 5.2 },
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
  seat: Record<Id, Seat>
  /** Wide screens turn the whole system; phones only sway, so nothing drifts behind the core or the words. */
  turns: boolean
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const deg = (d: number) => (d * Math.PI) / 180
const LAYOUTS: Record<'wide' | 'tall', Layout> = {
  wide: {
    overview: { cam: v(0, 2.7, 8.6), look: v(0, 0.55, -1.6), fov: 44 },
    orbit: { c: v(0, 0, -1.75), a: v(4.3, 0, 0), b: v(0, -0.5, 2.3) },
    rings: [0.45, 0.66, 0.84, 1, 1.18],
    moons: [
      { s: 0.45, th: deg(20), r: 0.07 },
      { s: 0.45, th: deg(200), r: 0.09 },
      { s: 0.84, th: deg(95), r: 0.1 },
      { s: 0.84, th: deg(250), r: 0.08 },
      { s: 0.84, th: deg(5), r: 0.1 },
      { s: 1.18, th: deg(60), r: 0.12 },
      { s: 1.18, th: deg(185), r: 0.11 },
      { s: 1.18, th: deg(290), r: 0.09 },
    ],
    seat: {
      brain: { s: 0, th: 0, lift: -0.05 },
      column: { s: 1, th: deg(150), lift: 0 },
      scroll: { s: 1, th: deg(28), lift: 0 },
      bonsai: { s: 0.66, th: deg(222), lift: 0.25 },
      headphones: { s: 0.66, th: deg(320), lift: 0.3 },
    },
    turns: true,
  },
  tall: {
    overview: { cam: v(0, 0.6, 9.6), look: v(0, 0.2, -1.6), fov: 50 },
    orbit: { c: v(0, -0.05, -1.6), a: v(1.6, 0, 0.2), b: v(0, 2.5, -0.2) },
    rings: [0.5, 1, 1.22],
    moons: [
      { s: 1.22, th: deg(90), r: 0.1 },
      { s: 1.22, th: deg(180), r: 0.13 },
      { s: 1.22, th: deg(0), r: 0.09 },
      { s: 1.22, th: deg(270), r: 0.11 },
    ],
    seat: {
      // Beside the core rather than above and below it, so the bottom two stay clear of the words.
      brain: { s: 0, th: 0, lift: -0.25 },
      column: { s: 1, th: deg(145), lift: 0 },
      headphones: { s: 1, th: deg(35), lift: 0 },
      bonsai: { s: 1, th: deg(215), lift: 0 },
      scroll: { s: 1, th: deg(325), lift: 0 },
    },
    turns: false,
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
const HALO_GEO = new THREE.RingGeometry(0.975, 1, 96)
const haloMaterial = () =>
  new THREE.MeshBasicMaterial({ color: '#e2c58f', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })

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
class Skip extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(err: unknown) {
    console.warn('[becoming] an object failed to load', err)
  }
  render() {
    return this.state.failed ? null : this.props.children
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
  // The core's veins shimmer faintly in the overview too: it is the live centre of the system.
  useBrainFx(id === 'brain' ? fx : null, () => (flight.pick === o.chapter ? 1 : flight.pick === 0 ? 0.5 : 0))
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
  // The halo it stands on (two for the core), and the core's own light.
  const core = id === 'brain'
  const haloR = Math.min(width * 0.6 + 0.05, o.h * 0.9)
  const haloMats = useMemo(() => [haloMaterial(), haloMaterial()], [])
  const glow = useRef<THREE.Mesh>(null)
  const lamp = useRef<THREE.PointLight>(null)
  const at = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = st.current
    if (s.born < 0) s.born = t
    const picked = flight.pick === o.chapter
    const someone = flight.pick !== 0
    if (picked) seen.add(o.chapter)
    if (hovered && !someone) orbit.hover = id
    else if (orbit.hover === id) orbit.hover = null
    // Where it rides on its orbit (the arrangement depends on the screen), facing the overview camera.
    posOf(id, at)
    const cam = L().overview.cam
    if (place.current) {
      place.current.position.copy(at)
      place.current.rotation.y = Math.atan2(cam.x - at.x, cam.z - at.z)
    }
    // Drifting slowly around its spot, bobbing, turning; the picked one settles.
    // With Reduce Motion on it still floats, at half the drift: the scene is
    // meant to be alive, and a slow float isn't the kind of motion that hurts.
    if (float.current) {
      const free = (picked ? 1 - flight.k : 1) * (reduced ? 0.5 : 1)
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
    haloMats[0].opacity = ring
    haloMats[1].opacity = core ? ring * 0.45 : 0
    if (core) {
      // The core glows from within, a slow breath.
      const breath = 0.85 + 0.15 * Math.sin(t * 0.6)
      if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = s.shown * (someone && !picked ? 0 : 0.14 * breath)
      if (lamp.current) lamp.current.intensity = s.shown * (someone && !picked ? 0 : 2.2 * breath)
    }
    // Names only in the overview; brighter on hover, with its one line; a gold mark once explored.
    if (label.current) {
      label.current.style.opacity = !someone && flight.k > 0.6 ? String(0.72 + 0.28 * s.hover) : '0'
      label.current.style.pointerEvents = someone ? 'none' : 'auto'
    }
    if (line.current) line.current.style.opacity = String(s.hover)
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
      <mesh geometry={HALO_GEO} material={haloMats[0]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} scale={haloR} />
      <mesh geometry={HALO_GEO} material={haloMats[1]} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]} scale={haloR * 1.35} />
      <mesh position={[0, -0.12, haloR]} material={haloMats[0]}>
        <sphereGeometry args={[0.028, 12, 8]} />
      </mesh>
      {core && (
        <>
          {/* Warm light from within the core: a glow behind it and a lamp that lights its pedestal and the nearest worlds. */}
          <mesh ref={glow} position={[0, o.h * 0.55, -0.35]} scale={o.h * 2.8}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial map={glowTexture()} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
          </mesh>
          <pointLight ref={lamp} position={[0, o.h * 0.3, o.h * 0.45]} color="#ffc98a" intensity={0} distance={5} decay={2} />
        </>
      )}
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
      <Html position={[0, -0.12, haloR]} zIndexRange={[5, 0]}>
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

/** How much of the system shows: all of it in the overview, nothing while a world is open. */
const systemShown = () => (flight.pick === 0 ? flight.k : 1 - flight.k)

/**
 * The orbits: thin gold rings around the core, beads of light travelling along
 * them, small dark moons riding them. A hovered world's ring brightens. It all
 * fades while a world is open.
 */
function Orbits() {
  const MAX_RINGS = 5
  const BEADS = 3
  const { lines, ringMats } = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 200; i++) {
      const a = (i / 200) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const ringMats = Array.from({ length: MAX_RINGS }, () => new THREE.LineBasicMaterial({ color: '#d9bd8c', transparent: true, opacity: 0, depthWrite: false, fog: false }))
    const lines = ringMats.map((m) => {
      const l = new THREE.LineLoop(geo, m)
      l.matrixAutoUpdate = false
      return l
    })
    return { lines, ringMats }
  }, [])
  // Beads: a few per ring, each at its own pace.
  const beads = useMemo(() => {
    const n = MAX_RINGS * BEADS
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const seeds = Array.from({ length: n }, (_, i) => ({ th: Math.random() * Math.PI * 2, w: (0.04 + Math.random() * 0.08) * (i % 2 ? 1 : 1.3) }))
    return { g, seeds }
  }, [])
  const beadMat = useRef<THREE.PointsMaterial>(null)
  const moons = useRef<(THREE.Mesh | null)[]>([])
  const moonMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1a1714', metalness: 0.75, roughness: 0.32, envMapIntensity: 1.3, transparent: true, opacity: 0 }), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), a: new THREE.Vector3(), b: new THREE.Vector3(), n: new THREE.Vector3(), p: new THREE.Vector3() }), [])
  useFrame((_, dt) => {
    const lay = L()
    const shown = systemShown()
    const { m, a, b, n, p } = tmp
    const hoverS = orbit.hover ? lay.seat[orbit.hover].s : -1
    const turn = spin()
    lines.forEach((l, i) => {
      const s = lay.rings[i]
      l.visible = s !== undefined && shown > 0.01
      if (!l.visible) return
      // The unit circle, laid onto this orbit's plane at this size.
      a.copy(lay.orbit.a).multiplyScalar(s)
      b.copy(lay.orbit.b).multiplyScalar(s)
      n.crossVectors(b, a).normalize()
      m.makeBasis(a, n, b).setPosition(lay.orbit.c)
      l.matrix.copy(m)
      l.matrixWorldNeedsUpdate = true
      // Inner rings a touch brighter; the hovered world's ring glows.
      const lit = s === hoverS ? 0.55 : 0.2 - i * 0.02
      ringMats[i].opacity = THREE.MathUtils.damp(ringMats[i].opacity, lit * shown, 6, dt)
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
    if (beadMat.current) beadMat.current.opacity = 0.9 * shown
    moonMat.opacity = shown
    moonMat.transparent = shown < 0.995
    moons.current.forEach((me, i) => {
      if (!me) return
      const mo = lay.moons[i]
      me.visible = !!mo && shown > 0.01
      if (!mo) return
      orbitPoint(mo.s, mo.th, me.position)
      me.scale.setScalar(mo.r)
    })
  })
  return (
    <>
      {lines.map((l, i) => (
        <primitive key={i} object={l} />
      ))}
      <points geometry={beads.g} frustumCulled={false}>
        <pointsMaterial ref={beadMat} size={0.075} color="#ffe2a8" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} sizeAttenuation />
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
  const geo = useMemo(() => {
    // A rough stone: an icosahedron with its corners pushed about.
    const g = new THREE.IcosahedronGeometry(1, 1)
    const p = g.attributes.position as THREE.BufferAttribute
    const seen = new Map<string, number>()
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`
      const k = seen.get(key) ?? 0.7 + Math.random() * 0.5
      seen.set(key, k)
      p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.85, metalness: 0.15, flatShading: true }), [])
  const rocks = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        // In a loose band beyond the outer ring, a few near the lens.
        s: 1.35 + Math.random() * 0.8,
        th: Math.random() * Math.PI * 2,
        y: (Math.random() - 0.5) * 1.6,
        r: 0.03 + Math.pow(Math.random(), 3) * 0.16,
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
      sc.setScalar(r.r)
      m.compose(p, q, sc)
      im.setMatrixAt(i, m)
    })
    im.instanceMatrix.needsUpdate = true
  })
  return <instancedMesh ref={mesh} args={[geo, mat, N]} frustumCulled={false} />
}

/** A very faint warm haze far behind the system, the only "nebula" there is. */
function Haze() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512
    c.height = 256
    const x = c.getContext('2d')!
    // Soft clouds along a diagonal band, built from many faint blobs.
    for (let i = 0; i < 70; i++) {
      const u = Math.random()
      const cx = u * 512
      const cy = 200 - u * 150 + (Math.random() - 0.5) * 70
      const r = 20 + Math.random() * 60
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r)
      gr.addColorStop(0, `rgba(200,185,165,${0.05 + Math.random() * 0.06})`)
      gr.addColorStop(1, 'rgba(0,0,0,0)')
      x.fillStyle = gr
      x.fillRect(cx - r, cy - r, r * 2, r * 2)
    }
    // Fade to nothing well before the edges, so it never reads as a rectangle.
    x.globalCompositeOperation = 'destination-in'
    x.setTransform(2, 0, 0, 1, 0, 0)
    const edge = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    edge.addColorStop(0, 'rgba(0,0,0,1)')
    edge.addColorStop(0.55, 'rgba(0,0,0,0.6)')
    edge.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = edge
    x.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh position={[6, 9, -34]} scale={[60, 30, 1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} fog={false} />
    </mesh>
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
    cam.fov = THREE.MathUtils.lerp(f.fromFov, target.fov, k)
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
      <directionalLight position={[2, 5, -8]} intensity={1.2} color="#e3e9f4" />
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
const floorY = () => (layout.tall ? -3.1 : -1.25)

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
        blur={[400, 120]}
        mixBlur={1}
        mixStrength={1.6}
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
      <Haze />
      {/* Reflections only (the background stays black): a clean studio. */}
      <Environment resolution={LIGHT ? 64 : 128} frames={1}>
        <Lightformer form="rect" intensity={3} color="#fff4e8" position={[-4, 5, 5]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[5, 2, 3]} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#d9c19a" position={[0, 3, -6]} scale={[8, 2, 1]} />
      </Environment>
      <Director />
      <DragSpin />
      <Orbits />
      <Rocks />
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

useGLTF.preload('/models/brain.glb')
