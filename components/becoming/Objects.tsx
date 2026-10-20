'use client'

import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, PerformanceMonitor, MeshReflectorMaterial, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { STEPS, SUMMIT, nextStep, promises, sculpt, visited } from './store'
import { monolithGeometry, rippleNormals, rockTexture } from './scenery'
import { FallingLeaves, makeCoreFx, makeFx, useBonsaiFx, useBrainFx } from './artefactFx'

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
  column: { url: '/models/column.glb', h: 1.15, chapter: 1, label: 'Daily Eras', line: 'Every climb starts with a direction.', phase: 0 },
  scroll: { url: '/models/scroll.glb', h: 0.55, chapter: 2, label: 'Reflection', line: 'See how far you’ve climbed.', phase: 1.3 },
  brain: { url: '/models/brain.glb', h: 0.95, chapter: 3, label: 'AI Coach', line: 'You don’t climb alone.', phase: 2.6 },
  bonsai: { url: '/models/bonsai.glb', h: 1.05, chapter: 4, label: 'Habit Builder', line: 'One stone at a time.', phase: 3.9 },
  headphones: { url: '/models/headphones.glb', h: 0.85, chapter: 5, label: 'Guided Audio', line: 'Steady breath for the climb.', phase: 5.2 },
}
const IDS = Object.keys(OBJS) as Id[]
const BY_CHAPTER = Object.fromEntries(IDS.map((id) => [OBJS[id].chapter, id])) as Record<number, Id>

/**
 * Where an object stands: the top of its stepping stone (`at`) and the
 * stone's radius. The stones climb from the water toward the bust, in the
 * order the visitor is led through them.
 */
type Seat = { at: THREE.Vector3; r: number }
type Layout = {
  overview: { cam: THREE.Vector3; look: THREE.Vector3; fov: number }
  /** The water's height. */
  water: number
  /** The centre of the scene's gold dust and drifting stone. */
  c: THREE.Vector3
  /** The bust: where its base stands (under the water) and how tall it is. */
  core: { at: THREE.Vector3; h: number }
  seat: Record<Id, Seat>
  /** Tall dark standing stones around the water: base position, height, width. */
  monoliths: { at: THREE.Vector3; h: number; w: number; tilt: number }[]
  /** Boulders half sunk in the water at the edges: where, how big. */
  boulders: { at: THREE.Vector3; s: number }[]
  /** How big the artefacts and their stones are drawn (phones draw them smaller). */
  art: number
  /** The artefacts alone a little larger than their stones (phones need them bigger to read). */
  artBoost: number
  /** How deep the slabs stack under a step at most (world units); Infinity reaches the water. */
  stoneDepth: number
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const LAYOUTS: Record<'wide' | 'tall', Layout> = {
  // Wide: the words on the left; the stones climb from the front left to the
  // back right, past the great bust standing in the water behind them.
  wide: {
    overview: { cam: v(-0.2, 2.35, 11.4), look: v(1.9, 1.8, -2.2), fov: 40 },
    water: 0,
    c: v(2, 0, -2),
    // Risen out of the water: the rock chest stands clear of it, the head still in frame.
    core: { at: v(3.9, -0.6, -7.6), h: 8.2 },
    seat: {
      // Separate stones with water between them, curving from the front left
      // round to the right and back up to David's base, each a little higher.
      // Rising more steeply as it goes, so every later stone shows above the one before.
      column: { at: v(-0.6, 0.25, 2.2), r: 1.05 },
      bonsai: { at: v(1.6, 0.75, 1.9), r: 0.98 },
      brain: { at: v(3.5, 1.4, 0.9), r: 0.92 },
      headphones: { at: v(5.3, 2.1, 0.3), r: 0.86 },
      scroll: { at: v(6.9, 2.85, -0.9), r: 0.82 },
    },
    monoliths: [
      { at: v(-3.6, 0, -4.8), h: 6.2, w: 1.1, tilt: 0.04 },
      { at: v(-1.4, 0, -9), h: 7.8, w: 1.4, tilt: -0.03 },
      { at: v(8.4, 0, -4.4), h: 5.4, w: 1.1, tilt: -0.05 },
      { at: v(10.2, 0, -0.4), h: 3.4, w: 0.9, tilt: 0.07 },
    ],
    boulders: [
      { at: v(-5.2, 0, 3.2), s: 1.3 },
      { at: v(-3.9, 0, 4.4), s: 0.7 },
      { at: v(8.6, 0, 2.2), s: 1.5 },
      { at: v(7.2, 0, 3.6), s: 0.6 },
      { at: v(10.5, 0, -3), s: 1.1 },
    ],
    art: 0.8,
    artBoost: 1.12,
    stoneDepth: Infinity,
  },
  // Phones: like the wide view, from low over the water looking up the climb;
  // the stones zigzag away and up toward David, who stands in the water behind.
  tall: {
    // Aimed low, so the climb sits above the words and David fills the top.
    overview: { cam: v(0, 3.0, 12.5), look: v(0, 2.6, -3), fov: 52 },
    water: 0,
    c: v(0, 0, -3),
    // Towering over the last step.
    // Far back, a backdrop to the climb rather than the first thing you see.
    core: { at: v(0.5, -1.4, -17), h: 12 },
    seat: {
      // Each step standing in the water, rising a little from one to the next.
      // Spread wide and deep enough that no two steps overlap on screen (each is its own tap).
      // Rising steeply, so each step (and its name) has its own band of the screen.
      column: { at: v(-1.2, 0.25, 3.6), r: 1.05 },
      bonsai: { at: v(1.2, 1.15, 1.6), r: 1.0 },
      brain: { at: v(-1.15, 2.05, -0.4), r: 1.0 },
      headphones: { at: v(1.15, 2.95, -2.4), r: 0.95 },
      scroll: { at: v(-0.1, 3.85, -4.4), r: 0.95 },
    },
    monoliths: [
      { at: v(-4.2, 0, -7), h: 7, w: 1.0, tilt: 0.04 },
      { at: v(4.3, 0, -6), h: 6, w: 0.9, tilt: -0.05 },
    ],
    boulders: [],
    art: 0.62,
    artBoost: 1.3,
    // Stacked down into the water like the wide view, or the steps look like they float.
    stoneDepth: Infinity,
  },
}
/** Which arrangement is on screen (set by the camera from the canvas shape). */
const layout = { tall: false }
const L = () => LAYOUTS[layout.tall ? 'tall' : 'wide']

/** Which world the pointer is over (its stone's gold edge brightens). */
const orbit = { hover: null as Id | null }
/** A point on a flat circle of radius r around the scene's centre, at angle th, raised by y. */
function ringPoint(r: number, th: number, y: number, out: THREE.Vector3) {
  const c = L().c
  return out.set(c.x + Math.cos(th) * r, c.y + y, c.z + Math.sin(th) * r * 0.6)
}
/** Where the bust's base stands. */
function corePos(out = new THREE.Vector3()) {
  return out.copy(L().core.at)
}
/** Where an object stands. */
function posOf(id: Id, out = new THREE.Vector3()) {
  return out.copy(L().seat[id].at)
}

/** The close shot for an object: in front of it (toward the overview camera), a little to one side and above. */
function shotFor(id: Id) {
  const o = OBJS[id]
  const at = posOf(id)
  const from = L().overview.cam
  const toCam = v(from.x - at.x, 0, from.z - at.z).normalize()
  const side = v(toCam.z, 0, -toCam.x)
  // The scroll is long and low: frame it by its width.
  const k = L().art
  const h = o.h * k
  const d = (1.8 + o.h * 1.1 * (id === 'scroll' ? 1.7 : 1)) * k
  const cam = v(at.x, at.y + h * 0.72, at.z).addScaledVector(toCam, d).addScaledVector(side, d * 0.3)
  return { cam, look: v(at.x, at.y + h * 0.5, at.z), fov: 34 }
}

/** The shot of David at the summit: his head and shoulders, a little to one side (the words take the other). */
function summitShot() {
  const at = corePos()
  const h = L().core.h
  const look = v(at.x, at.y + h * 0.62, at.z)
  const from = L().overview.cam
  const dir = v(from.x - look.x, 0, from.z - look.z).normalize()
  const side = v(dir.z, 0, -dir.x)
  const cam = look.clone().addScaledVector(dir, h * 1.35).addScaledVector(side, h * 0.12)
  cam.y += h * 0.05
  return { cam, look, fov: 38 }
}
/** The shot for a chapter: an artefact's, or David's at the summit. */
const shotOf = (pick: number) => (pick === SUMMIT ? summitShot() : shotFor(BY_CHAPTER[pick]))

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
/** The most slabs stacked under a step (the tallest step on the widest screen needs about a dozen). */
const STACK_MAX = 18
/** The gold rim round a stone's top edge, radius 1. */
const RIM_GEO = new THREE.TorusGeometry(1, 0.016, 8, 180)
/**
 * The stepping-stone slab (Meshy): its geometry centred, scaled so its widest
 * radius is 1, top at 0; plus how thick it is at that size. Each step wears
 * its own fadeable copy of the material. The top slab is the full model; the
 * layers stacked under it, barely seen, use a light one (slab-lite.glb: about
 * a sixth of the triangles), which phones in particular need.
 */
function useSlab(url = '/models/slab.glb') {
  const { scene } = useGLTF(url)
  return useMemo(() => {
    let mesh: THREE.Mesh | null = null
    scene.traverse((o) => {
      if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh
    })
    const m = mesh as unknown as THREE.Mesh
    const geo = m.geometry.clone()
    geo.computeBoundingBox()
    const b = geo.boundingBox!
    const k = 1 / Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 0.5
    geo.translate(-(b.min.x + b.max.x) / 2, -b.max.y, -(b.min.z + b.max.z) / 2)
    geo.scale(k, k, k)
    const mat = (m.material as THREE.MeshStandardMaterial).clone()
    mat.transparent = true
    mat.opacity = 0
    return { geo, mat, thick: (b.max.y - b.min.y) * k }
  }, [scene])
}

/**
 * A name cut into stone: gold letters with a dark lip above and a light lip
 * below, so they read as engraved rather than printed. Wide and short, to wrap
 * round the front of a slab.
 */
const carved = new Map<string, THREE.CanvasTexture>()
function carvedTexture(text: string) {
  const hit = carved.get(text)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 144
  const x = c.getContext('2d')!
  const word = text.toUpperCase()
  let size = 104
  x.font = `600 ${size}px Georgia, 'Times New Roman', serif`
  ;(x as unknown as { letterSpacing: string }).letterSpacing = '14px'
  // Fit within the middle of the band.
  const w = x.measureText(word).width
  if (w > 880) size = Math.floor((size * 880) / w)
  x.font = `600 ${size}px Georgia, 'Times New Roman', serif`
  x.textAlign = 'center'
  x.textBaseline = 'middle'
  const cx = 512
  const cy = 74
  x.fillStyle = 'rgba(255,238,205,0.32)'
  x.fillText(word, cx, cy + 3)
  x.fillStyle = 'rgba(0,0,0,0.85)'
  x.fillText(word, cx, cy - 3)
  x.fillStyle = '#f0cf8a'
  x.fillText(word, cx, cy)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  carved.set(text, t)
  return t
}
/** The band the name is cut into: the front arc of a unit cylinder, unit tall (facing +z). */
const CARVE_GEO = new THREE.CylinderGeometry(1, 1, 1, 48, 1, true, -0.55, 1.1)

/**
 * Gold brighter than white, for the glow pass to bloom into gold. Phones have
 * no glow pass, where it would clip to a pale yellow: there it is the same hue
 * held within range, so it reads as gold.
 */
function brightGold(r: number, g: number, b: number) {
  if (!LIGHT) return new THREE.Color(r, g, b)
  const k = 1 / Math.max(r, g, b)
  return new THREE.Color(r * k, g * k * 0.92, b * k * 0.8)
}

/** The rim's glowing gold. */
const haloMaterial = () =>
  new THREE.MeshBasicMaterial({ color: brightGold(1.2, 0.9, 0.5), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })

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
      if (flight.pick === 0 || e.pointerType === 'touch') return
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
  // The stepping stone it stands on: marble slabs stacked down into the water,
  // each turned, nudged and tilted a little so the stack reads as natural rock.
  const stack = useRef<THREE.InstancedMesh>(null)
  const slab = useSlab()
  const under = useSlab('/models/slab-lite.glb')
  const layers = useMemo(
    () =>
      Array.from({ length: STACK_MAX }, (_, i) => ({
        turn: Math.random() * Math.PI * 2,
        dx: (Math.random() - 0.5) * 0.18,
        dz: (Math.random() - 0.5) * 0.18,
        tilt: (Math.random() - 0.5) * 0.1,
        // Wider toward the water and never even: thick, uneven layers, like split rock.
        grow: 1 + Math.min(0.22, i * 0.05) + (Math.random() - 0.5) * 0.1,
        squash: 1.8 + Math.random() * 1.1,
      })),
    [],
  )
  const stackTmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), e: new THREE.Euler(), p: new THREE.Vector3(), sc: new THREE.Vector3() }), [])
  const edgeMat = useMemo(() => haloMaterial(), [])
  // A soft warm glow behind the artefact, so it stands out from the dark and from David.
  const glowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#ffcf8a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }),
    [],
  )
  // Its name, carved into the front of its slab.
  const carveMat = useMemo(
    // The gold letters glow softly (emissive), so they read against the bright-veined marble.
    () =>
      new THREE.MeshStandardMaterial({
        map: carvedTexture(o.label),
        emissiveMap: carvedTexture(o.label),
        emissive: new THREE.Color(1, 0.78, 0.45),
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0,
        roughness: 0.45,
        metalness: 0.35,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [o.label],
  )
  const nextTag = useRef<HTMLSpanElement>(null)
  const at = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = st.current
    if (s.born < 0) s.born = t
    const picked = flight.pick === o.chapter
    const someone = flight.pick !== 0
    if (hovered && !someone) orbit.hover = id
    else if (orbit.hover === id) orbit.hover = null
    // Where it stands (the arrangement depends on the screen), facing the overview camera.
    posOf(id, at)
    const cam = L().overview.cam
    if (place.current) {
      place.current.position.copy(at)
      place.current.rotation.y = Math.atan2(cam.x - at.x, cam.z - at.z)
      place.current.scale.setScalar(L().art)
    }
    // It stands still on its stone, turning slowly (faster while hovered); half as fast with Reduce Motion.
    if (float.current) float.current.rotation.y += dt * (0.1 + 0.45 * s.hover) * (reduced ? 0.5 : 1)
    // Slabs stacked under the top one, down into the water (in the group's own, scaled units).
    if (stack.current) {
      const r = L().seat[id].r
      const depth = Math.min(L().stoneDepth, Math.max(0, at.y - L().water + 0.3)) / L().art
      const { m, q, e, p, sc } = stackTmp
      let y = -slab.thick * r
      let n = 0
      for (const ly of layers) {
        if (y <= -depth || n >= STACK_MAX) break
        const h = slab.thick * r * ly.squash
        p.set(ly.dx * r, y, ly.dz * r)
        e.set(ly.tilt, ly.turn, -ly.tilt * 0.7)
        q.setFromEuler(e)
        sc.set(r * ly.grow, r * ly.squash, r * ly.grow)
        m.compose(p, q, sc)
        stack.current.setMatrixAt(n++, m)
        y -= h * 0.92
      }
      stack.current.count = n
      stack.current.instanceMatrix.needsUpdate = true
    }
    if (float.current) {
      // You turn the open one by dragging.
      if (picked) float.current.rotation.y += drag.vel
      // It gives a small start when you do something in its demo...
      const u = (performance.now() - sculpt.react.at) / 900
      const jolt = sculpt.react.chapter === o.chapter && u >= 0 && u < 1 ? Math.sin(Math.PI * u) * (1 - u) : 0
      if (jolt > 0) float.current.rotation.y += dt * 4 * jolt
      // A hovered world leans in a little.
      float.current.scale.setScalar((1 + 0.08 * jolt + 0.06 * s.hover) * L().artBoost)
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
    slab.mat.opacity = s.shown
    slab.mat.transparent = s.shown < 0.995
    under.mat.opacity = s.shown
    under.mat.transparent = s.shown < 0.995
    // Inside its own world the caption names it; the carving would sit huge behind the words.
    carveMat.opacity = LIGHT ? 0 : s.shown * (picked ? 1 - flight.k : 1)
    // The warm glow behind it: brighter on hover, gone while another world is open.
    glowMat.opacity = s.shown * (someone && !picked ? 0 : 0.3 + 0.25 * s.hover)
    // The gold edge: brighter on hover, breathing on the step to take next, faint while open.
    const next = nextStep() === o.chapter
    const pulse = next && !someone ? 0.25 * (0.5 + 0.5 * Math.sin(t * 2.2)) : 0
    edgeMat.opacity = s.shown * (picked ? 0.35 : someone ? 0 : 0.6 + 0.4 * s.hover + pulse)
    if (nextTag.current) {
      nextTag.current.textContent = visited.size === 0 ? 'Start here' : 'Next'
      nextTag.current.style.opacity = next ? '1' : '0'
    }
    // Names only in the overview; brighter on hover, with its one line; a gold mark once explored.
    if (label.current) {
      label.current.style.opacity = !someone && flight.k > 0.6 ? String(LIGHT ? 1 : 0.72 + 0.28 * s.hover) : '0'
      label.current.style.pointerEvents = someone ? 'none' : 'auto'
    }
    if (line.current) line.current.style.opacity = s.hover < 0.03 ? '0' : String(s.hover)
    if (tick.current) tick.current.style.opacity = String(1 - s.hover)
    if (mark.current) mark.current.style.opacity = visited.has(o.chapter) ? '1' : '0'
  })
  const go = () => {
    if (flight.pick === 0) sculpt.jump?.(o.chapter)
  }
  return (
    <group ref={place}>
      <group ref={float}>
        <primitive object={model} />
        {id === 'bonsai' && <FallingLeaves h={o.h} api={leaves} />}
      </group>
      <mesh material={glowMat} position={[0, o.h * L().artBoost * 0.55, -0.3]} scale={o.h * L().artBoost * 2.2}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      {/* Its stepping stone, reaching into the water, with a gold edge round the top. */}
      <mesh geometry={slab.geo} material={slab.mat} scale={L().seat[id].r} rotation={[0, o.phase * 2, 0]} />
      <instancedMesh ref={stack} args={[under.geo, under.mat, STACK_MAX]} frustumCulled={false} />
      <mesh geometry={RIM_GEO} material={edgeMat} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={L().seat[id].r} />
      <mesh
        geometry={CARVE_GEO}
        material={carveMat}
        position={[0, -slab.thick * L().seat[id].r * 0.5, 0]}
        scale={[L().seat[id].r * 1.03, slab.thick * L().seat[id].r * 0.9, L().seat[id].r * 1.03]}
      />
      {/* What you tap: a column over its own stone (cheaper than the object itself, and
          no wider than the stone, so neighbouring steps never take each other's taps). */}
      <mesh
        position={[0, (o.h * L().artBoost) / 2, 0]}
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
        <cylinderGeometry args={[L().seat[id].r * 0.9, L().seat[id].r * 0.9, o.h * L().artBoost + 0.2, 16]} />
        <meshBasicMaterial visible={false} />
      </mesh>
      {/* Under the slab: "Start here", the explored mark and the one line on hover. The name you
          see is carved in the stone; this one stays for clicks and screen readers. */}
      {/* Phones: just above the artefact (on the stone's edge the next step covered it), on a dark pill so it reads over anything. */}
      <Html position={LIGHT ? [0, o.h * L().artBoost + 0.06, 0] : [0, -slab.thick * L().seat[id].r - 0.02, L().seat[id].r]} zIndexRange={[15, 0]}>
        <div
          ref={label}
          style={{ opacity: 0, transition: 'opacity 0.5s', transform: LIGHT ? 'translate(-50%, -100%)' : 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}
        >
          <span
            ref={nextTag}
            style={{ opacity: 0, transition: 'opacity 0.5s', color: '#EDE3D1', font: '600 9px/1 Inter, system-ui, sans-serif', letterSpacing: '0.3em', textTransform: 'uppercase', whiteSpace: 'nowrap', pointerEvents: 'none' }}
          />
          <button
            onClick={go}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            aria-label={o.label}
            style={{
              // Phones show the name here (the carving is too small to read); elsewhere it is in the stone.
              color: LIGHT ? '#E3C68E' : 'transparent',
              font: `600 ${LIGHT ? 9 : 11}px/1 Inter, system-ui, sans-serif`,
              letterSpacing: LIGHT ? '0.16em' : '0.22em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              background: LIGHT ? 'rgba(8,6,4,0.72)' : 'none',
              border: LIGHT ? '1px solid rgba(201,174,130,0.5)' : 0,
              borderRadius: 999,
              padding: LIGHT ? '5px 8px 5px 10px' : '10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
            }}
          >
            <span ref={mark} aria-hidden style={{ opacity: 0, width: 5, height: 5, borderRadius: 9, background: GOLD, transition: 'opacity 0.5s' }} />
            {['I', 'II', 'III', 'IV', 'V'][STEPS.indexOf(o.chapter)]} · {o.label}
          </button>
          <span ref={tick} aria-hidden style={{ display: 'none' }} />
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
// David at the top of the climb, his marble breaking into gold-veined rock.
// Every world the visitor opens lights his gold cracks a little more and sends
// shards off his shoulder. Once all five are opened, the cracks blaze (the
// camera stays where it is) and the page says what it means.

/** David: the full model, or a light one on phones (about a third of the triangles, smaller textures). */
const coreUrl = () => (LIGHT ? '/models/core-lite.glb' : '/models/core.glb')
/**
 * How much is carved. The bust (Meshy) already breaks into rock with gold
 * veins of its own, so nothing is left raw: climbing lights its gold cracks
 * instead (see the light below) and sends shards off the shoulder.
 */
const carvedFor = (_opened: number) => 1.2
/** His moment, in seconds: the cracks rise to full by 2.2, hold until 4.4, settle by 7.2. */
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
  const fx = useMemo(() => {
    // He stands far back: the distance fog would dim him into the dark, so it is
    // left off and he is dimmed by hand instead, a little, so the artefacts in
    // front of him are what stands out (more on phones, where he fills the screen).
    for (const m of mats) {
      m.fog = false
      m.color.multiplyScalar(LIGHT ? 0.55 : 0.8)
    }
    return makeCoreFx(model, mats)
  }, [model, mats])
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
    // The gold cracks glow a little more for each world opened, and fully at the reveal.
    // A drifting stone striking him, or a coin chosen at his summit, flashes his gold cracks.
    const coin = sculpt.react.chapter === SUMMIT ? Math.max(0, 1 - (performance.now() - sculpt.react.at) / 900) : 0
    const struck = Math.max(coin, 1 - (t - core.flash) / 0.9, 0)
    u.uLight.value = THREE.MathUtils.damp(u.uLight.value, Math.max(revealAmount(), 0.5 * Math.min(1, opened / 5), struck), struck > 0.5 ? 12 : 3, dt)
    // Every world opened and the carving shown: its moment, once.
    if (opened >= 5 && !core.autoRevealed && flight.pick === 0 && flight.k > 0.95 && since > 2.6) {
      core.autoRevealed = true
      startReveal()
    }
    const want = Math.min(1, (t - s.born) / 1.2) * (flight.pick === 0 || flight.pick === SUMMIT ? 1 : 0)
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
  /** When a drifting stone last struck him (clock seconds): his gold cracks flash. */
  flash: -99,
}

function CoreModel() {
  // Normalised to height 1; the group around it scales it to the layout.
  const { model, mats } = useArtefact(coreUrl(), 1)
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

/**
 * Shards of stone breaking off the right shoulder and trailing up and away, as
 * if the figure were still being freed from the rock. More break away as it is
 * carved (one more stream of them for each world opened).
 */
function Fragments() {
  const N = 24
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { geo, mat } = useAsteroid({ fade: true })
  const bits = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        u: Math.random(),
        speed: 0.018 + Math.random() * 0.02,
        // Off the line a little, more the further out it gets.
        off: new THREE.Vector3((Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.22, (Math.random() - 0.5) * 0.2),
        size: 0.012 + Math.pow(Math.random(), 2) * 0.04,
        rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
        spin: 0.2 + Math.random() * 0.6,
      })),
    [],
  )
  // A burst when a piece is carved: the next few shards start from the shoulder at once.
  core.chip = (_t, n) => {
    let left = n
    for (const b of bits) {
      if (left-- <= 0) break
      b.u = 0
    }
  }
  const from = useMemo(() => new THREE.Vector3(0.24, 0.5, 0.02), [])
  const to = useMemo(() => new THREE.Vector3(0.66, 0.84, 0.12), [])
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), p: new THREE.Vector3(), sc: new THREE.Vector3() }), [])
  useFrame((_, dt) => {
    const im = mesh.current
    if (!im) return
    const { m, q, p, sc } = tmp
    mat.opacity = systemShown()
    const active = Math.min(N, 8 + 3 * sculpt.core.opened)
    bits.forEach((b, i) => {
      b.u = (b.u + dt * b.speed) % 1
      b.rot.x += dt * b.spin
      b.rot.y += dt * b.spin * 0.7
      p.lerpVectors(from, to, b.u).addScaledVector(b.off, b.u)
      q.setFromEuler(b.rot)
      // Grows as it breaks free, thins out at the far end.
      const life = Math.min(1, b.u / 0.08) * (1 - Math.max(0, (b.u - 0.8) / 0.2))
      sc.setScalar(i < active ? b.size * life : 0)
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
  const name = useRef<HTMLButtonElement>(null)
  const gold = useMemo(() => new THREE.MeshBasicMaterial({ color: brightGold(2.3, 1.35, 0.5), toneMapped: false, transparent: true, opacity: 0, fog: false }), [])
  const pose = useRef<THREE.Group>(null)
  // A gold ribbon sweeping once round his chest and shoulders on a tilt (in the
  // bust's own units, height 1), thinning away to nothing at both ends.
  const ribbon = useMemo(() => {
    const pts: THREE.Vector3[] = []
    const N = 200
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const a = -1.9 + t * Math.PI * 2 * 0.92
      // Low at the front left, rising across his back to the right shoulder.
      pts.push(new THREE.Vector3(Math.cos(a) * 0.5, 0.3 + Math.sin(a + 0.6) * 0.09 + t * 0.08, Math.sin(a) * 0.42))
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.004, 8, false)
    // Taper: pull each ring of the tube in toward its centre line near the ends.
    const curve = new THREE.CatmullRomCurve3(pts)
    const p = geo.attributes.position
    const ring = 9
    const c = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      const t = Math.floor(i / ring) / 400
      const k = Math.min(1, t / 0.18, (1 - t) / 0.18)
      curve.getPointAt(Math.min(1, t), c)
      p.setXYZ(i, c.x + (p.getX(i) - c.x) * k, c.y + (p.getY(i) - c.y) * k, c.z + (p.getZ(i) - c.z) * k)
    }
    return geo
  }, [])
  useFrame(({ clock }) => {
    const g = group.current
    if (!g) return
    corePos(g.position)
    g.scale.setScalar(L().core.h)
    // Faces the overview camera...
    const cam = L().overview.cam
    g.rotation.y = Math.atan2(cam.x - g.position.x, cam.z - g.position.z)
    // ...while the figure itself looks up and away to the right, turning only a little.
    if (pose.current) pose.current.rotation.set(0, Math.sin(clock.elapsedTime * 0.12) * 0.06, 0)
    const shown = coreShown()
    const breath = 0.85 + 0.15 * Math.sin(clock.elapsedTime * 0.6)
    const rev = revealAmount()
    gold.opacity = shown
    // His name, only in the overview (at his summit the caption says it).
    if (name.current) {
      const on = flight.pick === 0 && flight.k > 0.6
      name.current.style.opacity = on ? '1' : '0'
      name.current.style.pointerEvents = on ? 'auto' : 'none'
    }
    if (glow.current) (glow.current.material as THREE.MeshBasicMaterial).opacity = shown * (0.22 + 0.15 * rev) * breath
    if (lamp.current) {
      // In world units: the bust is scaled up, the light's reach and strength are not.
      // Up at the face and short-reaching, so it warms the bust without floodlighting the steps and the water.
      lamp.current.intensity = shown * (2.4 + 3 * rev) * breath * L().core.h * 0.35
      lamp.current.distance = L().core.h * 0.9
    }
  })
  return (
    <group ref={group}>
      <group ref={pose}>
        <Skip fallback={<CoreStandIn />}>
          <Suspense fallback={null}>
            <CoreModel />
          </Suspense>
        </Skip>
      </group>
      <Suspense fallback={null}>
        <Fragments />
      </Suspense>
      {/* A gold halo behind the head, and the ribbon round the shoulders. */}
      <mesh material={gold} position={[0.03, 0.8, -0.2]}>
        <torusGeometry args={[0.34, 0.003, 10, 220]} />
      </mesh>
      <mesh geometry={ribbon} material={gold} />
      {/* Warm light from within: a glow behind it and a lamp on its face and the nearest worlds. */}
      <mesh ref={glow} position={[0.03, 0.72, -0.3]} scale={1.3}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={glowTexture()} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} />
      </mesh>
      <pointLight ref={lamp} position={[0, 0.78, 0.32]} color="#ffc98a" intensity={0} distance={6} decay={2} />
      {/* His name, like the steps': above his head. Tapping it opens his achievements. */}
      <Html position={[0, 1.02, 0]} center zIndexRange={[15, 0]}>
        <button
          ref={name}
          onClick={() => flight.pick === 0 && sculpt.jump?.(SUMMIT)}
          style={{
            opacity: 0,
            transition: 'opacity 0.5s',
            color: '#E3C68E',
            font: `600 ${LIGHT ? 9 : 11}px/1 Inter, system-ui, sans-serif`,
            letterSpacing: LIGHT ? '0.16em' : '0.22em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            background: 'rgba(8,6,4,0.72)',
            border: '1px solid rgba(201,174,130,0.5)',
            borderRadius: 999,
            padding: LIGHT ? '5px 10px' : '8px 14px',
            cursor: 'pointer',
          }}
        >
          VI · Achievements
        </button>
      </Html>
      {/* What you tap. */}
      <mesh
        position={[0, 0.5, 0]}
        onClick={(e) => {
          e.stopPropagation()
          if (flight.pick === 0) sculpt.jump?.(SUMMIT)
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
/** David and his halo: in the overview and at his own summit. */
const coreShown = () => (flight.pick === 0 || flight.pick === SUMMIT ? 1 : 1 - flight.k)

/** Gold dust hanging in the air over the water, drifting very slowly. */
function GoldDust() {
  const dust = useMemo(() => {
    const n = LIGHT ? 300 : 800
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const seeds = Array.from({ length: n }, () => ({ r: 0.5 + Math.pow(Math.random(), 0.6) * 8, th: Math.random() * Math.PI * 2, y: Math.random() * 6, w: (Math.random() - 0.5) * 0.02 }))
    return { g, seeds }
  }, [])
  const mat = useRef<THREE.PointsMaterial>(null)
  const p = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const pos = dust.g.attributes.position as THREE.BufferAttribute
    dust.seeds.forEach((d, i) => {
      d.th += dt * d.w
      ringPoint(d.r, d.th, L().water - L().c.y + d.y, p)
      pos.setXYZ(i, p.x, p.y, p.z)
    })
    pos.needsUpdate = true
    if (mat.current) mat.current.opacity = 0.75 * systemShown()
  })
  return (
    <points geometry={dust.g} frustumCulled={false}>
      <pointsMaterial ref={mat} size={0.022} color={new THREE.Color(1.5, 1.15, 0.7)} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} fog={false} sizeAttenuation />
    </points>
  )
}

/** Tall broken slabs of stone rising out of the water, and boulders half sunk at its edges. */
function Monoliths() {
  const mat = useMemo(() => {
    const t = rockTexture().clone()
    t.repeat.set(1, 3)
    t.needsUpdate = true
    // Lighter than the steps and a little glossy, so their edges catch the warm light like the mockup's.
    return new THREE.MeshStandardMaterial({ map: t, color: '#a39a8e', roughness: 0.62, metalness: 0.15, envMapIntensity: 0.6, transparent: true, opacity: 0 })
  }, [])
  const geos = useMemo(() => Array.from({ length: 4 }, (_, i) => monolithGeometry(i * 1.7 + 0.4)), [])
  const { geo: boulderGeo, mat: boulderMat } = useAsteroid({ fade: true })
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const brefs = useRef<(THREE.Mesh | null)[]>([])
  useFrame(() => {
    const shown = systemShown()
    for (const m of [mat, boulderMat]) {
      m.opacity = shown
      m.transparent = shown < 0.995
    }
    const lay = L()
    refs.current.forEach((m, i) => {
      if (!m) return
      const mo = lay.monoliths[i]
      m.visible = !!mo && shown > 0.01
      if (!mo) return
      // Its foot well under the water.
      m.position.set(mo.at.x, lay.water + mo.h / 2 - 0.6, mo.at.z)
      m.scale.set(mo.w, mo.h, mo.w * 0.7)
      m.rotation.set(0, i * 1.3, mo.tilt)
    })
    brefs.current.forEach((m, i) => {
      if (!m) return
      const b = lay.boulders[i]
      m.visible = !!b && shown > 0.01
      if (!b) return
      m.position.set(b.at.x, lay.water + b.s * 0.15, b.at.z)
      m.scale.set(b.s * 1.4, b.s * 0.7, b.s)
      m.rotation.set(0.2, i * 2.1, 0.1)
    })
  })
  return (
    <>
      {geos.map((g, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          geometry={g}
          material={mat}
        />
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <mesh
          key={'b' + i}
          ref={(m) => {
            brefs.current[i] = m
          }}
          geometry={boulderGeo}
          material={boulderMat}
        />
      ))}
    </>
  )
}

/** Low mist lying on the water. */
function Mist() {
  const camera = useThree((st) => st.camera)
  const banks = useMemo(
    () =>
      Array.from({ length: LIGHT ? 10 : 26 }, (_, i) => {
        // Half of them gather at the standing stones' feet.
        const mo = L().monoliths[i % Math.max(1, L().monoliths.length)]
        const atStone = i % 2 === 0 && mo
        return {
          x: atStone ? mo.at.x - L().c.x + (Math.random() - 0.5) * 3 : (Math.random() - 0.5) * 22,
          z: atStone ? mo.at.z + (Math.random() - 0.5) * 2 : -2 - Math.random() * 10,
          s: 3 + Math.random() * 5,
          o: 0.1 + Math.random() * 0.1,
          w: (Math.random() - 0.5) * 0.08,
        }
      }),
    [],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const mats = useMemo(() => banks.map((b) => new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#9b9286', transparent: true, opacity: 0, depthWrite: false, fog: false })), [banks])
  useFrame(({ clock }) => {
    const shown = systemShown()
    banks.forEach((b, i) => {
      const m = refs.current[i]
      if (!m) return
      m.position.set(L().c.x + b.x + Math.sin(clock.elapsedTime * b.w) * 1.5, L().water + b.s * 0.12, b.z)
      m.quaternion.copy(camera.quaternion)
      m.scale.set(b.s * 1.8, b.s * 0.5, 1)
      mats[i].opacity = b.o * shown
    })
  })
  return (
    <>
      {banks.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          material={mats[i]}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </>
  )
}

/** Gold sparks where a drifting stone strikes something (a small pool, reused). */
const sparks = { emit: (_p: THREE.Vector3, _size: number) => {} }
function Sparks() {
  const N = 10
  const camera = useThree((st) => st.camera)
  const pool = useMemo(() => Array.from({ length: N }, () => ({ t: 99, p: new THREE.Vector3(), size: 1 })), [])
  const mats = useMemo(
    () => pool.map(() => new THREE.MeshBasicMaterial({ map: glowTexture(), color: new THREE.Color(2.2, 1.5, 0.7), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })),
    [pool],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])
  sparks.emit = (p, size) => {
    const sp = pool.reduce((a, b) => (b.t > a.t ? b : a))
    sp.t = 0
    sp.p.copy(p)
    sp.size = size
  }
  useFrame((_, dt) => {
    pool.forEach((sp, i) => {
      sp.t += dt
      const m = refs.current[i]
      if (!m) return
      const k = sp.t / 0.7
      m.visible = k < 1
      if (!m.visible) return
      m.position.copy(sp.p)
      m.quaternion.copy(camera.quaternion)
      m.scale.setScalar(sp.size * (0.4 + k * 1.2))
      mats[i].opacity = Math.pow(1 - k, 2)
    })
  })
  return (
    <>
      {pool.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          material={mats[i]}
          visible={false}
        >
          <planeGeometry args={[1, 1]} />
        </mesh>
      ))}
    </>
  )
}

/**
 * Dark stones drifting slowly through the air over the water. When one meets
 * something (David, a step and its artefact, a standing stone, another drifter)
 * it glances off, spins up and throws a gold spark, and what it hit answers:
 * the artefact gives a start, David's gold cracks flash.
 */
function Rocks() {
  const N = LIGHT ? 6 : 12
  const mesh = useRef<THREE.InstancedMesh>(null)
  const { geo, mat } = useAsteroid({ fade: false })
  // Where they may drift (around the climb and David, never in front of the lens).
  const box = useMemo(() => ({ min: v(-7, 1, -11), max: v(12, 8, 2.5) }), [])
  const rocks = useMemo(
    () =>
      Array.from({ length: N }, () => {
        const dir = v(Math.random() - 0.5, (Math.random() - 0.5) * 0.4, Math.random() - 0.5).normalize()
        return {
          p: v(box.min.x + Math.random() * (box.max.x - box.min.x), box.min.y + Math.random() * (box.max.y - box.min.y), box.min.z + Math.random() * (box.max.z - box.min.z)),
          vel: dir.multiplyScalar(0.18 + Math.random() * 0.25),
          r: 0.08 + Math.pow(Math.random(), 2) * 0.28,
          stretch: v(0.75 + Math.random() * 0.5, 0.6 + Math.random() * 0.5, 0.75 + Math.random() * 0.5),
          rot: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
          tumble: (Math.random() - 0.5) * 0.3,
          cool: 0,
        }
      }),
    [N, box],
  )
  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3(), n: new THREE.Vector3(), c: new THREE.Vector3(), at: new THREE.Vector3() }), [])
  useFrame(({ clock }, dt) => {
    const im = mesh.current
    if (!im) return
    const t = clock.elapsedTime
    const step = Math.min(dt, 0.05)
    const { m, q, sc, n, c, at } = tmp
    const lay = L()
    /** Bounce rock r off a sphere (centre c, radius rad); returns whether it hit. */
    const sphere = (r: (typeof rocks)[number], rad: number) => {
      n.subVectors(r.p, c)
      const d = n.length()
      if (d >= rad + r.r || d === 0) return false
      n.divideScalar(d)
      r.p.copy(c).addScaledVector(n, rad + r.r)
      const into = r.vel.dot(n)
      if (into < 0) r.vel.addScaledVector(n, -2 * into)
      return true
    }
    rocks.forEach((r, i) => {
      r.cool -= step
      r.p.addScaledVector(r.vel, step)
      r.rot.x += step * r.tumble
      r.rot.y += step * r.tumble * 0.7
      r.tumble = THREE.MathUtils.damp(r.tumble, Math.sign(r.tumble) * 0.15, 0.5, step)
      // The edges of the space turn them back.
      for (const k of ['x', 'y', 'z'] as const) {
        if (r.p[k] < box.min[k] && r.vel[k] < 0) r.vel[k] *= -1
        if (r.p[k] > box.max[k] && r.vel[k] > 0) r.vel[k] *= -1
      }
      let hit: null | { size: number; react?: () => void } = null
      // David: his head and his chest.
      corePos(at)
      const h = lay.core.h
      c.set(at.x, at.y + h * 0.78, at.z)
      if (sphere(r, h * 0.16)) hit = { size: 0.9, react: () => (core.flash = t) }
      c.set(at.x, at.y + h * 0.4, at.z)
      if (!hit && sphere(r, h * 0.3)) hit = { size: 0.9, react: () => (core.flash = t) }
      // The steps and their artefacts.
      if (!hit)
        for (const id of IDS) {
          posOf(id, at)
          c.set(at.x, at.y + OBJS[id].h * lay.art * 0.5, at.z)
          if (sphere(r, Math.max(lay.seat[id].r, OBJS[id].h * 0.6) * lay.art)) {
            const chapter = OBJS[id].chapter
            hit = { size: 0.6, react: () => (sculpt.react = { chapter, at: performance.now() }) }
            break
          }
        }
      // The standing stones (as a column of spheres).
      if (!hit)
        for (const mo of lay.monoliths) {
          c.set(mo.at.x, THREE.MathUtils.clamp(r.p.y, lay.water, lay.water + mo.h), mo.at.z)
          if (sphere(r, mo.w * 0.55)) {
            hit = { size: 0.6 }
            break
          }
        }
      // Each other.
      if (!hit)
        for (let j = i + 1; j < rocks.length; j++) {
          c.copy(rocks[j].p)
          if (sphere(r, rocks[j].r)) {
            rocks[j].vel.addScaledVector(n, -0.15)
            hit = { size: 0.4 }
            break
          }
        }
      if (hit && r.cool <= 0) {
        r.cool = 0.6
        r.tumble = Math.sign(r.tumble || 1) * (1.2 + Math.random())
        // The spark sits where they met: on the rock's leading side.
        sparks.emit(c.copy(r.p).addScaledVector(n, -r.r), hit.size * (0.6 + r.r * 2))
        hit.react?.()
      }
      q.setFromEuler(r.rot)
      sc.copy(r.stretch).multiplyScalar(r.r)
      m.compose(r.p, q, sc)
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
    const N = LIGHT ? 700 : 1600
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
    if (want !== f.pick || layout.tall !== f.tall) {
      // A new flight starts from wherever the camera is now (the first shot starts in place).
      const first = f.pick === -1 || layout.tall !== f.tall
      const start = want === 0 ? L().overview : shotOf(want)
      f.fromPos.copy(first ? start.cam : cam.position)
      f.fromLook.copy(first ? start.look : f.look)
      f.fromFov = first ? start.fov : cam.fov
      f.pick = want
      f.tall = layout.tall
      f.t0 = t
    }
    const target = want === 0 ? L().overview : shotOf(want)
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
      <directionalLight position={[2, 5, -8]} intensity={1.2} color="#ffcf8a" />
      {/* A low warm key from the left, raking across the bust. */}
      <directionalLight position={[-9, 5, 1]} intensity={1.4} color="#ffd29a" />
      {/* Phones skip the glow pass, which leaves David dim: a soft warm front light makes up for it. */}
      {LIGHT && <directionalLight position={[-2, 6, 10]} intensity={2.4} color="#fff0dc" />}
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


// ---- The world ------------------------------------------------------------
// A dark polished floor far below that catches faint reflections, a soft
// pool of warm light under each artefact, and a deep, slow field of stars;
// everything fades into the black.

/** Where the floor sits for the current arrangement. */
const floorY = () => L().water

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
  const ripples = useMemo(() => rippleNormals(), [])
  useFrame((_, dt) => {
    if (ref.current) ref.current.position.y = floorY()
    // The water moves, slowly.
    ripples.offset.x += dt * 0.004
    ripples.offset.y += dt * 0.0025
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -2]}>
      <planeGeometry args={[90, 90]} />
      {/* Dark water that mostly shows what it mirrors: the ripples wobble the
          reflection (distortion) but are not lit themselves, which read as sand dunes.
          The reflection is multiplied by the base colour, so it must not be pure black.
          Phones get it too (the water is the scene), with no blur pass. */}
      <MeshReflectorMaterial
          resolution={LIGHT ? 512 : width < 768 ? 512 : 1024}
          blur={LIGHT ? [40, 12] : [20, 6]}
          mixBlur={0.05}
          mixStrength={7}
          mixContrast={1.15}
          roughness={1}
          depthScale={0}
          minDepthThreshold={0.7}
          maxDepthThreshold={1.8}
          color="#262626"
          metalness={0}
          envMapIntensity={0}
          mirror={0.92}
          distortionMap={ripples}
          distortion={0.09}
        />
    </mesh>
  )
}

function Stars() {
  const ref = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const n = LIGHT ? 350 : 700
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
  const [dpr, setDpr] = useState(() => (typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2)))
  const top = typeof window === 'undefined' ? 2 : Math.min(window.devicePixelRatio || 1, 2)
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      camera={{ fov: 44, position: [0, 2.7, 8.6], near: 0.05, far: 80 }}
      style={{ background: '#000' }}
    >
      <PerformanceMonitor
        onDecline={() => setDpr((d) => Math.max(LIGHT ? 2 : 1, +(d - 0.25).toFixed(2)))}
        onIncline={() => setDpr((d) => Math.min(top, +(d + 0.5).toFixed(2)))}
        flipflops={4}
        onFallback={() => setDpr(LIGHT ? 2 : 1)}
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
      <DragSpin />
      <GoldDust />
      <Suspense fallback={null}>
        <Monoliths />
      </Suspense>
      <Mist />
      <Core />
      <Suspense fallback={null}>
        <Rocks />
      </Suspense>
      <Sparks />
      {IDS.map((id) => (
        <Skip key={id}>
          <Suspense fallback={null}>
            <Artefact id={id} />
          </Suspense>
        </Skip>
      ))}
      <Floor />
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

useGLTF.preload(coreUrl())
useGLTF.preload('/models/slab.glb')
useGLTF.preload('/models/slab-lite.glb')
useGLTF.preload('/models/asteroid.glb')
useGLTF.preload('/models/brain.glb')
