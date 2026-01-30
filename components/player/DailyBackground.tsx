'use client'

import { useMemo, useCallback, useRef } from 'react'
import { ConstellationBackground } from './ConstellationBackground'
import { WaveFieldBackground } from './WaveFieldBackground'
import { GeometricMeshBackground } from './GeometricMeshBackground'
import { FirefliesBackground } from './FirefliesBackground'
import { GridTraceBackground } from './GridTraceBackground'
import { NeuralNetworkBackground } from './NeuralNetworkBackground'
import { HexGridBackground } from './HexGridBackground'
import { CircuitTraceBackground } from './CircuitTraceBackground'

interface DailyBackgroundProps {
  animate?: boolean
  className?: string
}

const BACKGROUNDS = [
  ConstellationBackground,
  WaveFieldBackground,
  GeometricMeshBackground,
  FirefliesBackground,
  GridTraceBackground,
  NeuralNetworkBackground,
  HexGridBackground,
  CircuitTraceBackground,
] as const

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
  const index = useMemo(() => getDailyIndex(), [])
  const Background = BACKGROUNDS[index]

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

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerLeave}
      className="w-full h-full"
      style={{ touchAction: 'none' }}
    >
      <Background animate={animate} className={className} pointerRef={pointerRef} />
    </div>
  )
}
