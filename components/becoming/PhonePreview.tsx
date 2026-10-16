'use client'

import { useEffect, useRef } from 'react'
import { drawScreen, SCREEN_H, SCREEN_W, type DemoState } from './phoneScreens'
import type { Section } from './store'

// The Voxu screen behind each artefact, on a phone, redrawn whenever the
// visitor does something in that chapter's demo. Example data only.

// Which app screen shows each chapter.
const SCREEN: Partial<Record<Section, Section>> = {
  potential: 'potential', // Daily Eras: the era picker
  intention: 'discipline', // Reflection: tonight's check-in
  discipline: 'intention', // AI Coach: the morning promise and the coach's answer
  strength: 'strength', // Habit Builder: the record
  polish: 'polish', // Guided Audio: the listening screen
}

export function hasScreen(section: Section) {
  return section in SCREEN
}
/** The app screen drawn for a chapter. */
export function screenFor(section: Section) {
  return SCREEN[section] ?? null
}

export function PhonePreview({ section, demo, width = 230 }: { section: Section; demo: DemoState; width?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const screen = SCREEN[section]
  useEffect(() => {
    if (canvas.current && screen) drawScreen(canvas.current, screen, demo)
  }, [screen, demo])
  if (!screen) return null
  const h = (width * SCREEN_H) / SCREEN_W
  return (
    <div
      className="relative rounded-[42px] border border-white/15 bg-black p-[9px] shadow-[0_30px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)_inset]"
      style={{ width: width + 18 }}
      aria-label="Voxu app screen (example)"
      role="img"
    >
      <canvas ref={canvas} width={SCREEN_W} height={SCREEN_H} className="block rounded-[34px]" style={{ width, height: h }} />
      <div className="pointer-events-none absolute left-1/2 top-[15px] h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-black" />
    </div>
  )
}
