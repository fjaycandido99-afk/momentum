'use client'

import { Component, Suspense, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, MeshReflectorMaterial, RoundedBox, useGLTF } from '@react-three/drei'
import { Bloom, EffectComposer, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { promises, sculpt } from './store'
import { FallingLeaves, SoundRings, makeFx, useBonsaiFx, useBrainFx } from './artefactFx'
import { DEMO_START, drawScreen, SCREEN_H, SCREEN_W, type DemoState } from './phoneScreens'

// "The Art of Becoming": the five parts of Voxu as artefacts on stone
// pedestals (Meshy image-to-3D, compressed with meshopt), a constellation in a
// black void: the AI Coach at the centre, the other four orbiting it at
// different depths on a faint gold ring. Tap one and the camera flies to it
// while the others fall back into the dark; scroll (or "Back to the
// universe") flies back out. Phones get their own tall arrangement.

type Id = 'column' | 'scroll' | 'brain' | 'bonsai' | 'headphones'
type Obj = { url: string; h: number; /** Its chapter (1..5). */ chapter: number; label: string; phase: number }
const OBJS: Record<Id, Obj> = {
  column: { url: '/models/column.glb', h: 1.6, chapter: 1, label: 'Daily Eras', phase: 0 },
  scroll: { url: '/models/scroll.glb', h: 0.9, chapter: 2, label: 'Reflection', phase: 1.3 },
  // The centrepiece, larger than the rest.
  brain: { url: '/models/brain.glb', h: 1.85, chapter: 3, label: 'AI Coach', phase: 2.6 },
  bonsai: { url: '/models/bonsai.glb', h: 1.45, chapter: 4, label: 'Habit Builder', phase: 3.9 },
  headphones: { url: '/models/headphones.glb', h: 1.2, chapter: 5, label: 'Guided Audio', phase: 5.2 },
}
const IDS = Object.keys(OBJS) as Id[]
const BY_CHAPTER = Object.fromEntries(IDS.map((id) => [OBJS[id].chapter, id])) as Record<number, Id>

type Layout = {
  overview: { cam: THREE.Vector3; look: THREE.Vector3; fov: number }
  at: Record<Id, THREE.Vector3>
  /** The orbit ring: centre and radii (x, z), or null for none. */
  ring: { c: THREE.Vector3; rx: number; rz: number } | null
}
const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const LAYOUTS: Record<'wide' | 'tall', Layout> = {
  wide: {
    overview: { cam: v(0, 2.7, 8.6), look: v(0, 0.55, -1.6), fov: 44 },
    at: { brain: v(0, -0.05, -1.6), column: v(-3.9, -0.35, 0.1), scroll: v(3.5, -0.55, 0.4), bonsai: v(-2.7, 0.55, -3.9), headphones: v(3.1, 0.6, -3.6) },
    ring: { c: v(0, 0.05, -1.75), rx: 4.1, rz: 2.15 },
  },
  tall: {
    overview: { cam: v(0, 0.6, 9.6), look: v(0, 0.2, -1.6), fov: 50 },
    at: { brain: v(0, -0.3, -1.6), column: v(-1.25, 2.0, -2.6), headphones: v(1.35, 2.15, -3.1), bonsai: v(-1.2, -2.3, -2.2), scroll: v(1.15, -2.1, -0.7) },
    ring: null,
  },
}
/** Which arrangement is on screen (set by the camera from the canvas shape). */
const layout = { tall: false }
const L = () => LAYOUTS[layout.tall ? 'tall' : 'wide']

/** The close shot for an object: in front of it (toward the overview camera), a little to one side and above. */
function shotFor(id: Id) {
  const o = OBJS[id]
  const at = L().at[id]
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
  useBrainFx(id === 'brain' ? fx : null, () => flight.pick === o.chapter)
  useBonsaiFx(id === 'bonsai' ? fx : null, { drop: (n) => leaves.current?.drop(n) })
  const place = useRef<THREE.Group>(null)
  const float = useRef<THREE.Group>(null)
  const label = useRef<HTMLButtonElement>(null)
  const mark = useRef<HTMLSpanElement>(null)
  const st = useRef({ hover: 0, shown: 0, born: -1, solid: false })
  const [hovered, setHovered] = useState(false)
  const reduced = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  useFrame(({ clock }, dt) => {
    const t = clock.elapsedTime
    const s = st.current
    if (s.born < 0) s.born = t
    const picked = flight.pick === o.chapter
    const someone = flight.pick !== 0
    if (picked) seen.add(o.chapter)
    // Where it floats (the arrangement depends on the screen), facing the overview camera.
    const at = L().at[id]
    const cam = L().overview.cam
    if (place.current) {
      place.current.position.copy(at)
      place.current.rotation.y = Math.atan2(cam.x - at.x, cam.z - at.z)
    }
    // Drifting slowly around its spot, bobbing, turning; the picked one settles.
    if (float.current && !reduced) {
      const free = picked ? 1 - flight.k : 1
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
      float.current.scale.setScalar(1 + 0.08 * jolt + beat)
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
    // Names only in the overview; brighter on hover; a gold mark once explored.
    if (label.current) {
      label.current.style.opacity = !someone && flight.k > 0.6 ? String(0.72 + 0.28 * s.hover) : '0'
      label.current.style.pointerEvents = someone ? 'none' : 'auto'
    }
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
      <Html position={[0, -0.18, 0]} center zIndexRange={[5, 0]}>
        <button
          ref={label}
          onClick={go}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          style={{
            opacity: 0,
            transition: 'opacity 0.5s',
            color: '#C9AE82',
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
          <span ref={mark} aria-hidden style={{ opacity: 0, width: 5, height: 5, borderRadius: 9, background: '#C9AE82', transition: 'opacity 0.5s' }} />
          {o.label}
        </button>
      </Html>
    </group>
  )
}

/** A faint gold orbit, tying the five together; it fades while one is open. */
function Ring() {
  const ref = useRef<THREE.LineLoop>(null)
  const line = useMemo(() => {
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 160; i++) {
      const a = (i / 160) * Math.PI * 2
      pts.push(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)))
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineDashedMaterial({ color: '#C9AE82', dashSize: 0.035, gapSize: 0.05, transparent: true, opacity: 0 })
    const l = new THREE.LineLoop(geo, mat)
    l.computeLineDistances()
    return l
  }, [])
  useFrame(({ clock }, dt) => {
    const r = L().ring
    const l = ref.current
    if (!l) return
    l.visible = !!r
    if (!r) return
    l.position.copy(r.c)
    l.scale.set(r.rx, 1, r.rz)
    l.rotation.y = clock.elapsedTime * 0.01
    const mat = l.material as THREE.LineDashedMaterial
    const want = flight.pick === 0 ? 0.32 * flight.k : 0.32 * (1 - flight.k)
    mat.opacity = THREE.MathUtils.damp(mat.opacity, want, 3, dt)
  })
  return <primitive ref={ref} object={line} />
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
      const start = want === 0 ? L().overview : shotFor(BY_CHAPTER[want])
      f.fromPos.copy(first ? start.cam : cam.position)
      f.fromLook.copy(first ? start.look : f.look)
      f.fromFov = first ? start.fov : cam.fov
      f.pick = want
      f.tall = layout.tall
      f.t0 = t
    }
    const target = want === 0 ? L().overview : shotFor(BY_CHAPTER[want])
    const k = reduced ? 1 : ease((t - f.t0) / 1.7)
    flight.pick = want
    flight.k = k
    const { p, l, r } = tmp
    p.lerpVectors(f.fromPos, target.cam, k)
    l.lerpVectors(f.fromLook, target.look, k)
    // Rise a little in the middle of the flight, like a crane.
    p.y += Math.sin(k * Math.PI) * 0.6
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

function Floor() {
  const ref = useRef<THREE.Mesh>(null)
  const width = useThree((s) => s.size.width)
  useFrame(() => {
    if (ref.current) ref.current.position.y = floorY()
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.25, -2]}>
      <planeGeometry args={[70, 70]} />
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
    </mesh>
  )
}

function Pools() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const x = c.getContext('2d')!
    const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64)
    gr.addColorStop(0, 'rgba(255,226,180,0.9)')
    gr.addColorStop(0.35, 'rgba(255,214,160,0.35)')
    gr.addColorStop(1, 'rgba(0,0,0,0)')
    x.fillStyle = gr
    x.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])
  const refs = useRef<Partial<Record<Id, THREE.Mesh>>>({})
  useFrame((_, dt) => {
    for (const id of IDS) {
      const m = refs.current[id]
      if (!m) continue
      const at = L().at[id]
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
    const n = 1400
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
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}
      camera={{ fov: 44, position: [0, 2.7, 8.6], near: 0.05, far: 80 }}
      style={{ background: '#000' }}
    >
      <color attach="background" args={['#000000']} />
      {/* Everything far away fades into the black. */}
      <fog attach="fog" args={['#000000', 11, 30]} />
      <Stars />
      {/* Reflections only (the background stays black): a clean studio. */}
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={3} color="#fff4e8" position={[-4, 5, 5]} scale={[6, 3, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffffff" position={[5, 2, 3]} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#d9c19a" position={[0, 3, -6]} scale={[8, 2, 1]} />
      </Environment>
      <Director />
      <DragSpin />
      <Ring />
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
      <EffectComposer multisampling={4} enableNormalPass={false}>
        <Bloom intensity={0.25} luminanceThreshold={0.88} luminanceSmoothing={0.15} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.35} darkness={0.5} />
        <SMAA />
      </EffectComposer>
    </Canvas>
  )
}

useGLTF.preload('/models/brain.glb')
