'use client'

import { useEffect, useRef, useCallback, type RefObject } from 'react'

// Weather cycle: Storm → Thunderstorm → Tempest → Blizzard
type Weather = 'storm' | 'thunder' | 'tempest' | 'blizzard'

const WEATHERS: Weather[] = ['storm', 'thunder', 'tempest', 'blizzard']
const CYCLE_MS = 10000
const FADE_DURATION = 1.5
const COLLISION_RES = 128
const RAIN_COUNT = 120
const SNOW_COUNT = 80

interface Drop {
  x: number
  y: number
  speed: number
  length: number
  thickness: number
  opacity: number
  drift: number
}

interface Flake {
  x: number
  y: number
  speed: number
  size: number
  opacity: number
  wobble: number
  wobbleSpeed: number
  drift: number
}

interface Bolt {
  points: { x: number; y: number }[]
  branches: { x: number; y: number }[][]
  life: number
  maxLife: number
  intensity: number
}


function makeDrops(count: number, w: number, h: number): Drop[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * (w + 60) - 30,
    y: Math.random() * h,
    speed: 6 + Math.random() * 8,
    length: 12 + Math.random() * 18,
    thickness: 0.4 + Math.random() * 0.8,
    opacity: 0.08 + Math.random() * 0.18,
    drift: Math.random() * 0.5,
  }))
}

function makeFlakes(count: number, w: number, h: number): Flake[] {
  return Array.from({ length: count }, () => ({
    x: Math.random() * (w + 60) - 30,
    y: Math.random() * h,
    speed: 0.8 + Math.random() * 1.5,
    size: 1 + Math.random() * 2.5,
    opacity: 0.15 + Math.random() * 0.35,
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: 0.01 + Math.random() * 0.03,
    drift: Math.random() * 0.3,
  }))
}

function makeBolt(w: number, h: number): Bolt {
  // Strike on far left or far right, behind samurai
  const side = Math.random() < 0.5 ? 'left' : 'right'
  const startX = side === 'left'
    ? w * 0.02 + Math.random() * w * 0.15
    : w * 0.83 + Math.random() * w * 0.15
  const startY = Math.random() * h * 0.05
  const points: { x: number; y: number }[] = [{ x: startX, y: startY }]
  let cx = startX, cy = startY
  const depth = h * 0.4 + Math.random() * h * 0.35
  const steps = 7 + Math.floor(Math.random() * 8)

  for (let i = 0; i < steps; i++) {
    cx += (Math.random() - 0.5) * 30
    cy += depth / steps + (Math.random() - 0.3) * 8
    points.push({ x: cx, y: cy })
  }

  const branches: { x: number; y: number }[][] = []
  for (let i = 2; i < points.length - 1; i++) {
    if (Math.random() < 0.4) {
      const bp = points[i]
      const branch: { x: number; y: number }[] = [{ x: bp.x, y: bp.y }]
      let bx = bp.x, by = bp.y
      const bSteps = 2 + Math.floor(Math.random() * 3)
      const dir = Math.random() < 0.5 ? -1 : 1
      for (let j = 0; j < bSteps; j++) {
        bx += dir * (5 + Math.random() * 12)
        by += 6 + Math.random() * 10
        branch.push({ x: bx, y: by })
      }
      branches.push(branch)
    }
  }

  return { points, branches, life: 1, maxLife: 1, intensity: 0.5 + Math.random() * 0.5 }
}

interface FourSeasonsBackgroundProps {
  animate?: boolean
  className?: string
  pointerRef?: RefObject<{ x: number; y: number; active: boolean }>
  topOffset?: number
}

export function FourSeasonsBackground({
  animate = true,
  className = '',
  pointerRef,
  topOffset = 0,
}: FourSeasonsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animFrameRef = useRef<number>()
  const animateRef = useRef(animate)
  const processedImgRef = useRef<HTMLCanvasElement | null>(null)
  const imgReadyRef = useRef(false)
  const alphaMapRef = useRef<Uint8Array | null>(null)
  const alphaMapWRef = useRef(0)
  const alphaMapHRef = useRef(0)

  useEffect(() => { animateRef.current = animate }, [animate])

  // Image preprocessing
  useEffect(() => {
    const img = new Image()
    img.src = '/samurai-meditation.jpg'
    img.onload = () => {
      const off = document.createElement('canvas')
      off.width = img.width
      off.height = img.height
      const octx = off.getContext('2d')
      if (!octx) return
      octx.drawImage(img, 0, 0)
      const data = octx.getImageData(0, 0, off.width, off.height)
      const d = data.data
      for (let i = 0; i < d.length; i += 4) {
        if (Math.max(d[i], d[i + 1], d[i + 2]) < 35) d[i + 3] = 0
      }
      octx.putImageData(data, 0, 0)
      processedImgRef.current = off
      imgReadyRef.current = true

      // Collision map
      const mw = COLLISION_RES
      const mh = Math.round((img.height / img.width) * COLLISION_RES)
      const mc = document.createElement('canvas')
      mc.width = mw; mc.height = mh
      const mctx = mc.getContext('2d')
      if (!mctx) return
      mctx.drawImage(off, 0, 0, mw, mh)
      const md = mctx.getImageData(0, 0, mw, mh)
      const am = new Uint8Array(mw * mh)
      for (let i = 0; i < am.length; i++) am[i] = md.data[i * 4 + 3]
      alphaMapRef.current = am
      alphaMapWRef.current = mw
      alphaMapHRef.current = mh
    }
  }, [])

  const startAnimation = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cw = 0, ch = 0
    let drops: Drop[] = []
    let flakes: Flake[] = []

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      cw = rect.width; ch = rect.height
      canvas.width = cw * dpr; canvas.height = ch * dpr
      ctx.scale(dpr, dpr)
      if (drops.length === 0) drops = makeDrops(RAIN_COUNT, cw, ch)
      if (flakes.length === 0) flakes = makeFlakes(SNOW_COUNT, cw, ch)
    }
    resize()
    window.addEventListener('resize', resize)

    let opacity = 0.2
    const t0 = performance.now()
    const bolts: Bolt[] = []
    let nextBolt = 2 + Math.random() * 3

    const onSamurai = (px: number, py: number, dx: number, dy: number, dw: number, dh: number) => {
      const m = alphaMapRef.current
      if (!m) return false
      const mw = alphaMapWRef.current, mh = alphaMapHRef.current
      const ix = Math.floor(((px - dx) / dw) * mw)
      const iy = Math.floor(((py - dy) / dh) * mh)
      if (ix < 0 || ix >= mw || iy < 0 || iy >= mh) return false
      return m[iy * mw + ix] > 25
    }

    const draw = () => {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, cw, ch)

      const target = animateRef.current ? 1 : 0.15
      opacity += (target - opacity) * 0.03

      // Weather phase
      const elapsed = (performance.now() - t0) / 1000
      const cycle = elapsed % (CYCLE_MS / 1000)
      const wi = Math.floor(elapsed / (CYCLE_MS / 1000)) % WEATHERS.length
      const weather = WEATHERS[wi]
      // Fade: ramp up at start, ramp down at end of each phase
      const fadeIn = Math.min(cycle / FADE_DURATION, 1)
      const fadeOut = Math.min(((CYCLE_MS / 1000) - cycle) / FADE_DURATION, 1)
      const fo = Math.min(fadeIn, fadeOut)
      const isBlizzard = weather === 'blizzard'
      const hasThunder = weather === 'thunder' || weather === 'tempest'
      const intensity = weather === 'tempest' ? 1.8 : weather === 'thunder' ? 1.3 : weather === 'blizzard' ? 0.5 : 1

      // Lightning flash intensity
      let flash = 0
      for (const b of bolts) {
        const freshness = b.life / b.maxLife
        if (freshness > 0.8) flash = Math.max(flash, b.intensity * (freshness - 0.8) * 5)
      }
      if (flash > 0.01) {
        ctx.fillStyle = `rgba(160, 175, 220, ${flash * opacity * 0.12})`
        ctx.fillRect(0, 0, cw, ch)
      }

      // Lightning bolts (rendered BEHIND samurai)
      if (animateRef.current && hasThunder) {
        nextBolt -= 0.016
        if (nextBolt <= 0) {
          bolts.push(makeBolt(cw, ch))
          nextBolt = weather === 'tempest' ? 0.8 + Math.random() * 2.5 : 1.5 + Math.random() * 4
        }
      }
      for (let i = bolts.length - 1; i >= 0; i--) {
        if (animateRef.current) bolts[i].life -= 0.02
        if (bolts[i].life <= 0) { bolts.splice(i, 1); continue }

        const b = bolts[i]
        const a = (b.life / b.maxLife) * b.intensity * opacity
        if (a < 0.005) continue

        ctx.save()
        // Glow layer
        ctx.strokeStyle = `rgba(140, 160, 255, ${a * 0.3})`
        ctx.lineWidth = 4
        ctx.shadowColor = `rgba(120, 140, 255, ${a * 0.4})`
        ctx.shadowBlur = 20
        ctx.beginPath()
        for (let j = 0; j < b.points.length - 1; j++) {
          ctx.moveTo(b.points[j].x, b.points[j].y)
          ctx.lineTo(b.points[j + 1].x, b.points[j + 1].y)
        }
        ctx.stroke()

        // Core bolt
        ctx.shadowBlur = 6
        ctx.strokeStyle = `rgba(200, 210, 255, ${a * 0.7})`
        ctx.lineWidth = 1.5
        ctx.beginPath()
        for (let j = 0; j < b.points.length - 1; j++) {
          ctx.moveTo(b.points[j].x, b.points[j].y)
          ctx.lineTo(b.points[j + 1].x, b.points[j + 1].y)
        }
        ctx.stroke()

        // Bright center
        ctx.shadowBlur = 0
        ctx.strokeStyle = `rgba(255, 255, 255, ${a * 0.9})`
        ctx.lineWidth = 0.6
        ctx.beginPath()
        for (let j = 0; j < b.points.length - 1; j++) {
          ctx.moveTo(b.points[j].x, b.points[j].y)
          ctx.lineTo(b.points[j + 1].x, b.points[j + 1].y)
        }
        ctx.stroke()

        // Branches
        ctx.strokeStyle = `rgba(180, 195, 255, ${a * 0.4})`
        ctx.lineWidth = 0.8
        ctx.shadowColor = `rgba(120, 140, 255, ${a * 0.2})`
        ctx.shadowBlur = 8
        for (const br of b.branches) {
          ctx.beginPath()
          for (let j = 0; j < br.length - 1; j++) {
            ctx.moveTo(br[j].x, br[j].y)
            ctx.lineTo(br[j + 1].x, br[j + 1].y)
          }
          ctx.stroke()
        }
        ctx.restore()
      }

      // Samurai image (rendered ON TOP of lightning)
      let ix = 0, iy = 0, iw = cw, ih = ch
      if (imgReadyRef.current && processedImgRef.current) {
        const img = processedImgRef.current
        const ar = img.width / img.height
        if (ar > cw / ch) { ih = ch; iw = ch * ar; ix = (cw - iw) / 2 }
        else { iw = cw; ih = cw / ar; iy = (ch - ih) / 2 }
        ctx.globalAlpha = (0.3 + flash * 0.15) * opacity
        ctx.drawImage(img, ix, iy, iw, ih)
        ctx.globalAlpha = 1
      }

      // Rain (storm, thunder, tempest)
      if (!isBlizzard) {
        if (animateRef.current) {
          for (const d of drops) {
            d.x += d.drift
            d.y += d.speed * intensity
            if (onSamurai(d.x, d.y, ix, iy, iw, ih)) {
              d.x = Math.random() * (cw + 60) - 30
              d.y = -Math.random() * 40
            }
            if (d.y > ch + 10) { d.y = -Math.random() * 30; d.x = Math.random() * (cw + 60) - 30 }
            if (d.x > cw + 30) d.x = -20
          }
        }
        for (const d of drops) {
          const a = d.opacity * opacity * fo
          if (a < 0.003) continue
          const len = d.length * (0.7 + intensity * 0.4)
          ctx.strokeStyle = `rgba(160, 180, 210, ${a})`
          ctx.lineWidth = d.thickness
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + 0.05 * len, d.y + len)
          ctx.stroke()
          if (d.thickness > 0.8) {
            ctx.fillStyle = `rgba(200, 215, 235, ${a * 0.6})`
            ctx.beginPath()
            ctx.arc(d.x, d.y, 0.5, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }

      // Snow (blizzard only)
      if (isBlizzard) {
        if (animateRef.current) {
          for (const f of flakes) {
            f.wobble += f.wobbleSpeed
            f.x += Math.sin(f.wobble) * 0.8 + f.drift
            f.y += f.speed
            if (onSamurai(f.x, f.y, ix, iy, iw, ih)) {
              f.x = Math.random() * (cw + 60) - 30
              f.y = -Math.random() * 30
            }
            if (f.y > ch + 10) { f.y = -Math.random() * 20; f.x = Math.random() * (cw + 60) - 30 }
            if (f.x > cw + 30) f.x = -20
          }
        }
        for (const f of flakes) {
          const a = f.opacity * opacity * fo
          if (a < 0.003) continue
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.size * 0.6, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(210, 220, 240, ${a * 0.8})`
          ctx.fill()
          // Motion trail
          ctx.strokeStyle = `rgba(190, 205, 225, ${a * 0.25})`
          ctx.lineWidth = f.size * 0.3
          ctx.beginPath()
          ctx.moveTo(f.x, f.y)
          ctx.lineTo(f.x - 2, f.y - f.speed * 0.8)
          ctx.stroke()
        }
      }

      animFrameRef.current = requestAnimationFrame(draw)
    }

    animFrameRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    const cleanup = startAnimation()
    return cleanup
  }, [startAnimation])

  return <canvas ref={canvasRef} className={`w-full h-full ${className}`} />
}
