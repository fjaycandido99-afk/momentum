import * as THREE from 'three'

// The climb's stone and water, made in code: no downloads, the same on every
// visit. The rock is chiselled (faceted, flat-shaded) dark stone with a few
// thin gold veins; the water is a ripple normal map that slowly drifts.

/** Smooth-ish lumpiness from a few sines: the same input always gives the same bump, so shared edges stay closed. */
const lump = (a: number, y: number) => 0.09 * Math.sin(a * 5 + y * 7) + 0.06 * Math.sin(a * 11 - y * 13) + 0.04 * Math.sin(a * 23 + y * 3)

let rockTex: THREE.CanvasTexture | null = null
/** Dark stone: mottled, cracked, with a few thin gold veins. Tiles across. */
export function rockTexture() {
  if (rockTex) return rockTex
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const x = c.getContext('2d')!
  x.fillStyle = '#141210'
  x.fillRect(0, 0, 512, 512)
  // Mottling: many soft light and dark patches.
  for (let i = 0; i < 1800; i++) {
    const r = 2 + Math.random() * 14
    const l = Math.random() < 0.5 ? 0 : 60
    x.fillStyle = `rgba(${l + 20},${l + 18},${l + 16},${0.04 + Math.random() * 0.08})`
    x.beginPath()
    x.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2)
    x.fill()
  }
  const walk = (color: string, width: number, steps: number) => {
    x.strokeStyle = color
    x.lineWidth = width
    x.beginPath()
    let px = Math.random() * 512
    let py = Math.random() * 512
    x.moveTo(px, py)
    for (let k = 0; k < steps; k++) {
      px += (Math.random() - 0.5) * 40
      py += (Math.random() - 0.3) * 30
      x.lineTo(px, py)
    }
    x.stroke()
  }
  // Cracks, then a few gold veins.
  for (let i = 0; i < 50; i++) walk(`rgba(0,0,0,${0.3 + Math.random() * 0.4})`, 0.6 + Math.random(), 6)
  for (let i = 0; i < 9; i++) walk(`rgba(214,172,98,${0.45 + Math.random() * 0.35})`, 0.7 + Math.random() * 0.8, 8)
  rockTex = new THREE.CanvasTexture(c)
  rockTex.colorSpace = THREE.SRGBColorSpace
  rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping
  rockTex.anisotropy = 8
  return rockTex
}

/**
 * A standing stone: a rough-cut slab one unit each way, centred. Straight
 * faces with shallow vertical grooves (as if split along the grain), tapering
 * a little toward a top broken off at an angle.
 */
export function monolithGeometry(seed: number) {
  const g = new THREE.BoxGeometry(1, 1, 1, 6, 16, 4)
  const p = g.attributes.position
  for (let i = 0; i < p.count; i++) {
    const vx = p.getX(i)
    const vy = p.getY(i)
    const vz = p.getZ(i)
    // Grooves run up the faces; a slight wave along the height keeps it from looking machined.
    const groove = 0.06 * Math.sin(vx * 17 + seed * 3) + 0.05 * Math.sin(vz * 13 + seed) + 0.03 * Math.sin(vy * 5 + seed)
    const taper = 1 - (vy + 0.5) * 0.18
    const k = (1 + groove) * taper
    // The top is broken off at an angle, unevenly.
    const top = vy > 0.45 ? (vx + Math.sin(seed) * 0.4) * 0.22 + Math.sin(vz * 11 + seed) * 0.04 : 0
    p.setXYZ(i, vx * k, vy + top, vz * k)
  }
  g.computeVertexNormals()
  return g
}

let rippleTex: THREE.CanvasTexture | null = null
/** Gentle ripples (a normal map that tiles): they wobble the water's reflection. */
export function rippleNormals() {
  if (rippleTex) return rippleTex
  const N = 256
  const h = new Float32Array(N * N)
  const waves = Array.from({ length: 7 }, () => ({ kx: Math.round((Math.random() - 0.5) * 8), ky: Math.round(1 + Math.random() * 6), ph: Math.random() * 6, amp: 0.5 + Math.random() }))
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      let v = 0
      // Whole numbers of waves across, so it tiles.
      for (const w of waves) v += w.amp * Math.sin(((w.kx * x + w.ky * y) / N) * Math.PI * 2 + w.ph)
      h[y * N + x] = v
    }
  const c = document.createElement('canvas')
  c.width = c.height = N
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(N, N)
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = h[y * N + ((x + 1) % N)] - h[y * N + ((x - 1 + N) % N)]
      const dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x]
      const n = new THREE.Vector3(-dx * 0.6, -dy * 0.6, 1).normalize()
      const o = (y * N + x) * 4
      img.data[o] = (n.x * 0.5 + 0.5) * 255
      img.data[o + 1] = (n.y * 0.5 + 0.5) * 255
      img.data[o + 2] = (n.z * 0.5 + 0.5) * 255
      img.data[o + 3] = 255
    }
  ctx.putImageData(img, 0, 0)
  rippleTex = new THREE.CanvasTexture(c)
  rippleTex.wrapS = rippleTex.wrapT = THREE.RepeatWrapping
  rippleTex.repeat.set(34, 34)
  return rippleTex
}
