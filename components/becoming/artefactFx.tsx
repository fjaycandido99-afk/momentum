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
//   Guided Audio (phones)  sound leaves the ear cups as soft rings, as loud as it is
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

const ease = (t: number) => {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** Drive the brain: a promise sends light up the veins; a faint shimmer while it is open. */
export function useBrainFx(fx: Fx | null, open: () => boolean) {
  const last = useRef(0)
  useFrame(({ clock }, dt) => {
    if (!fx) return
    const u = fx.uniforms
    u.uTime.value = clock.elapsedTime
    u.uIdle.value = THREE.MathUtils.damp(u.uIdle.value, open() ? 1 : 0, 2, dt)
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

/** Sound leaving the ear cups as soft rings, as loud as the sound is. */
export function SoundRings({ h, w }: { h: number; w: number }) {
  const N = 10
  const rings = useMemo(() => Array.from({ length: N }, () => ({ t: 99, side: 1 })), [])
  const geo = useMemo(() => new THREE.RingGeometry(0.955, 1, 96), [])
  const mats = useMemo(
    () =>
      Array.from(
        { length: N },
        () => new THREE.MeshBasicMaterial({ color: '#e9c88d', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
      ),
    [],
  )
  const refs = useRef<(THREE.Mesh | null)[]>([])
  const st = useRef({ next: 0, side: 1 })
  const camera = useThree((s) => s.camera)
  const wp = useMemo(() => new THREE.Vector3(), [])
  // The ear cups: at the sides of the band, a little below its middle.
  const cupY = h * 0.5
  const cupX = w * 0.36
  const cupR = h * 0.17
  useFrame(({ clock }, dt) => {
    const level = sculpt.audio
    const t = clock.elapsedTime
    if (level > 0.04 && t > st.current.next) {
      const r = rings.find((x) => x.t > 1.8)
      if (r) {
        r.t = 0
        r.side = st.current.side
        st.current.side *= -1
      }
      // Louder sound, closer rings.
      st.current.next = t + 0.55 - level * 0.3
    }
    rings.forEach((r, i) => {
      const m = refs.current[i]
      if (!m) return
      r.t += dt
      const k = r.t / 1.8
      m.visible = k < 1
      if (!m.visible) return
      const e = 1 - Math.pow(1 - k, 2)
      // Leaving the cup outward, always turned to the viewer so it reads as a ring.
      m.position.set(r.side * (cupX + e * h * 0.22), cupY, 0)
      m.scale.setScalar(cupR * (0.6 + e * 1.25))
      m.getWorldPosition(wp)
      m.lookAt(camera.position)
      mats[i].opacity = 0.55 * Math.pow(1 - k, 1.7) * Math.min(1, 0.5 + level)
    })
  })
  return (
    <>
      {rings.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m
          }}
          geometry={geo}
          material={mats[i]}
          visible={false}
        />
      ))}
    </>
  )
}
