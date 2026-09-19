import { ImageResponse } from 'next/og'
import type { EraTodayWire } from './service'
import { ERA_COMPLETE_IMAGE, programFor } from './programs'
import { eraSlug } from './share'
import { ERA_PRESETS_BY_KEY } from './presets'
import { ogFonts, typeset } from '@/lib/og-fonts'

/**
 * The era share card — Story-sized (1080×1920). Pure given the era: the API
 * route renders it for the signed-in user, and a script can render it for a
 * sample era to check the layout.
 *
 * No name and no promise text on it: it shows the era and the record, never
 * what someone privately promised.
 */
const W = 1080
const H = 1920
const SERIF = 'Cormorant'

export async function eraCardImage(era: EraTodayWire, origin: string): Promise<ImageResponse> {
  const complete = era.step === 'complete'
  const art = new URL(complete ? ERA_COMPLETE_IMAGE : programFor(era.key).image ?? '/era/custom.jpg', origin).toString()
  const byDay = new Map(era.days.map(d => [d.day, d.kept]))
  const joinable = ERA_PRESETS_BY_KEY.has(era.key)
  const title = typeset(era.title.toUpperCase())
  const titleSize = title.length > 14 ? 118 : title.length > 10 ? 138 : 158

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', background: '#000', color: '#fff', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={art} width={W} height={1320} style={{ position: 'absolute', top: 0, left: 0, width: W, height: 1320, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, width: W, height: 1340, display: 'flex', background: 'linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.35) 45%, #000 96%)' }} />

        <div style={{ position: 'absolute', top: 96, left: 84, display: 'flex', fontSize: 34, letterSpacing: 16, color: 'rgba(255,255,255,0.75)', fontFamily: SERIF, fontWeight: 500 }}>
          VOXU
        </div>

        <div style={{ position: 'absolute', left: 84, right: 84, bottom: 128, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 28, letterSpacing: 9, color: 'rgba(255,255,255,0.6)' }}>
            {complete ? 'ERA COMPLETE' : 'CURRENT ERA'}
          </div>
          <div style={{ display: 'flex', fontSize: titleSize, lineHeight: 0.92, fontFamily: SERIF, fontWeight: 600, marginTop: 18 }}>
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 42, color: 'rgba(255,255,255,0.8)', fontFamily: SERIF, fontWeight: 500, marginTop: 26 }}>
            {typeset(complete ? `${era.lengthDays} days. Finished.` : era.stage.line)}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginTop: 64, fontFamily: SERIF, fontWeight: 600 }}>
            <span style={{ fontSize: 96 }}>{`Day ${era.day}`}</span>
            <span style={{ fontSize: 60, color: 'rgba(255,255,255,0.4)', marginLeft: 16, marginBottom: 10 }}>{`/ ${era.lengthDays}`}</span>
          </div>

          {/* One segment per day, as on home: kept solid, not kept dim, no
              promise faint, days ahead empty. */}
          <div style={{ display: 'flex', marginTop: 26 }}>
            {Array.from({ length: era.lengthDays }, (_, i) => {
              const n = i + 1
              const kept = byDay.get(n)
              const bg = n > era.day ? 'rgba(255,255,255,0.08)'
                : kept === true ? '#fff'
                : kept === false ? 'rgba(255,255,255,0.35)'
                : kept === null ? 'rgba(255,255,255,0.6)'
                : 'rgba(255,255,255,0.15)'
              return <div key={n} style={{ flex: 1, height: 26, marginRight: n === era.lengthDays ? 0 : 7, borderRadius: 4, background: bg, display: 'flex' }} />
            })}
          </div>

          <div style={{ display: 'flex', fontSize: 36, color: 'rgba(255,255,255,0.8)', marginTop: 34 }}>
            {[
              era.stats.keptPercent !== null ? `${era.stats.keptPercent}% of promises kept` : null,
              era.stats.promiseStreak > 1 ? `${era.stats.promiseStreak}-day streak` : null,
            ].filter(Boolean).join('   ·   ') || 'One promise a day'}
          </div>

          <div style={{ display: 'flex', height: 2, background: 'rgba(255,255,255,0.15)', marginTop: 64, marginBottom: 48 }} />

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: 30, letterSpacing: 6, color: 'rgba(255,255,255,0.55)' }}>
              {joinable ? 'JOIN THIS ERA' : 'START YOUR OWN ERA'}
            </span>
            <span style={{ fontSize: 44, marginTop: 12 }}>
              {joinable ? `voxu.app/join/${eraSlug(era.key)}` : 'voxu.app'}
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: await ogFonts(),
      headers: { 'Cache-Control': 'private, no-store' },
    },
  )
}

/**
 * A made-up era for previews (?sample=<key> on the card route): day 17, a
 * couple of misses, today still open. No user's data — it exists so the
 * layout can be checked on the real renderer, and for marketing images.
 */
export function sampleEra(key: string): EraTodayWire | null {
  const preset = ERA_PRESETS_BY_KEY.get(key)
  if (!preset) return null
  const days = Array.from({ length: 17 }, (_, i) => ({
    day: i + 1,
    localDay: '',
    kept: i === 4 || i === 11 ? false : i === 16 ? null : true,
  }))
  return {
    id: 'sample', key, title: preset.title, change: '', why: null, startDay: '', lengthDays: 30, day: 17,
    step: 'check', stats: { made: 17, answered: 16, kept: 14, keptPercent: 88, promiseStreak: 17 },
    checkInOpen: false, today: null, yesterday: null, promiseHint: '',
    stage: { key: 'maintaining', label: 'Maintaining', line: "You're not starting anymore. You're becoming consistent." },
    mission: null, links: { soundscapeId: 'focus', guideId: 'breathing' }, image: programFor(key).image ?? null,
    isPremium: false, memoryLockedToday: false, recap: null, alignment: null, days,
  }
}
