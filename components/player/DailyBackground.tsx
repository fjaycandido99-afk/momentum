'use client'

import { useMemo, useCallback, useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const ConstellationBackground = dynamic(() => import('./ConstellationBackground').then(m => m.ConstellationBackground), { ssr: false })
const WaveFieldBackground = dynamic(() => import('./WaveFieldBackground').then(m => m.WaveFieldBackground), { ssr: false })
const GeometricMeshBackground = dynamic(() => import('./GeometricMeshBackground').then(m => m.GeometricMeshBackground), { ssr: false })
const FirefliesBackground = dynamic(() => import('./FirefliesBackground').then(m => m.FirefliesBackground), { ssr: false })
const GridTraceBackground = dynamic(() => import('./GridTraceBackground').then(m => m.GridTraceBackground), { ssr: false })
const NeuralNetworkBackground = dynamic(() => import('./NeuralNetworkBackground').then(m => m.NeuralNetworkBackground), { ssr: false })
const HexGridBackground = dynamic(() => import('./HexGridBackground').then(m => m.HexGridBackground), { ssr: false })
const CircuitTraceBackground = dynamic(() => import('./CircuitTraceBackground').then(m => m.CircuitTraceBackground), { ssr: false })
const NebulaBackground = dynamic(() => import('./NebulaBackground').then(m => m.NebulaBackground), { ssr: false })
const AstralVortexBackground = dynamic(() => import('./AstralVortexBackground').then(m => m.AstralVortexBackground), { ssr: false })
const ShootingStarsBackground = dynamic(() => import('./ShootingStarsBackground').then(m => m.ShootingStarsBackground), { ssr: false })
const FallingSandBackground = dynamic(() => import('./FallingSandBackground').then(m => m.FallingSandBackground), { ssr: false })
const StoneRipplesBackground = dynamic(() => import('./StoneRipplesBackground').then(m => m.StoneRipplesBackground), { ssr: false })
const EmbersBackground = dynamic(() => import('./EmbersBackground').then(m => m.EmbersBackground), { ssr: false })
const FracturesBackground = dynamic(() => import('./FracturesBackground').then(m => m.FracturesBackground), { ssr: false })
const FallingPetalsBackground = dynamic(() => import('./FallingPetalsBackground').then(m => m.FallingPetalsBackground), { ssr: false })
const WaterDropsBackground = dynamic(() => import('./WaterDropsBackground').then(m => m.WaterDropsBackground), { ssr: false })
const CherryBlossomsBackground = dynamic(() => import('./CherryBlossomsBackground').then(m => m.CherryBlossomsBackground), { ssr: false })
const InkWashBackground = dynamic(() => import('./InkWashBackground').then(m => m.InkWashBackground), { ssr: false })
const LightningBackground = dynamic(() => import('./LightningBackground').then(m => m.LightningBackground), { ssr: false })
const ErosionBackground = dynamic(() => import('./ErosionBackground').then(m => m.ErosionBackground), { ssr: false })
const CigarSmokeBackground = dynamic(() => import('./CigarSmokeBackground').then(m => m.CigarSmokeBackground), { ssr: false })
const SparksBackground = dynamic(() => import('./SparksBackground').then(m => m.SparksBackground), { ssr: false })
const HourglassBackground = dynamic(() => import('./HourglassBackground').then(m => m.HourglassBackground), { ssr: false })
const ColumnsBackground = dynamic(() => import('./ColumnsBackground').then(m => m.ColumnsBackground), { ssr: false })
const MarbleVeinsBackground = dynamic(() => import('./MarbleVeinsBackground').then(m => m.MarbleVeinsBackground), { ssr: false })
const FallingLeavesBackground = dynamic(() => import('./FallingLeavesBackground').then(m => m.FallingLeavesBackground), { ssr: false })
const PendulumBackground = dynamic(() => import('./PendulumBackground').then(m => m.PendulumBackground), { ssr: false })
const NewtonsCradleBackground = dynamic(() => import('./NewtonsCradleBackground').then(m => m.NewtonsCradleBackground), { ssr: false })
const VoidBackground = dynamic(() => import('./VoidBackground').then(m => m.VoidBackground), { ssr: false })
const DissolutionBackground = dynamic(() => import('./DissolutionBackground').then(m => m.DissolutionBackground), { ssr: false })
const BubblesBackground = dynamic(() => import('./BubblesBackground').then(m => m.BubblesBackground), { ssr: false })
const CandleFlamesBackground = dynamic(() => import('./CandleFlamesBackground').then(m => m.CandleFlamesBackground), { ssr: false })
const DandelionSeedsBackground = dynamic(() => import('./DandelionSeedsBackground').then(m => m.DandelionSeedsBackground), { ssr: false })
const KatanaSlashBackground = dynamic(() => import('./KatanaSlashBackground').then(m => m.KatanaSlashBackground), { ssr: false })
const BambooForestBackground = dynamic(() => import('./BambooForestBackground').then(m => m.BambooForestBackground), { ssr: false })
const ZenGardenBackground = dynamic(() => import('./ZenGardenBackground').then(m => m.ZenGardenBackground), { ssr: false })
const IncenseSmokeBackground = dynamic(() => import('./IncenseSmokeBackground').then(m => m.IncenseSmokeBackground), { ssr: false })
const KatanaSwordBackground = dynamic(() => import('./KatanaSwordBackground').then(m => m.KatanaSwordBackground), { ssr: false })
const SamuraiHelmetBackground = dynamic(() => import('./SamuraiHelmetBackground').then(m => m.SamuraiHelmetBackground), { ssr: false })
const FourSeasonsBackground = dynamic(() => import('./FourSeasonsBackground').then(m => m.FourSeasonsBackground), { ssr: false })

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

  if (!enabled || !mounted) return null

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
