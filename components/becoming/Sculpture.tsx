'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SECTIONS, STAGE_OF, carve, carvedProgress, sculpt, sectionAt, type Section } from './store'

// "The Art of Becoming": a marble statue that is carved as you scroll.
// One finished model (Meshy); a shader keeps each region rough, chalky and
// chiselled until its stage is reached: the block falls away, then the
// head, the torso and arms, the legs, and finally the stone polishes. A
// patch of raw stone always stays at the feet: becoming is never finished.

const H = 3.2 // statue height in the world
const smooth = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/** How carved each stage is at progress p (scroll), before hand carving. */
function stagesAt(p: number) {
  return {
    block: smooth(0.55, 1.55, p),
    head: smooth(1.55, 2.5, p),
    torso: smooth(2.5, 3.45, p),
    legs: smooth(3.45, 4.4, p),
    polish: smooth(4.4, 5.35, p),
  }
}
const live = { block: 0, head: 0, torso: 0, legs: 0, polish: 0 }
const now = { p: 0, section: 'hero' as Section }

function Progress() {
  useFrame((_, dt) => {
    // The view follows the scroll or the hand carving, whichever is further.
    now.p = carvedProgress()
    now.section = sectionAt(now.p)
    const s = stagesAt(sculpt.p)
    const d = Math.min(dt, 0.05)
    ;(Object.keys(live) as (keyof typeof live)[]).forEach((k) => {
      const want = Math.max(s[k], sculpt.manual[k])
      const before = live[k]
      // Catch up faster after a big jump (a quick scroll, a link).
      live[k] = THREE.MathUtils.damp(live[k], want, 3.2 + Math.abs(want - live[k]) * 14, d)
      sculpt.activity = Math.min(1, sculpt.activity + Math.abs(live[k] - before) * 3)
    })
    sculpt.activity = THREE.MathUtils.damp(sculpt.activity, 0, 1.6, d)
  })
  return null
}

// ---- The carving shader ------------------------------------------------------
const NOISE = /* glsl */ `
float vxHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vxNoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(vxHash(i), vxHash(i + vec3(1,0,0)), f.x), mix(vxHash(i + vec3(0,1,0)), vxHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(vxHash(i + vec3(0,0,1)), vxHash(i + vec3(1,0,1)), f.x), mix(vxHash(i + vec3(0,1,1)), vxHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}`

function useCarvedMaterial(base: THREE.MeshStandardMaterial) {
  return useMemo(() => {
    const uniforms = {
      uHead: { value: 0 },
      uTorso: { value: 0 },
      uLegs: { value: 0 },
      uPolish: { value: 0 },
      uFeet: { value: 1 },
      uMinY: { value: 0 },
      uMaxY: { value: H },
    }
    // Marble, not plaster: a physical material with a soft clearcoat (the
    // sheen of polished stone) and a faint warm glow from within, standing
    // in for the way light sinks into real marble. Meshy's own texture isn't
    // used; the shader paints the stone.
    void base
    const mat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 0,
      roughness: 0.4,
      clearcoat: 0.01,
      clearcoatRoughness: 0.28,
      emissive: new THREE.Color('#3a2c1e'),
      emissiveIntensity: 0.0,
    })
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uHead, uTorso, uLegs, uFeet, uMinY, uMaxY;
          varying float vRough; varying vec3 vObj; varying float vYn;
          ${NOISE}`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vObj = position;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          // Height through the statue, -1 (feet) .. 1 (crown), with a ragged
          // edge so a carved region never meets the rough one in a line.
          float yn = (wp.y - uMinY) / (uMaxY - uMinY) * 2.0 - 1.0;
          yn += (vxNoise(position * 5.0) - 0.5) * 0.14;
          vYn = yn;
          float r = mix(1.0 - uLegs, 1.0 - uTorso, smoothstep(-0.34, -0.2, yn));
          r = mix(r, 1.0 - uHead, smoothstep(0.52, 0.62, yn));
          r = max(r, smoothstep(-0.72, -0.88, yn) * 0.9 * uFeet); // the unfinished feet
          vRough = clamp(r, 0.0, 1.0);
          // Rough stone: chunky, chiselled displacement out from the surface.
          float n = floor(vxNoise(position * 11.0) * 4.0) / 4.0;
          transformed += normal * (n - 0.25) * 0.045 * vRough;`,
        )
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uPolish;
          varying float vRough; varying vec3 vObj; varying float vYn;
          ${NOISE}`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          // Polished marble: warm white with soft grey veins.
          float vein = abs(sin((vObj.x * 0.8 + vObj.y * 0.55 + vObj.z * 0.3) * 9.0 + vxNoise(vObj * 3.0) * 7.0));
          float veinLine = smoothstep(0.9, 1.0, 1.0 - vein) * (0.4 + 0.6 * vxNoise(vObj * 7.0));
          // Faint cloudy variation, then thin grey veins: Carrara, not plaster.
          float cloud = vxNoise(vObj * 2.2) * 0.05;
          vec3 polished = vec3(0.965, 0.95, 0.915) - cloud - veinLine * vec3(0.30, 0.30, 0.31);
          // Rough stone: chalky grey with chisel marks.
          float chisel = smoothstep(0.55, 0.9, abs(sin((vObj.x + vObj.y * 1.7) * 60.0 + vxNoise(vObj * 9.0) * 4.0)));
          vec3 rough = vec3(0.66, 0.65, 0.63) * (0.82 + 0.28 * vxNoise(vObj * 34.0)) - chisel * 0.05;
          diffuseColor.rgb = mix(polished, rough, vRough);`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(mix(0.5, 0.2, uPolish), 0.95, vRough);`,
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
          // Rough stone is faceted: blend toward flat per-face normals.
          vec3 faceN = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
          normal = normalize(mix(normal, faceN, vRough * 0.85));`,
        )
    }
    mat.customProgramCacheKey = () => 'voxu-carved'
    return { mat, uniforms }
  }, [base])
}

// ---- The statue ---------------------------------------------------------------
// Who stands in the spotlight when: the carved statue for the carving
// chapters and the end; each gallery statue for its own chapter. A statue
// leaving sinks down through the plinth; the next one rises out of it.
const PRESENCE: Record<string, (p: number) => number> = {
  david: (p) => 1 - smooth(5.82, 6.12, p) + smooth(8.88, 9.18, p),
  stoic: (p) => smooth(5.88, 6.18, p) * (1 - smooth(6.82, 7.12, p)),
  samurai: (p) => smooth(6.88, 7.18, p) * (1 - smooth(7.82, 8.12, p)),
  scholar: (p) => smooth(7.88, 8.18, p) * (1 - smooth(8.82, 9.12, p)),
}
const GALLERY = [
  { id: 'stoic', url: '/models/stoic.glb' },
  { id: 'samurai', url: '/models/samurai.glb' },
  { id: 'scholar', url: '/models/scholar.glb' },
]

function Statue({ id = 'david', url = '/models/statue.glb' }: { id?: string; url?: string }) {
  const { scene } = useGLTF(url)
  const holder = useRef<THREE.Group>(null)
  const carved = id === 'david'
  const mesh = useMemo(() => {
    let found: THREE.Mesh | null = null
    scene.traverse((o) => {
      if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh
    })
    return found as unknown as THREE.Mesh
  }, [scene])
  const { mat, uniforms } = useCarvedMaterial(mesh.material as THREE.MeshStandardMaterial)
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const k = H / size.y
    const c = box.getCenter(new THREE.Vector3())
    return { k, offset: new THREE.Vector3(-c.x * k, -box.min.y * k, -c.z * k) }
  }, [scene])
  const model = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => {
      const me = o as THREE.Mesh
      if (me.isMesh) {
        me.material = mat
        me.castShadow = true
      }
    })
    return m
  }, [scene, mat])
  useFrame(() => {
    // The gallery statues are finished works: fully carved and polished,
    // no raw patch. The carved statue follows the carving.
    uniforms.uHead.value = carved ? live.head : 1
    uniforms.uTorso.value = carved ? live.torso : 1
    uniforms.uLegs.value = carved ? live.legs : 1
    uniforms.uPolish.value = carved ? live.polish : 1
    uniforms.uFeet.value = carved ? 1 : 0
    // Polished stone gets the clearcoat sheen and the inner glow.
    const pol = carved ? live.polish : 1
    mat.clearcoat = 0.01 + 0.5 * pol
    mat.emissiveIntensity = 0.35 * pol
    const pres = Math.min(1, Math.max(0, PRESENCE[id](now.p)))
    const y = (pres - 1) * H * 1.08
    if (holder.current) {
      holder.current.position.y = y
      holder.current.rotation.y = (1 - pres) * 1.6
      holder.current.visible = pres > 0.001
    }
    // Carving bands are measured from where the statue actually stands.
    uniforms.uMinY.value = y
    uniforms.uMaxY.value = y + H
  })
  return (
    <group ref={holder}>
    <primitive
      object={model}
      scale={fit.k}
      position={fit.offset}
      onPointerDown={(e: { point: THREE.Vector3 }) => {
        sculpt.hit = { x: e.point.x, y: e.point.y, z: e.point.z }
      }}
      onPointerMove={(e: { point: THREE.Vector3 }) => {
        if (sculpt.hit) sculpt.hit = { x: e.point.x, y: e.point.y, z: e.point.z }
      }}
    />
    </group>
  )
}

// ---- Chips: stone flying off the chisel point while you hold ----------------------
function Chips() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const N = 70
  const parts = useMemo(
    () => Array.from({ length: N }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), life: 0, spin: new THREE.Vector3() })),
    [],
  )
  const next = useRef(0)
  const acc = useRef(0)
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    const h = sculpt.hit
    if (h && holding.current) {
      acc.current += d * 28
      while (acc.current > 1) {
        acc.current -= 1
        const c = parts[next.current++ % N]
        c.p.set(h.x, h.y, h.z)
        c.v.set((Math.random() - 0.5) * 2.2, 0.6 + Math.random() * 1.6, (Math.random() - 0.2) * 2.2)
        c.spin.set(Math.random() * 9, Math.random() * 9, Math.random() * 9)
        c.life = 1
      }
    }
    const mesh = ref.current
    if (!mesh) return
    parts.forEach((c, i) => {
      if (c.life > 0) {
        c.life -= d * 1.4
        c.v.y -= 6 * d
        c.p.addScaledVector(c.v, d)
        if (c.p.y < 0.01) {
          c.p.y = 0.01
          c.v.multiplyScalar(0.3)
          c.v.y = Math.abs(c.v.y)
        }
      }
      e.set(c.spin.x * (1 - c.life), c.spin.y * (1 - c.life), c.spin.z * (1 - c.life))
      q.setFromEuler(e)
      sc.setScalar(Math.max(0.0001, c.life) * (0.025 + (i % 5) * 0.006))
      m.compose(c.p, q, sc)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} castShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#d9d4cc" roughness={0.9} flatShading />
    </instancedMesh>
  )
}
/** True while the visitor is pressing on the statue (set by the turntable). */
const holding = { current: false }

// ---- The block of marble the statue comes out of -------------------------------
// Chunks covering the figure. They fall away as the block stage progresses
// (top first, a little random), tumbling and shrinking, and come back if
// you scroll back up.
function Block() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const chunks = useMemo(() => {
    const out: { p: THREE.Vector3; s: THREE.Vector3; th: number; dir: THREE.Vector3; spin: THREE.Vector3; tilt: THREE.Vector3 }[] = []
    const nx = 4, ny = 9, nz = 3
    const w = 1.5, d = 1.05
    const rnd = (i: number) => {
      const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
      return s - Math.floor(s)
    }
    let i = 0
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++)
        for (let z = 0; z < nz; z++) {
          const hy = (y + 0.5) / ny
          out.push({
            p: new THREE.Vector3((x + 0.5) / nx * w - w / 2, hy * (H + 0.15), (z + 0.5) / nz * d - d / 2),
            s: new THREE.Vector3(w / nx, (H + 0.15) / ny, d / nz).multiplyScalar(1.1 + rnd(i) * 0.12),
            th: (1 - hy) * 0.7 + rnd(i + 9) * 0.25, // top falls first
            dir: new THREE.Vector3(x - (nx - 1) / 2, 0, z - (nz - 1) / 2).normalize().multiplyScalar(0.6 + rnd(i + 3)),
            spin: new THREE.Vector3(rnd(i + 5) - 0.5, rnd(i + 6) - 0.5, rnd(i + 7) - 0.5).multiplyScalar(4),
            // Hewn, not machined: every stone sits a little crooked.
            tilt: new THREE.Vector3(rnd(i + 11) - 0.5, rnd(i + 12) - 0.5, rnd(i + 13) - 0.5).multiplyScalar(0.12),
          })
          i++
        }
    return out
  }, [])
  const tinted = useRef(false)
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const mesh = ref.current
    if (!mesh) return
    chunks.forEach((c, i) => {
      // live.block * 1.2 so even the lowest stones finish falling by the end.
      const f = smooth(c.th, c.th + 0.18, live.block * 1.2)
      v.copy(c.p).addScaledVector(c.dir, f * 0.9)
      v.y -= f * f * 2.6
      e.set(c.tilt.x + c.spin.x * f, c.tilt.y + c.spin.y * f, c.tilt.z + c.spin.z * f)
      q.setFromEuler(e)
      sc.copy(c.s).multiplyScalar(Math.max(0.0001, 1 - f))
      m.compose(v, q, sc)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
    // The block belongs to the carved statue: it leaves with it.
    const dp = Math.min(1, Math.max(0, PRESENCE.david(now.p)))
    mesh.position.y = (dp - 1) * H * 1.08
    if (!tinted.current) {
      // Varied marble tones, so the block reads as stone, not a wall.
      const col = new THREE.Color()
      chunks.forEach((_, i) => {
        const t = Math.sin(i * 91.7) * 0.5 + 0.5
        mesh.setColorAt(i, col.setRGB(0.66 + t * 0.12, 0.65 + t * 0.11, 0.62 + t * 0.1))
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
      tinted.current = true
    }
    mesh.visible = live.block < 0.999 && dp > 0.001
  })
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, chunks.length]} castShadow receiveShadow>
      <boxGeometry />
      <meshStandardMaterial color="#ffffff" roughness={0.95} flatShading />
    </instancedMesh>
  )
}

// ---- Marble dust: drifts down while carving happens -----------------------------
function Dust() {
  const ref = useRef<THREE.Points>(null)
  const N = 260
  const { geo, speed } = useMemo(() => {
    const pos = new Float32Array(N * 3)
    const speed = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      pos.set([(Math.random() - 0.5) * 2.2, Math.random() * H, (Math.random() - 0.5) * 1.6], i * 3)
      speed[i] = 0.15 + Math.random() * 0.35
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return { geo: g, speed }
  }, [])
  useFrame((_, dt) => {
    const p = ref.current
    if (!p) return
    const a = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      let y = a.getY(i) - speed[i] * Math.min(dt, 0.05)
      if (y < 0) y = H
      a.setY(i, y)
    }
    a.needsUpdate = true
    ;(p.material as THREE.PointsMaterial).opacity = 0.08 + sculpt.activity * 0.7
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#e9e4dc" size={0.022} transparent opacity={0.1} depthWrite={false} sizeAttenuation />
    </points>
  )
}

// ---- The workshop: a still camera, a turning statue, a moving work light -------
// The camera never zooms. It frames the whole figure and only drifts a
// little. Each chapter turns the statue on its stand to show a new side
// (like a sculptor turning the piece), and a narrow work light slides to
// the part being carved, then opens up to light the whole figure.
// [statue turn (radians), work-light height, work-light width]
const WORK: Record<Section, [number, number, number]> = {
  hero: [0.0, 1.7, 0.42],
  potential: [-0.55, 1.7, 0.42],
  intention: [0.45, 2.95, 0.13],
  discipline: [-0.75, 2.2, 0.17],
  strength: [0.7, 0.85, 0.17],
  polish: [-0.25, 1.7, 0.36],
  stoic: [0.35, 1.75, 0.36],
  samurai: [-0.35, 1.75, 0.36],
  scholar: [0.4, 1.85, 0.36],
  final: [0.0, 1.7, 0.42],
}
/** The chapter's turn and light, blended near the end of each chapter. */
const work = { turn: 0, lightY: 1.7, width: 0.42 }
function blendWork() {
  const i = Math.min(SECTIONS.length - 1, Math.floor(now.p))
  const k = smooth(0.55, 1, now.p - i)
  const x = WORK[SECTIONS[i]]
  const y = WORK[SECTIONS[Math.min(SECTIONS.length - 1, i + 1)]]
  return { turn: x[0] + (y[0] - x[0]) * k, lightY: x[1] + (y[1] - x[1]) * k, width: x[2] + (y[2] - x[2]) * k }
}

function Rig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(({ clock }, dt) => {
    const d = Math.min(dt, 0.05)
    const w = blendWork()
    work.turn = THREE.MathUtils.damp(work.turn, w.turn, 2.2, d)
    work.lightY = THREE.MathUtils.damp(work.lightY, w.lightY, 2.6, d)
    work.width = THREE.MathUtils.damp(work.width, w.width, 2.6, d)
    // Fixed framing: far enough for the whole figure; phones step back.
    const aspect = size.width / Math.max(1, size.height)
    const narrow = Math.min(1, Math.max(0, (1.2 - aspect) / 0.7))
    const dist = 12.5 * (1 + 0.7 * narrow)
    const t = clock.elapsedTime
    const ang = Math.sin(t * 0.12) * 0.05 + sculpt.pointer.x * 0.03
    camera.position.set(Math.sin(ang) * dist, 1.4 + Math.sin(t * 0.17) * 0.06 + sculpt.pointer.y * 0.06, Math.cos(ang) * dist)
    camera.lookAt(0, 1.65 - narrow * 0.6, 0)
    // Shift the picture up so the statue lives above the caption.
    const cam = camera as THREE.PerspectiveCamera
    const lift = Math.round(size.height * 0.14)
    if (cam.view?.offsetY !== lift) cam.setViewOffset(size.width, size.height, 0, lift, size.width, size.height)
  })
  return null
}

// The work light: a narrow warm spot on the region being carved, with a
// faint visible beam, opening to light the whole figure at the end.
function WorkLight() {
  const light = useRef<THREE.SpotLight>(null)
  const beam = useRef<THREE.Mesh>(null)
  const target = useMemo(() => new THREE.Object3D(), [])
  useFrame(() => {
    const l = light.current
    if (!l) return
    target.position.set(0, work.lightY, 0)
    l.angle = work.width
    // Narrow light is concentrated: brighter, so the worked region glows.
    l.intensity = 90 + (0.42 - work.width) * 420
    if (beam.current) {
      const top = new THREE.Vector3(1.6, 7.5, 3.2)
      const to = new THREE.Vector3(0, work.lightY, 0)
      const len = top.distanceTo(to)
      beam.current.position.copy(top).lerp(to, 0.5)
      beam.current.lookAt(to)
      beam.current.rotateX(Math.PI / 2)
      const r = Math.tan(work.width) * len
      beam.current.scale.set(r, len, r)
    }
  })
  return (
    <>
      <primitive object={target} />
      <spotLight ref={light} position={[1.6, 7.5, 3.2]} target={target} angle={0.42} penumbra={0.75} distance={18} color="#ffe2b8" castShadow />
      <mesh ref={beam}>
        <coneGeometry args={[1, 1, 40, 1, true]} />
        <meshBasicMaterial color="#ffe6c4" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
      </mesh>
    </>
  )
}

// ---- Turn it, and carve it by hand -------------------------------------------------
// Drag to turn the statue. Press and hold (without dragging) to carve the
// stage the page is on: dust rises and that part of the stone clears.
function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const st = useRef({ down: false, moved: 0, lastX: 0, yaw: 0, vel: 0, holdFrom: 0 })
  useEffect(() => {
    const el = gl.domElement
    const s = st.current
    const down = (e: PointerEvent) => {
      s.down = true
      s.moved = 0
      s.lastX = e.clientX
      s.holdFrom = performance.now()
    }
    const move = (e: PointerEvent) => {
      if (!s.down) return
      const dx = e.clientX - s.lastX
      s.lastX = e.clientX
      s.moved += Math.abs(dx)
      s.yaw += dx * 0.008
      s.vel = dx * 0.008
    }
    const up = () => {
      s.down = false
      holding.current = false
      sculpt.hit = null
    }
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [gl])
  useFrame(({ clock }, dt) => {
    const s = st.current
    const d = Math.min(dt, 0.05)
    const held = s.down && s.moved < 8 && performance.now() - s.holdFrom > 180 && !!sculpt.hit
    holding.current = held
    if (held) carve(STAGE_OF[now.section], d * 0.4)
    if (!s.down) {
      s.yaw += s.vel
      s.vel *= Math.exp(-3 * d)
    }
    if (g.current) g.current.rotation.y = work.turn + s.yaw + Math.sin(clock.elapsedTime * 0.2) * 0.12
  })
  return <group ref={g}>{children}</group>
}

function Plinth() {
  return (
    <group>
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[1.35, 1.45, 0.24, 64]} />
        <meshStandardMaterial color="#121216" roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.24, 0]} receiveShadow>
        <circleGeometry args={[30, 64]} />
        <meshStandardMaterial color="#08080b" roughness={0.6} />
      </mesh>
    </group>
  )
}

export default function Sculpture() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 1.3, 12.5], fov: 32, near: 0.5, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#060609')}
    >
      <fog attach="fog" args={['#060609', 9, 26]} />
      <ambientLight intensity={0.28} />
      {/* One warm key light from above-left, an indigo rim from behind. */}
      <directionalLight
        position={[-4, 7, 4]}
        intensity={2.0}
        color="#ffe8cc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[3, 3, -5]} intensity={0.7} color="#7c6cff" />
      <WorkLight />
      <pointLight position={[0, 1.2, 2.5]} intensity={4} color="#c9c2ff" distance={6} />
      <Progress />
      <Rig />
      <Plinth />
      <Turntable>
        <Suspense fallback={null}>
          <Statue />
          {GALLERY.map((g) => (
            <Statue key={g.id} id={g.id} url={g.url} />
          ))}
        </Suspense>
        <Block />
        <Dust />
      </Turntable>
      <Chips />
    </Canvas>
  )
}

useGLTF.preload('/models/statue.glb')
GALLERY.forEach((g) => useGLTF.preload(g.url))
