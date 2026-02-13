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
import { NebulaBackground } from './NebulaBackground'
import { AstralVortexBackground } from './AstralVortexBackground'
import { ShootingStarsBackground } from './ShootingStarsBackground'
import { FallingSandBackground } from './FallingSandBackground'
import { StoneRipplesBackground } from './StoneRipplesBackground'
import { EmbersBackground } from './EmbersBackground'
import { FracturesBackground } from './FracturesBackground'
import { FallingPetalsBackground } from './FallingPetalsBackground'
import { WaterDropsBackground } from './WaterDropsBackground'
import { CherryBlossomsBackground } from './CherryBlossomsBackground'
import { InkWashBackground } from './InkWashBackground'
import { LightningBackground } from './LightningBackground'
import { ErosionBackground } from './ErosionBackground'
import { CigarSmokeBackground } from './CigarSmokeBackground'
import { SparksBackground } from './SparksBackground'
import { HourglassBackground } from './HourglassBackground'
import { ColumnsBackground } from './ColumnsBackground'
import { MarbleVeinsBackground } from './MarbleVeinsBackground'
import { FallingLeavesBackground } from './FallingLeavesBackground'
import { PendulumBackground } from './PendulumBackground'
import { NewtonsCradleBackground } from './NewtonsCradleBackground'
import { VoidBackground } from './VoidBackground'
import { DissolutionBackground } from './DissolutionBackground'
import { BubblesBackground } from './BubblesBackground'
import { CandleFlamesBackground } from './CandleFlamesBackground'
import { DandelionSeedsBackground } from './DandelionSeedsBackground'
import { KatanaSlashBackground } from './KatanaSlashBackground'
import { BambooForestBackground } from './BambooForestBackground'
import { ZenGardenBackground } from './ZenGardenBackground'
import { IncenseSmokeBackground } from './IncenseSmokeBackground'
import { KatanaSwordBackground } from './KatanaSwordBackground'
import { SamuraiHelmetBackground } from './SamuraiHelmetBackground'
import { FourSeasonsBackground } from './FourSeasonsBackground'

export const BACKGROUND_ANIMATIONS = [
  { id: 'constellation', name: 'Constellation', description: 'Connected star nodes', component: ConstellationBackground },
  { id: 'wave', name: 'Wave Field', description: 'Flowing wave dots', component: WaveFieldBackground },
  { id: 'geometric', name: 'Geometric Mesh', description: 'Shifting geometry', component: GeometricMeshBackground },
  { id: 'fireflies', name: 'Fireflies', description: 'Glowing particles', component: FirefliesBackground },
  { id: 'grid', name: 'Grid Trace', description: 'Tracing grid lines', component: GridTraceBackground },
  { id: 'neural', name: 'Neural Network', description: 'Neural connections', component: NeuralNetworkBackground },
  { id: 'hex', name: 'Hex Grid', description: 'Hexagonal patterns', component: HexGridBackground },
  { id: 'circuit', name: 'Circuit Trace', description: 'Circuit board paths', component: CircuitTraceBackground },
  { id: 'nebula', name: 'Nebula', description: 'Cosmic nebula clouds', component: NebulaBackground },
  { id: 'vortex', name: 'Astral Vortex', description: 'Swirling astral energy', component: AstralVortexBackground },
  { id: 'shooting-stars', name: 'Shooting Stars', description: 'Meteor shower sky', component: ShootingStarsBackground },
  { id: 'falling-sand', name: 'Falling Sand', description: 'Hourglass sand particles', component: FallingSandBackground },
  { id: 'stone-ripples', name: 'Stone Ripples', description: 'Expanding concentric circles', component: StoneRipplesBackground },
  { id: 'embers', name: 'Rising Embers', description: 'Glowing rising particles', component: EmbersBackground },
  { id: 'cracks', name: 'Fractures', description: 'Spreading crack lines', component: FracturesBackground },
  { id: 'petals', name: 'Falling Petals', description: 'Drifting petal shapes', component: FallingPetalsBackground },
  { id: 'water-drops', name: 'Water Drops', description: 'Ripple ring drops', component: WaterDropsBackground },
  { id: 'cherry-blossoms', name: 'Cherry Blossoms', description: 'Sakura with wind gusts', component: CherryBlossomsBackground },
  { id: 'ink-wash', name: 'Ink Wash', description: 'Sumi-e brush strokes', component: InkWashBackground },
  { id: 'lightning', name: 'Lightning', description: 'Jagged bolt strikes', component: LightningBackground },
  { id: 'erosion', name: 'Erosion', description: 'Shapes breaking apart', component: ErosionBackground },
  { id: 'cigar-smoke', name: 'Cigar Smoke', description: 'Rising smoke wisps', component: CigarSmokeBackground },
  { id: 'sparks', name: 'Sparks', description: 'Scattering spark bursts', component: SparksBackground },
  { id: 'hourglass', name: 'Hourglass', description: 'Sand flowing through time', component: HourglassBackground },
  { id: 'columns', name: 'Columns', description: 'Rising classical pillars', component: ColumnsBackground },
  { id: 'marble-veins', name: 'Marble Veins', description: 'Tracing stone patterns', component: MarbleVeinsBackground },
  { id: 'falling-leaves', name: 'Falling Leaves', description: 'Drifting single leaves', component: FallingLeavesBackground },
  { id: 'pendulum', name: 'Pendulum', description: 'Swinging steady rhythm', component: PendulumBackground },
  { id: 'newtons-cradle', name: "Newton's Cradle", description: 'Momentum transfer physics toy', component: NewtonsCradleBackground },
  { id: 'void', name: 'Void', description: 'Particles pulled into nothingness', component: VoidBackground },
  { id: 'dissolution', name: 'Dissolution', description: 'Shapes forming and crumbling', component: DissolutionBackground },
  { id: 'bubbles', name: 'Bubbles', description: 'Rising translucent bubbles', component: BubblesBackground },
  { id: 'candle-flames', name: 'Candle Flames', description: 'Flickering gentle flames', component: CandleFlamesBackground },
  { id: 'dandelion-seeds', name: 'Dandelion Seeds', description: 'Floating wispy seeds', component: DandelionSeedsBackground },
  { id: 'katana-slash', name: 'Katana Slash', description: 'Swift blade strikes', component: KatanaSlashBackground },
  { id: 'bamboo-forest', name: 'Bamboo Forest', description: 'Swaying bamboo stalks', component: BambooForestBackground },
  { id: 'zen-garden', name: 'Zen Garden', description: 'Raked sand patterns', component: ZenGardenBackground },
  { id: 'incense-smoke', name: 'Incense Smoke', description: 'Rising wisps of smoke', component: IncenseSmokeBackground },
  { id: 'katana-sword', name: 'Katana Sword', description: 'Floating katana blade', component: KatanaSwordBackground },
  { id: 'samurai-helmet', name: 'Samurai Helmet', description: 'Floating kabuto helmet', component: SamuraiHelmetBackground },
  { id: 'four-seasons', name: 'Storm Cycle', description: 'Rain, thunder & blizzard', component: FourSeasonsBackground },
] as const

export type AnimationId = (typeof BACKGROUND_ANIMATIONS)[number]['id']

const STORAGE_KEY = 'voxu_preferred_animation'
const BRIGHTNESS_KEY = 'voxu_bg_brightness'
const ENABLED_KEY = 'voxu_bg_enabled'
const COLOR_KEY = 'voxu_bg_color'

/** -1 = white (no tint), 0–360 = hue degrees */
export type BgColorHue = number

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

export function getBackgroundColor(): BgColorHue {
  if (typeof window === 'undefined') return -1
  const val = localStorage.getItem(COLOR_KEY)
  if (val === null) return -1
  const num = parseFloat(val)
  return isNaN(num) ? -1 : num
}

export function setBackgroundColor(value: BgColorHue) {
  if (typeof window === 'undefined') return
  localStorage.setItem(COLOR_KEY, String(value))
  window.dispatchEvent(new Event('bg-color-changed'))
}

export function getColorFilter(hue: BgColorHue): string {
  if (hue < 0) return ''
  return `sepia(1) hue-rotate(${hue}deg) saturate(2.5)`
}

interface DailyBackgroundProps {
  animate?: boolean
  className?: string
  /** If set, daily rotation only cycles through these animation IDs */
  mindsetFilter?: string[]
}

const BACKGROUNDS = BACKGROUND_ANIMATIONS.map(a => a.component)

function getDailyIndex(poolSize: number): number {
  const now = new Date()
  const dateSeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate()
  const seed = dateSeed + 333
  const x = Math.sin(seed) * 10000
  const rand = x - Math.floor(x)
  return Math.floor(rand * poolSize)
}

export function DailyBackground({ animate = true, className = '', mindsetFilter }: DailyBackgroundProps) {
  // Filter backgrounds by mindset pool if provided
  const filteredAnimations = useMemo(() => {
    if (!mindsetFilter || mindsetFilter.length === 0) return BACKGROUND_ANIMATIONS
    const filtered = BACKGROUND_ANIMATIONS.filter(a => mindsetFilter.includes(a.id))
    return filtered.length > 0 ? filtered : BACKGROUND_ANIMATIONS
  }, [mindsetFilter])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const dailyIndex = useMemo(() => getDailyIndex(filteredAnimations.length), [filteredAnimations.length])
  const [overrideId, setOverrideId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [brightness, setBrightness] = useState(1)
  const [enabled, setEnabled] = useState(true)
  const [colorTint, setColorTint] = useState<BgColorHue>(-1)

  useEffect(() => {
    setOverrideId(getPreferredAnimation())
    setBrightness(getBackgroundBrightness())
    setEnabled(getBackgroundEnabled())
    setColorTint(getBackgroundColor())
    setMounted(true)

    const handleChange = () => setOverrideId(getPreferredAnimation())
    const handleBrightness = () => setBrightness(getBackgroundBrightness())
    const handleEnabled = () => setEnabled(getBackgroundEnabled())
    const handleColor = () => setColorTint(getBackgroundColor())
    window.addEventListener('animation-preference-changed', handleChange)
    window.addEventListener('bg-brightness-changed', handleBrightness)
    window.addEventListener('bg-enabled-changed', handleEnabled)
    window.addEventListener('bg-color-changed', handleColor)
    return () => {
      window.removeEventListener('animation-preference-changed', handleChange)
      window.removeEventListener('bg-brightness-changed', handleBrightness)
      window.removeEventListener('bg-enabled-changed', handleEnabled)
      window.removeEventListener('bg-color-changed', handleColor)
    }
  }, [])

  const Background = useMemo(() => {
    if (mounted && overrideId) {
      const found = BACKGROUND_ANIMATIONS.find(a => a.id === overrideId)
      if (found) return found.component
    }
    return filteredAnimations[dailyIndex]?.component ?? BACKGROUNDS[0]
  }, [mounted, overrideId, dailyIndex, filteredAnimations])

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
      style={{
        touchAction: 'none',
        filter: (() => {
          const cf = getColorFilter(colorTint)
          return cf ? `brightness(${brightness}) ${cf}` : `brightness(${brightness})`
        })(),
        backgroundColor: '#000',
      }}
    >
      <Background animate={animate} className={className} pointerRef={pointerRef} />
    </div>
  )
}
