'use client'

import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import { ConstellationBackground } from './ConstellationBackground'
import { WaveFieldBackground } from './WaveFieldBackground'
import { GeometricMeshBackground } from './GeometricMeshBackground'
import { FirefliesBackground } from './FirefliesBackground'
import { GridTraceBackground } from './GridTraceBackground'
import { NeuralNetworkBackground } from './NeuralNetworkBackground'
import { HexGridBackground } from './HexGridBackground'
import { CircuitTraceBackground } from './CircuitTraceBackground'

export const BACKGROUND_ANIMATIONS = [
  { id: 'constellation', name: 'Constellation', description: 'Connected star nodes', component: ConstellationBackground },
  { id: 'wave', name: 'Wave Field', description: 'Flowing wave dots', component: WaveFieldBackground },
  { id: 'geometric', name: 'Geometric Mesh', description: 'Shifting geometry', component: GeometricMeshBackground },
  { id: 'fireflies', name: 'Fireflies', description: 'Glowing particles', component: FirefliesBackground },
  { id: 'grid', name: 'Grid Trace', description: 'Tracing grid lines', component: GridTraceBackground },
  { id: 'neural', name: 'Neural Network', description: 'Neural connections', component: NeuralNetworkBackground },
  { id: 'hex', name: 'Hex Grid', description: 'Hexagonal patterns', component: HexGridBackground },
  { id: 'circuit', name: 'Circuit Trace', description: 'Circuit board paths', component: CircuitTraceBackground },
] as const

export type AnimationId = (typeof BACKGROUND_ANIMATIONS)[number]['id']

const STORAGE_KEY = 'voxu_preferred_animation'
const BRIGHTNESS_KEY = 'voxu_bg_brightness'
const ENABLED_KEY = 'voxu_bg_enabled'

export function getPreferredAnimation(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEY)
}

export function setPreferredAnimation(id: string | null) {
  if (typeof window === 'undefined') return
  if (id === null) {
    localStorage.removeItem(STORAGE_KEY)
  } else {
    localStorage.setItem(STORAGE_KEY, id)
  }
  window.dispatchEvent(new Event('animation-preference-changed'))
}

export function getBackgroundBrightness(): number {
  if (typeof window === 'undefined') return 1
  const val = localStorage.getItem(BRIGHTNESS_KEY)
  return val !== null ? parseFloat(val) : 1
}

export function setBackgroundBrightness(value: number) {
  if (typeof window === 'undefined') return
  localStorage.setItem(BRIGHTNESS_KEY, String(value))
  window.dispatchEvent(new Event('bg-brightness-changed'))
}

export function getBackgroundEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const val = localStorage.getItem(ENABLED_KEY)
  return val !== null ? val === 'true' : true
}

export function setBackgroundEnabled(value: boolean) {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENABLED_KEY, String(value))
  window.dispatchEvent(new Event('bg-enabled-changed'))
}

interface DailyBackgroundProps {
  animate?: boolean
  className?: string
}

const BACKGROUNDS = BACKGROUND_ANIMATIONS.map(a => a.component)

function getDailyIndex(): number {
  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const seed = dateSeed + 333
  const x = Math.sin(seed) * 10000
  const rand = x - Math.floor(x)
  return Math.floor(rand * BACKGROUNDS.length)
}

export function DailyBackground({ animate = true, className = '' }: DailyBackgroundProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyIndex = useMemo(() => getDailyIndex(), [])
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [brightness, setBrightness] = useState(1)
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    setOverrideId(getPreferredAnimation())
    setBrightness(getBackgroundBrightness())
    setEnabled(getBackgroundEnabled())
    setMounted(true)

    const handleChange = () => setOverrideId(getPreferredAnimation())
    const handleBrightness = () => setBrightness(getBackgroundBrightness())
    const handleEnabled = () => setEnabled(getBackgroundEnabled())
    window.addEventListener('animation-preference-changed', handleChange)
    window.addEventListener('bg-brightness-changed', handleBrightness)
    window.addEventListener('bg-enabled-changed', handleEnabled)
    return () => {
      window.removeEventListener('animation-preference-changed', handleChange)
      window.removeEventListener('bg-brightness-changed', handleBrightness)
      window.removeEventListener('bg-enabled-changed', handleEnabled)
    }
  }, [])

  const Background = useMemo(() => {
    if (mounted && overrideId) {
      const found = BACKGROUND_ANIMATIONS.find(a => a.id === overrideId)
      if (found) return found.component
    }
    return BACKGROUNDS[dailyIndex]
  }, [mounted, overrideId, dailyIndex])

  const containerRef = useRef<HTMLDivElement>(null)
  const pointerRef = useRef({ x: 0, y: 0, active: false })

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    pointerRef.current.x = e.clientX - rect.left
    pointerRef.current.y = e.clientY - rect.top
    pointerRef.current.active = true
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    pointerRef.current.x = e.clientX - rect.left
    pointerRef.current.y = e.clientY - rect.top
    pointerRef.current.active = true
  }, [])

  const handlePointerLeave = useCallback(() => {
    pointerRef.current.active = false
  }, [])

  if (!enabled) return null

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      className="w-full h-full"
      style={{ touchAction: 'none', filter: `brightness(${brightness})`, backgroundColor: '#000' }}
    >
      <Background animate={animate} className={className} pointerRef={pointerRef} />
    </div>
  )
}
