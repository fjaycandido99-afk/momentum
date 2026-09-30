'use client'

import { PHASE_SCENES } from '@/lib/home/scenes'
import { sceneFor, type PhaseScene } from '@/lib/home/time-of-day'
import { useDayPhase } from '@/hooks/useDayPhase'
import { SceneBackdrop } from './SceneBackdrop'

/** Home's sky for the hour (sunrise, sunset, night); null until mounted. */
export function useDayScene(): PhaseScene | null {
  const phase = useDayPhase()
  return phase ? sceneFor(phase, PHASE_SCENES) : null
}

/**
 * The same photograph Home stands on, following the clock — so Journal,
 * Progress and Right now sit under the sky Home does. Drop it first inside a
 * positioned `voxu-scene` root, like Home's.
 */
export function DayBackdrop({ opacity }: { opacity?: number } = {}) {
  const scene = useDayScene()
  if (!scene) return null
  return <SceneBackdrop key={scene.tall} src={scene.tall} wideSrc={scene.wide} opacity={opacity} />
}
