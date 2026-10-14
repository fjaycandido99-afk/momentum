'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SECTIONS, STAGE_OF, carve, sculpt, sectionEls, type Section } from './store'

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

// ---- Where the scroll is ----------------------------------------------------
// p runs 0..6 across the sections: the section under the middle of the
// screen, plus how far through it you are.
function readProgress() {
  const mid = window.innerHeight * 0.5
  const list = sectionEls
    .filter((s) => s.el.isConnected)
    .map((s) => ({ i: SECTIONS.indexOf(s.id), r: s.el.getBoundingClientRect() }))
    .sort((a, b) => a.i - b.i)
  if (!list.length) return { p: 0, section: 'hero' as Section }
  let cur = list[0]
  for (const s of list) if (s.r.top <= mid) cur = s
  const frac = Math.min(1, Math.max(0, (mid - cur.r.top) / Math.max(cur.r.height, 1)))
  return { p: cur.i + frac, section: SECTIONS[cur.i] }
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
    const r = readProgress()
    now.p = r.p
    now.section = r.section
    const s = stagesAt(r.p)
    const d = Math.min(dt, 0.05)
    ;(Object.keys(live) as (keyof typeof live)[]).forEach((k) => {
      const want = Math.max(s[k], sculpt.manual[k])
      const before = live[k]
      live[k] = THREE.MathUtils.damp(live[k], want, 3.2, d)
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
      uMinY: { value: 0 },
      uMaxY: { value: H },
    }
    const mat = base.clone()
    mat.map = null
    mat.normalMap = null
    mat.roughnessMap = null
    mat.metalnessMap = null
    mat.metalness = 0
    mat.color.set('#ffffff')
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uHead, uTorso, uLegs, uMinY, uMaxY;
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
          r = max(r, smoothstep(-0.72, -0.88, yn) * 0.9); // the unfinished feet
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
          float veinLine = smoothstep(0.93, 1.0, 1.0 - vein) * (0.35 + 0.65 * vxNoise(vObj * 7.0));
          vec3 polished = vec3(0.95, 0.94, 0.92) - veinLine * vec3(0.20, 0.20, 0.22);
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
function Statue() {
  const { scene } = useGLTF('/models/statue.glb')
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
    uniforms.uHead.value = live.head
    uniforms.uTorso.value = live.torso
    uniforms.uLegs.value = live.legs
    uniforms.uPolish.value = live.polish
  })
  return <primitive object={model} scale={fit.k} position={fit.offset} />
}

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
      const f = smooth(c.th, c.th + 0.18, live.block)
      v.copy(c.p).addScaledVector(c.dir, f * 0.9)
      v.y -= f * f * 2.6
      e.set(c.tilt.x + c.spin.x * f, c.tilt.y + c.spin.y * f, c.tilt.z + c.spin.z * f)
      q.setFromEuler(e)
      sc.copy(c.s).multiplyScalar(Math.max(0.0001, 1 - f))
      m.compose(v, q, sc)
      mesh.setMatrixAt(i, m)
    })
    mesh.instanceMatrix.needsUpdate = true
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
    mesh.visible = live.block < 0.999
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

// ---- Camera: a viewpoint per section, blended as you scroll ----------------------
// [distance, camera height, look-at height, orbit angle]
const VIEWS: Record<Section, [number, number, number, number]> = {
  hero: [7.4, 1.9, 1.6, 0.25],
  potential: [6.3, 1.8, 1.6, -0.35],
  intention: [2.4, 2.95, 2.85, 0.15],
  discipline: [3.5, 2.3, 2.1, -0.55],
  strength: [3.7, 0.9, 1.0, 0.6],
  polish: [5.0, 1.9, 1.7, -0.2],
  final: [8.6, 1.7, 1.6, 0.05],
}

function Rig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pos = useRef(new THREE.Vector3(0, 2, 10))
  const look = useRef(new THREE.Vector3(0, 1.6, 0))
  const vp = useMemo(() => new THREE.Vector3(), [])
  const vl = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    const i = Math.min(SECTIONS.length - 1, Math.floor(now.p))
    const k = smooth(0.55, 1, now.p - i) // hold the view, then move on near the end
    const a = VIEWS[SECTIONS[i]]
    const b = VIEWS[SECTIONS[Math.min(SECTIONS.length - 1, i + 1)]]
    const mix = (x: number, y: number) => x + (y - x) * k
    let [dist, cy, ly, ang] = [mix(a[0], b[0]), mix(a[1], b[1]), mix(a[2], b[2]), mix(a[3], b[3])]
    // Wide screens: the statue sits right of the text. Phones: centred,
    // lifted into the top half, and further back.
    const aspect = size.width / Math.max(1, size.height)
    const narrow = Math.min(1, Math.max(0, (1.5 - aspect) / 0.8))
    dist *= 1 + 0.55 * narrow
    const sideways = 1.25 * (1 - narrow) * Math.min(1, dist / 5)
    ang += Math.sin(clock.elapsedTime * 0.15) * 0.04 + sculpt.pointer.x * 0.05
    vl.set(-sideways, ly - narrow * 0.9 * Math.min(1, dist / 5), 0)
    vp.set(Math.sin(ang) * dist, cy, Math.cos(ang) * dist).add(new THREE.Vector3(-sideways, -narrow * 0.4, 0))
    const d = Math.min(dt, 0.05)
    pos.current.lerp(vp, 1 - Math.exp(-3 * d))
    look.current.lerp(vl, 1 - Math.exp(-3 * d))
    camera.position.copy(pos.current)
    camera.lookAt(look.current)
  })
  return null
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
    if (s.down && s.moved < 6 && performance.now() - s.holdFrom > 250) carve(STAGE_OF[now.section], d * 0.45)
    if (!s.down) {
      s.yaw += s.vel
      s.vel *= Math.exp(-3 * d)
    }
    if (g.current) g.current.rotation.y = s.yaw + Math.sin(clock.elapsedTime * 0.2) * 0.3
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
      camera={{ position: [0, 2, 10], fov: 32, near: 0.5, far: 80 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#060609')}
    >
      <fog attach="fog" args={['#060609', 9, 26]} />
      <ambientLight intensity={0.16} />
      {/* One warm key light from above-left, an indigo rim from behind. */}
      <directionalLight
        position={[-4, 7, 4]}
        intensity={2.8}
        color="#ffe8cc"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[3, 3, -5]} intensity={1.6} color="#7c6cff" />
      <pointLight position={[0, 1.2, 2.5]} intensity={4} color="#c9c2ff" distance={6} />
      <Progress />
      <Rig />
      <Plinth />
      <Turntable>
        <Suspense fallback={null}>
          <Statue />
        </Suspense>
        <Block />
        <Dust />
      </Turntable>
    </Canvas>
  )
}

useGLTF.preload('/models/statue.glb')
