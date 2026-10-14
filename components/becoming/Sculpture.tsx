'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, RoundedBox, useGLTF, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { SECTIONS, STAGE_OF, carve, carvedProgress, promises, sculpt, sectionAt, type Section } from './store'
import { SCREENS, SCREEN_H, SCREEN_W, drawScreen } from './phoneScreens'

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
      live[k] = THREE.MathUtils.damp(live[k], want, 5.5 + Math.abs(want - live[k]) * 16, d)
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
      uMarks: { value: Array.from({ length: 30 }, () => new THREE.Vector3(0, -99, 0)) },
      uLit: { value: 0 },
      uDissolve: { value: 1 },
      uDir: { value: 0 },
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
          varying float vRough; varying vec3 vObj; varying float vYn; varying vec3 vWorld;
          ${NOISE}`,
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vObj = position;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
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
          uniform float uPolish, uLit, uDissolve, uDir;
          uniform vec3 uMarks[30];
          varying float vRough; varying vec3 vObj; varying float vYn; varying vec3 vWorld;
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
          diffuseColor.rgb = mix(polished, rough, vRough);
          float vxEdge = 0.0;
          // Kintsugi: each kept promise lays a thin seam of gold into the
          // stone around its mark.
          float seamMask = 0.0;
          for (int i = 0; i < 30; i++) {
            if (float(i) >= uLit) break;
            seamMask = max(seamMask, 1.0 - smoothstep(0.12, 0.42, distance(vWorld, uMarks[i])));
          }
          float seamN = abs(vxNoise(vWorld * 5.0) - 0.5) + abs(vxNoise(vWorld * 13.0) - 0.5) * 0.25;
          float vxSeam = (1.0 - smoothstep(0.012, 0.034, seamN)) * seamMask;
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.62, 0.33), vxSeam);
          // Dissolve: the statue turns to dust from the base up as it leaves,
          // and forms from the base up as it arrives.
          if (uDissolve < 0.999) {
            // A clean sweep along the height, barely broken by the grain:
            // arriving builds from the base up, leaving clears from the top down.
            float h = clamp(vYn * 0.5 + 0.5, 0.0, 1.0);
            float dn = (uDir > 0.5 ? h : 1.0 - h) * 0.9 + vxNoise(vWorld * 4.0) * 0.1;
            float front = uDissolve * 1.04;
            if (dn > front) discard;
            vxEdge = 1.0 - smoothstep(0.0, 0.018, front - dn);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0, 0.93, 0.80), vxEdge);
          }`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          `#include <roughnessmap_fragment>
          roughnessFactor = mix(mix(0.5, 0.2, uPolish), 0.95, vRough);
          roughnessFactor = mix(roughnessFactor, 0.22, vxSeam);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3(1.0, 0.82, 0.55) * vxEdge * 1.6;
          totalEmissiveRadiance += vec3(0.85, 0.62, 0.30) * vxSeam * 0.55;`,
        )
        .replace(
          '#include <metalnessmap_fragment>',
          `#include <metalnessmap_fragment>
          metalnessFactor = mix(metalnessFactor, 0.85, vxSeam);`,
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
  // One at a time: the old figure sweeps away, then the next builds up.
  david: (p) => 1 - smooth(5.72, 5.97, p) + smooth(9.03, 9.28, p),
  stoic: (p) => smooth(6.03, 6.28, p) * (1 - smooth(6.72, 6.97, p)),
  samurai: (p) => smooth(7.03, 7.28, p) * (1 - smooth(7.72, 7.97, p)),
  scholar: (p) => smooth(8.03, 8.28, p) * (1 - smooth(8.72, 8.97, p)),
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
    uniforms.uDissolve.value = pres
    // Forming (presence rising) or leaving.
    uniforms.uDir.value = PRESENCE[id](now.p + 0.01) > PRESENCE[id](now.p) ? 1 : 0
    if (holder.current) {
      holder.current.position.x = 0
      holder.current.visible = pres > 0.001
    }
    // Dust rises while a statue turns to dust or forms.
    if (pres > 0.02 && pres < 0.98) sculpt.activity = Math.max(sculpt.activity, 0.75)
    // A shadow only once it is whole (a dissolving shape would cast a solid one).
    model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = pres > 0.999
    })
    uniforms.uMinY.value = 0
    uniforms.uMaxY.value = H
    // Kept promises: the seams sit around these marks.
    if (carved && holder.current) {
      const era = Math.round(30 * Math.min(1, Math.max(0, (now.p - 4.05) / 0.8)))
      const lit = Math.min(markPoints.length, Math.max(promises.made, era))
      uniforms.uLit.value = lit
      markPoints.forEach((pt, i) => {
        const w = uniforms.uMarks.value[i]
        w.copy(pt)
        holder.current!.localToWorld(w)
      })
      const k = Math.max(0, promises.made - 1)
      if (markPoints[k]) {
        nextMark.p.copy(uniforms.uMarks.value[k])
        nextMark.ready = true
      }
    }
  })
  const markPoints = useMemo(() => {
    if (!carved) return [] as THREE.Vector3[]
    // Points on the front of the figure, chest to knees, spread evenly.
    model.updateWorldMatrix(true, true)
    const out: THREE.Vector3[] = []
    const v = new THREE.Vector3()
    const n = new THREE.Vector3()
    const nm = new THREE.Matrix3()
    model.traverse((o) => {
      const me = o as THREE.Mesh
      if (!me.isMesh) return
      const pos = me.geometry.getAttribute('position')
      const nor = me.geometry.getAttribute('normal')
      nm.getNormalMatrix(me.matrixWorld)
      const cand: THREE.Vector3[] = []
      for (let i = 0; i < pos.count; i += 37) {
        v.fromBufferAttribute(pos, i).applyMatrix4(me.matrixWorld)
        n.fromBufferAttribute(nor, i).applyMatrix3(nm).normalize()
        const p = v.clone().multiplyScalar(fit.k).add(fit.offset)
        if (n.z > 0.55 && p.y > H * 0.22 && p.y < H * 0.82) cand.push(p.add(n.multiplyScalar(0.012)))
      }
      // Thirty, spread out: greedy farthest-point picks.
      if (cand.length) out.push(cand[0])
      while (out.length < 30 && cand.length) {
        let best = cand[0], bestD = -1
        for (const c of cand) {
          let dmin = Infinity
          for (const q of out) dmin = Math.min(dmin, c.distanceToSquared(q))
          if (dmin > bestD) {
            bestD = dmin
            best = c
          }
        }
        out.push(best)
      }
    })
    return out
  }, [carved, model, fit])
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
    if (promises.strikeRequested && nextMark.ready) {
      promises.strikeRequested = false
      for (let b = 0; b < 26; b++) {
        const c = parts[next.current++ % N]
        c.p.copy(nextMark.p)
        c.v.set((Math.random() - 0.5) * 2.6, 0.8 + Math.random() * 1.8, 0.6 + Math.random() * 1.6)
        c.spin.set(Math.random() * 9, Math.random() * 9, Math.random() * 9)
        c.life = 1
      }
      sculpt.activity = Math.min(1, sculpt.activity + 0.6)
    }
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

// ---- Promise marks -------------------------------------------------------------
// A gold point of light where the chisel struck for each promise made. In
// "Every day leaves a mark" the thirty marks of an era light up one by one.
/** World position of the mark the next strike lands on (for the chips). */
const nextMark = { p: new THREE.Vector3(), ready: false }


// A soft warm pool of light on the plinth, like a gallery downlight.
function LightPool() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,236,210,0.55)')
    g.addColorStop(0.5, 'rgba(255,226,190,0.16)')
    g.addColorStop(1, 'rgba(255,220,180,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -0.235, 0]}>
      <planeGeometry args={[7, 7]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}

// ---- Relics: the app's achievement coins, turning in the air in Chapter V.
const RELICS = ['/achievements/era_first_promise.jpg', '/achievements/era_first_kept.jpg', '/achievements/era_complete.jpg']
function Relic({ url, i }: { url: string; i: number }) {
  const tex = useTexture(url)
  tex.colorSpace = THREE.SRGBColorSpace
  const g = useRef<THREE.Group>(null)
  const mats = useMemo(() => {
    const edge = new THREE.MeshPhysicalMaterial({ color: '#b9bcc4', metalness: 1, roughness: 0.32, clearcoat: 0.4 })
    const face = new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.55, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 })
    return [edge, face, face]
  }, [tex])
  const narrowView = useThree((st) => st.size.width / Math.max(1, st.size.height) < 0.85)
  useFrame(({ clock }) => {
    if (!g.current) return
    const show = smooth(5.05, 5.35, now.p) * (1 - smooth(5.75, 5.95, now.p))
    const t = clock.elapsedTime
    const a = t * 0.35 + (i * Math.PI * 2) / 3
    g.current.visible = show > 0.01
    g.current.position.set(Math.sin(a) * (narrowView ? 0.75 : 1.35), 1.1 + i * 0.75 + Math.sin(t * 0.8 + i) * 0.06, Math.cos(a) * 1.0 + 0.3)
    g.current.rotation.set(Math.PI / 2, 0, t * 0.9 + i)
    g.current.scale.setScalar(show)
  })
  return (
    <group ref={g} visible={false}>
      <mesh material={mats} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.045, 64]} />
      </mesh>
    </group>
  )
}
function Relics() {
  return (
    <>
      {RELICS.map((u, i) => (
        <Relic key={u} url={u} i={i} />
      ))}
    </>
  )
}

// ---- The app, in a phone floating beside the statue (AppForAll's phone):
// titanium frame, black glass, the Dynamic Island, and the chapter's app
// screen drawn onto the glass (phoneScreens.ts).
const PW = 1.04, PH = 2.16, PD = 0.1, PR = 0.17
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
  const width = useThree((st) => st.size.width)
  const screenGeo = useMemo(() => roundedRectGeometry(PW - 0.1, PH - 0.1, PR - 0.06), [])
  const glassGeo = useMemo(() => roundedRectGeometry(PW - 0.03, PH - 0.03, PR - 0.015), [])
  // One texture per screen, drawn once (after the fonts load).
  const textures = useMemo(() => {
    const out: Partial<Record<Section, THREE.CanvasTexture>> = {}
    for (const sec of SCREENS) {
      const c = document.createElement('canvas')
      c.width = SCREEN_W
      c.height = SCREEN_H
      drawScreen(c, sec)
      const t = new THREE.CanvasTexture(c)
      t.colorSpace = THREE.SRGBColorSpace
      t.anisotropy = 8
      out[sec] = t
      document.fonts?.ready.then(() => {
        drawScreen(c, sec)
        t.needsUpdate = true
      })
    }
    return out
  }, [])
  // Never blank: starts on the first screen.
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ toneMapped: false, map: textures.potential ?? null }), [textures])
  const shown = useRef(0)
  const last = useRef<Section | null>(null)
  useFrame(({ clock }, dt) => {
    const sec = SECTIONS[Math.min(SECTIONS.length - 1, Math.max(0, Math.floor(sculpt.p)))]
    const has = SCREENS.includes(sec)
    if (has && last.current !== sec) {
      last.current = sec
      screenMat.map = textures[sec] ?? null
      screenMat.needsUpdate = true
    }
    const want = has && width >= 1100 ? 1 : 0
    shown.current = THREE.MathUtils.damp(shown.current, want, want ? 4 : 7, Math.min(dt, 0.05))
    if (!g.current) return
    const t = clock.elapsedTime
    const k = shown.current
    g.current.visible = k > 0.01
    g.current.position.set(2.55, 1.6 + Math.sin(t * 0.7) * 0.05 - (1 - k) * 0.4, 1.0)
    g.current.rotation.set(-0.03 + sculpt.pointer.y * 0.04, -0.36 + Math.sin(t * 0.3) * 0.04 + sculpt.pointer.x * 0.07, 0.015)
    g.current.scale.setScalar(0.95 * (0.88 + 0.12 * k))
  })
  return (
    <group ref={g} visible={false}>
      {/* Its own soft light, so the titanium and glass read. */}
      <pointLight position={[-0.6, 0.8, 2.2]} intensity={5} distance={5} color="#fff6ec" />
      <RoundedBox args={[PW, PH, PD]} radius={PR} smoothness={10}>
        <meshPhysicalMaterial color="#c9c6d3" metalness={0.85} roughness={0.25} clearcoat={0.7} clearcoatRoughness={0.15} envMapIntensity={1.2} />
      </RoundedBox>
      <mesh geometry={glassGeo} position={[0, 0, PD / 2 + 0.002]}>
        <meshPhysicalMaterial color="#030306" roughness={0.04} metalness={0.3} clearcoat={1} clearcoatRoughness={0.02} />
      </mesh>
      <mesh geometry={screenGeo} material={screenMat} position={[0, 0, PD / 2 + 0.004]} />
      <RoundedBox args={[0.27, 0.075, 0.004]} radius={0.035} smoothness={4} position={[0, PH / 2 - 0.13, PD / 2 + 0.007]}>
        <meshBasicMaterial color="#000000" />
      </RoundedBox>
      <mesh geometry={glassGeo} position={[0, 0, PD / 2 + 0.006]}>
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.05} roughness={0.02} clearcoat={1} depthWrite={false} />
      </mesh>
      {[0.48, 0.28].map((y) => (
        <RoundedBox key={y} args={[0.02, 0.14, 0.05]} radius={0.008} position={[-PW / 2 - 0.006, y, 0]}>
          <meshStandardMaterial color="#c9c6d6" metalness={1} roughness={0.25} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.02, 0.24, 0.05]} radius={0.008} position={[PW / 2 + 0.006, 0.35, 0]}>
        <meshStandardMaterial color="#c9c6d6" metalness={1} roughness={0.25} />
      </RoundedBox>
    </group>
  )
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
  final: [0.0, 1.6, 0.5],
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
    // Wide screens: the statue fills the middle of the screen, the message
    // sits beside it. Narrow: the statue sits above the caption.
    const wide = size.width >= 1024 && aspect > 1.15
    // Phones: the statue fills the screen; the message floats over it.
    const tall = !wide && aspect < 0.85
    const dist = wide ? 8.2 : tall ? 8.1 + (aspect - 0.46) * 4 : 10.6 * (1 + 0.32 * narrow)
    const t = clock.elapsedTime
    // Phones hold the camera still; wider screens drift a little.
    const ang = tall ? 0 : Math.sin(t * 0.12) * 0.05 + sculpt.pointer.x * 0.03
    camera.position.set(Math.sin(ang) * dist, tall ? 1.4 : 1.4 + Math.sin(t * 0.17) * 0.06 + sculpt.pointer.y * 0.06, Math.cos(ang) * dist)
    camera.lookAt(0, wide ? 1.45 : tall ? 1.72 : 1.6 - narrow * 0.15, 0)
    // Shift the picture up so the statue lives above the caption.
    const cam = camera as THREE.PerspectiveCamera
    const lift = wide || tall ? 0 : Math.round(size.height * 0.17)
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

    </>
  )
}

// ---- Turn it, and carve it by hand -------------------------------------------------
// Drag to turn the statue. Press and hold (without dragging) to carve the
// stage the page is on: dust rises and that part of the stone clears.
function Turntable({ children }: { children: React.ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const gl = useThree((s) => s.gl)
  const size = useThree((s) => s.size)
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
    // Phones: the statue always faces forward (a swipe pages, it never turns it).
    const tall = size.width < 1024 && size.width / Math.max(1, size.height) < 0.85
    if (tall) {
      s.yaw = 0
      s.vel = 0
    }
    if (g.current) g.current.rotation.y = tall ? 0 : work.turn + s.yaw + Math.sin(clock.elapsedTime * 0.2) * 0.12
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
      dpr={[1, 2]}
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
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={4}
        shadow-camera-bottom={-1}
        shadow-bias={-0.0004}
      />
      {/* A cool rim from behind to separate the figure from the dark. */}
      <directionalLight position={[2, 4, -6]} intensity={0.9} color="#dfe6ff" />
      <WorkLight />
      <pointLight position={[0, 1.4, 3]} intensity={3} color="#fff4e6" distance={7} />
      <LightPool />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 3]} rotation-x={Math.PI / 2} scale={[8, 2, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1} position={[-5, 1, 2]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} color="#fff2e2" />
      </Environment>
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
      <Suspense fallback={null}>
        <Relics />
      </Suspense>
      <Phone3D />
    </Canvas>
  )
}

useGLTF.preload('/models/statue.glb')
GALLERY.forEach((g) => useGLTF.preload(g.url))
