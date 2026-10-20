'use client'

import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import type { DemoState } from './phoneScreens'
import { sculpt } from './store'

// The artefacts answer what the visitor does, each in its own way:
//   AI Coach (brain)       a promise sends warm light up through its gold veins
//   Habit Builder (bonsai) every day kept fills the canopy out a little; new
//                          growth glints, a leaf or two drifts down; day 30 flares
// All of it is restrained on purpose: light that follows the material that is
// already there (the veins, the leaves), slow fades, nothing that pops.

const GOLD = new THREE.Color('#e9c88d')

/** Shader hooks shared by the brain and the bonsai. */
export type Fx = {
  uniforms: {
    uMinY: { value: number }
    uMaxY: { value: number }
    uTime: { value: number }
    /** Brain: the height (0..1.4) the light has climbed to. */
    uFront: { value: number }
    /** Brain: how strong the travelling light is (fades after it reaches the top). */
    uWave: { value: number }
    /** Brain: a faint shimmer in the veins while it is open. */
    uIdle: { value: number }
    /** Bonsai: how full the canopy is (0..1). */
    uGrow: { value: number }
    /** Bonsai: the canopy fullness before the latest day, so new growth can glint. */
    uGrowFrom: { value: number }
    /** Bonsai: the glint on new growth (fades). */
    uNew: { value: number }
    /** Bonsai: the era-complete flare (fades). */
    uFlare: { value: number }
    uGold: { value: THREE.Color }
  }
}

const NOISE = /* glsl */ `
  float fxHash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float fxNoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(fxHash(i + vec3(0, 0, 0)), fxHash(i + vec3(1, 0, 0)), f.x),
                   mix(fxHash(i + vec3(0, 1, 0)), fxHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(fxHash(i + vec3(0, 0, 1)), fxHash(i + vec3(1, 0, 1)), f.x),
                   mix(fxHash(i + vec3(0, 1, 1)), fxHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
`

/** Hook the artefact's materials up to its effect (brain and bonsai only). */
export function makeFx(kind: 'brain' | 'bonsai', model: THREE.Object3D, mats: THREE.MeshStandardMaterial[]): Fx {
  // Heights are measured in the meshes' own space (the shader sees the same numbers).
  let minY = Infinity
  let maxY = -Infinity
  model.traverse((o) => {
    const me = o as THREE.Mesh
    if (!me.isMesh) return
    me.geometry.computeBoundingBox()
    minY = Math.min(minY, me.geometry.boundingBox!.min.y)
    maxY = Math.max(maxY, me.geometry.boundingBox!.max.y)
  })
  const uniforms: Fx['uniforms'] = {
    uMinY: { value: minY },
    uMaxY: { value: maxY },
    uTime: { value: 0 },
    uFront: { value: -1 },
    uWave: { value: 0 },
    uIdle: { value: 0 },
    uGrow: { value: 1 },
    uGrowFrom: { value: 1 },
    uNew: { value: 0 },
    uFlare: { value: 0 },
    uGold: { value: GOLD },
  }
  const fragFx =
    kind === 'brain'
      ? /* glsl */ `
        {
          // The gold veins: where the marble turns warm.
          vec3 c = diffuseColor.rgb;
          float vein = smoothstep(0.05, 0.16, (c.r + c.g) * 0.5 - c.b) * smoothstep(0.15, 0.45, c.r);
          float h = (vFxPos.y - uMinY) / max(0.0001, uMaxY - uMinY);
          // A soft band of light climbing from the stem, a little uneven like a real current.
          float wobble = (fxNoise(vFxPos * 9.0 + uTime * 0.6) - 0.5) * 0.08;
          float band = exp(-pow((h + wobble - uFront) / 0.11, 2.0));
          float trail = smoothstep(uFront, uFront - 0.5, h) * step(h, uFront);
          float shimmer = 0.5 + 0.5 * sin(uTime * 1.4 + h * 7.0 + fxNoise(vFxPos * 5.0) * 6.0);
          float glow = vein * (uWave * (band * 2.6 + trail * 0.35) + uIdle * 0.28 * shimmer);
          totalEmissiveRadiance += uGold * glow;
        }`
      : /* glsl */ `
        {
          // New growth glints for a moment; the finished era flares softly.
          vec3 c = diffuseColor.rgb;
          float h = (vFxPos.y - uMinY) / max(0.0001, uMaxY - uMinY);
          float lum = dot(c, vec3(0.299, 0.587, 0.114));
          float leaf = smoothstep(0.56, 0.64, h) * smoothstep(0.22, 0.34, lum);
          float n = fxNoise(vFxPos * fxLeafScale);
          float fresh = leaf * smoothstep(uGrowFrom - 0.02, uGrowFrom + 0.03, n) * (1.0 - smoothstep(uGrow - 0.03, uGrow, n));
          totalEmissiveRadiance += uGold * (fresh * uNew * 1.6 + leaf * uFlare * 0.9);
        }`
  const discardFx =
    kind === 'bonsai'
      ? /* glsl */ `
        {
          // The canopy fills out with the days kept: leaves beyond today's growth aren't there yet.
          float h = (vFxPos.y - uMinY) / max(0.0001, uMaxY - uMinY);
          float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
          float leaf = smoothstep(0.56, 0.64, h) * smoothstep(0.22, 0.34, lum);
          if (leaf > 0.5 && fxNoise(vFxPos * fxLeafScale) > uGrow) discard;
        }`
      : ''
  // Leaf clusters about a twentieth of the model across.
  const leafScale = (20 / Math.max(0.0001, maxY - minY)).toFixed(3)
  for (const m of mats) {
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFxPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFxPos = position;')
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vFxPos;
          uniform float uMinY, uMaxY, uTime, uFront, uWave, uIdle, uGrow, uGrowFrom, uNew, uFlare;
          uniform vec3 uGold;
          const float fxLeafScale = ${leafScale};
          ${NOISE}`,
        )
        .replace('#include <map_fragment>', `#include <map_fragment>\n${discardFx}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${fragFx}`)
    }
    m.customProgramCacheKey = () => `fx-${kind}`
    m.needsUpdate = true
  }
  return { uniforms }
}

/**
 * The centrepiece's material: finished marble where it has been carved, rough
 * dark stone where it hasn't, a thin gold seam along the line between, and a
 * glint on what was carved last. The order things are carved in is fixed: the
 * face first, one side and the back last, so even the most it ever gets
 * (uDone 0.9) leaves some of it raw.
 */
export type CoreFx = {
  uniforms: {
    uMin: { value: THREE.Vector3 }
    uMax: { value: THREE.Vector3 }
    /** How much is carved (0..1). */
    uDone: { value: number }
    /** How much was carved before the latest piece, so it can glint. */
    uFrom: { value: number }
    /** The glint on the latest piece (fades). */
    uFresh: { value: number }
    /** Warm light inside the gold seam (rises at the reveal). */
    uLight: { value: number }
    uGold: { value: THREE.Color }
  }
}
export function makeCoreFx(model: THREE.Object3D, mats: THREE.MeshStandardMaterial[]): CoreFx {
  const min = new THREE.Vector3(Infinity, Infinity, Infinity)
  const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity)
  model.traverse((o) => {
    const me = o as THREE.Mesh
    if (!me.isMesh) return
    me.geometry.computeBoundingBox()
    min.min(me.geometry.boundingBox!.min)
    max.max(me.geometry.boundingBox!.max)
  })
  const uniforms: CoreFx['uniforms'] = {
    uMin: { value: min },
    uMax: { value: max },
    uDone: { value: 0.2 },
    uFrom: { value: 0.2 },
    uFresh: { value: 0 },
    uLight: { value: 0 },
    uGold: { value: GOLD },
  }
  // Grain about a twelfth of the model across.
  const scale = (12 / Math.max(0.0001, max.y - min.y)).toFixed(3)
  const field = /* glsl */ `
    float coreField(vec3 p) {
      vec3 q = (p - uMin) / max(uMax - uMin, vec3(0.0001));
      // Broad noise, so the raw stone is one rough-edged region rather than spots.
      float n = fxNoise(p * coreScale * 0.35) * 0.75 + fxNoise(p * coreScale * 1.4) * 0.25;
      // Carved from the front back and from one side across (the face first), never in a straight line.
      return 0.28 * n + 0.47 * q.x + 0.25 * (1.0 - q.z);
    }`
  for (const m of mats) {
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vFxPos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFxPos = position;')
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          varying vec3 vFxPos;
          uniform vec3 uMin, uMax, uGold;
          uniform float uDone, uFrom, uFresh, uLight;
          const float coreScale = ${scale};
          ${NOISE}
          ${field}`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          float coreF = coreField(vFxPos);
          float coreRaw = smoothstep(uDone - 0.012, uDone + 0.012, coreF);
          {
            // Raw stone: dark, mottled.
            float g = fxNoise(vFxPos * coreScale * 4.0);
            vec3 stone = vec3(0.17, 0.155, 0.14) * (0.65 + 0.7 * g);
            diffuseColor.rgb = mix(diffuseColor.rgb, stone, coreRaw);
          }`,
        )
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.95, coreRaw);')
        .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = mix(metalnessFactor, 0.0, coreRaw);')
        .replace(
          '#include <normal_fragment_maps>',
          `#include <normal_fragment_maps>
          // Chisel-rough where it is still stone.
          normal = normalize(normal + (vec3(fxNoise(vFxPos * coreScale * 9.0), fxNoise(vFxPos * coreScale * 9.0 + 7.1), fxNoise(vFxPos * coreScale * 9.0 + 3.3)) - 0.5) * 0.9 * coreRaw);`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
          {
            float seam = 1.0 - smoothstep(0.0, 0.012, abs(coreF - uDone));
            float fresh = step(uFrom, coreF) * step(coreF, uDone) * uFresh;
            // Kintsugi: thin gold cracks running through the finished marble, where a
            // broad noise crosses its middle; a second noise leaves stretches unbroken.
            float crackN = fxNoise(vFxPos * coreScale * 0.9) * 0.6 + fxNoise(vFxPos * coreScale * 2.2) * 0.4;
            float crack = (1.0 - smoothstep(0.0, 0.007, abs(crackN - 0.5))) * smoothstep(0.58, 0.7, fxNoise(vFxPos * coreScale * 0.5 + 11.0));
            totalEmissiveRadiance += uGold * (seam * (1.6 + 1.6 * uLight) + fresh * 0.45 + crack * (1.0 - coreRaw) * 1.4 * uLight);
          }`,
        )
    }
    m.customProgramCacheKey = () => 'fx-core'
    m.needsUpdate = true
  }
  return { uniforms }
}

const ease = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** Drive the brain: a promise sends light up the veins; the veins shimmer as much as `idle` says (0..1). */
export function useBrainFx(fx: Fx | null, idle: () => number) {
  const last = useRef(0)
  useFrame(({ clock }, dt) => {
    if (!fx) return
    const u = fx.uniforms
    u.uTime.value = clock.elapsedTime
    u.uIdle.value = THREE.MathUtils.damp(u.uIdle.value, idle(), 2, dt)
    const r = sculpt.react
    if (r.chapter === 3 && r.at !== last.current) last.current = r.at
    const since = (performance.now() - last.current) / 1000
    if (last.current && since < 4) {
      // Climbs in about two seconds, lingers, fades.
      u.uFront.value = -0.15 + 1.5 * ease(since / 2.1)
      u.uWave.value = since < 2.2 ? Math.min(1, since * 3) : Math.max(0, 1 - (since - 2.2) / 1.8)
    } else u.uWave.value = 0
  })
}

/** How full the canopy is for a number of days kept (the example starts at 9 of 30). */
const fullness = (kept: number) => 0.3 + 0.72 * Math.min(1, kept / 30)

/** Drive the bonsai: the canopy follows the days kept; new growth glints; day 30 flares. */
export function useBonsaiFx(fx: Fx | null, leaves: { drop: (n: number) => void } | null) {
  const st = useRef({ kept: -1, from: 1, to: 1, at: 0 })
  useFrame(({ clock }, dt) => {
    if (!fx) return
    const u = fx.uniforms
    u.uTime.value = clock.elapsedTime
    const demo = sculpt.phone.demo as DemoState | null
    const kept = demo?.kept.length ?? 9
    const s = st.current
    if (s.kept === -1) {
      s.kept = kept
      s.to = s.from = fullness(kept)
      u.uGrow.value = u.uGrowFrom.value = s.to
    }
    if (kept !== s.kept) {
      const grew = kept > s.kept
      s.from = u.uGrow.value
      s.to = fullness(kept)
      s.kept = kept
      s.at = clock.elapsedTime
      u.uGrowFrom.value = s.from
      if (grew) leaves?.drop(kept >= 30 ? 22 : 2)
      if (kept >= 30) u.uFlare.value = 1
    }
    // Growth eases in over a second and a half, the glint lingers a little longer.
    const since = clock.elapsedTime - s.at
    u.uGrow.value = s.from + (s.to - s.from) * ease(since / 1.5)
    u.uNew.value = s.to > s.from ? Math.max(0, 1 - Math.max(0, since - 0.3) / 2.2) : 0
    u.uFlare.value = THREE.MathUtils.damp(u.uFlare.value, 0, 0.8, dt)
  })
}

/** A few gold leaves that drift down from the canopy when a day is kept. */
export function FallingLeaves({ h, api }: { h: number; api: { current: { drop: (n: number) => void } | null } }) {
  const N = 28
  const mesh = useRef<THREE.InstancedMesh>(null)
  const leaves = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        live: false,
        t: 0,
        p: new THREE.Vector3(),
        v: new THREE.Vector3(),
        spin: new THREE.Vector3(),
        phase: 0,
      })),
    [],
  )
  const geo = useMemo(() => {
    // A small leaf: a pointed oval, two-sided.
    const sh = new THREE.Shape()
    sh.moveTo(0, -0.5)
    sh.quadraticCurveTo(0.45, 0, 0, 0.5)
    sh.quadraticCurveTo(-0.45, 0, 0, -0.5)
    return new THREE.ShapeGeometry(sh, 6)
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#d9b25f', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide, transparent: true }), [])
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const sc = useMemo(() => new THREE.Vector3(), [])
  api.current = {
    drop: (n: number) => {
      let spawned = 0
      for (const l of leaves) {
        if (spawned >= n) break
        if (l.live) continue
        const a = Math.random() * Math.PI * 2
        const r = Math.random() * h * 0.3
        l.p.set(Math.cos(a) * r, h * (0.72 + Math.random() * 0.2), Math.sin(a) * r)
        l.v.set((Math.random() - 0.5) * 0.08, 0, (Math.random() - 0.5) * 0.08)
        l.spin.set(Math.random() * 3, Math.random() * 3, Math.random() * 3)
        l.phase = Math.random() * 6
        // Staggered, so a flurry doesn't fall as one sheet.
        l.t = -spawned * 0.12 - Math.random() * 0.2
        l.live = true
        spawned++
      }
    },
  }
  useFrame((_, dt) => {
    const im = mesh.current
    if (!im) return
    let any = false
    leaves.forEach((l, i) => {
      if (l.live) {
        l.t += dt
        if (l.t > 0) {
          // Falling slowly, swaying side to side, tumbling.
          l.p.y -= dt * h * 0.16
          l.p.x += (l.v.x + Math.sin(l.t * 2.1 + l.phase) * 0.12) * dt
          l.p.z += (l.v.z + Math.cos(l.t * 1.7 + l.phase) * 0.08) * dt
          if (l.p.y < h * 0.38 || l.t > 6) l.live = false
        }
      }
      const show = l.live && l.t > 0
      any ||= show
      e.set(l.spin.x * l.t, l.spin.y * l.t, l.spin.z * l.t)
      q.setFromEuler(e)
      sc.setScalar(show ? h * 0.035 : 0)
      m4.compose(l.p, q, sc)
      im.setMatrixAt(i, m4)
    })
    im.instanceMatrix.needsUpdate = true
    im.visible = any
  })
  return <instancedMesh ref={mesh} args={[geo, mat, N]} visible={false} />
}
