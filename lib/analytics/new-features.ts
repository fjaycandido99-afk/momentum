import { MIN_PEOPLE, type Rate } from './growth'

/**
 * The founder's view of what shipped recently: the first-launch opener,
 * Voxu Guide (explain / go / talk), the Psychology lessons, experiments and
 * relic notes. Pure. Counts of PEOPLE and things only — no words anyone
 * wrote, no lesson-by-person, nothing that names a person. A step rate
 * shows only when its base has MIN_PEOPLE people (same rule as growth.ts).
 */

export interface FeatureEventRow { userId: string; feature: string; action: string; metadata: string | null }

const people = (rows: { userId: string }[]) => new Set(rows.map(r => r.userId)).size

function step(hits: number, of: number): Rate | null {
  if (of < MIN_PEOPLE) return null
  return { hits, of, rate: of ? Math.round((hits / of) * 1000) / 10 : 0 }
}

export interface OpenerFunnel {
  began: number
  answered: number
  /** Of those who answered, how many got the fallback (no AI). */
  answeredFallback: number
  startedEra: number
  firstPromise: number
  /** began → answered → era → promise, each against the step before. */
  rates: { answered: Rate | null; era: Rate | null; promise: Rate | null }
  /** Eras chosen in the opener, most first. */
  eraPicks: { key: string; people: number }[]
}

export function openerFunnel(events: FeatureEventRow[]): OpenerFunnel {
  const fl = events.filter(e => e.feature === 'first_launch')
  const began = people(fl.filter(e => e.action === 'open'))
  const answeredRows = fl.filter(e => e.action === 'use' && (e.metadata === 'replied' || e.metadata === 'replied_fallback'))
  const answered = people(answeredRows)
  const answeredFallback = people(answeredRows.filter(e => e.metadata === 'replied_fallback'))
  const eraRows = fl.filter(e => e.action === 'use' && e.metadata?.startsWith('era:'))
  const startedEra = people(eraRows)
  const firstPromise = people(fl.filter(e => e.action === 'complete'))
  const byEra = new Map<string, Set<string>>()
  for (const e of eraRows) {
    const k = e.metadata!.slice(4)
    if (!byEra.has(k)) byEra.set(k, new Set())
    byEra.get(k)!.add(e.userId)
  }
  return {
    began, answered, answeredFallback, startedEra, firstPromise,
    rates: { answered: step(answered, began), era: step(startedEra, answered), promise: step(firstPromise, startedEra) },
    eraPicks: [...byEra.entries()].map(([key, s]) => ({ key, people: s.size })).sort((a, b) => b.people - a.people),
  }
}

export interface VoiceGuideUse {
  /** People who played an "explain this" walkthrough, and how many walkthroughs. */
  explain: { people: number; plays: number }
  /** People who asked to go somewhere / take an action. */
  navigate: { people: number; asks: number; unknown: number }
  /** People who opened Talk it through. */
  talk: { people: number; opens: number }
  /** Walkthroughs by screen. */
  byScreen: { screen: string; plays: number }[]
}

export function voiceGuideUse(events: FeatureEventRow[]): VoiceGuideUse {
  const vg = events.filter(e => e.feature === 'voice_guide' && e.action === 'use')
  const isTalk = (m: string | null) => !!m?.startsWith('talk:')
  const isNav = (m: string | null) => !!m && (m.startsWith('nav:') || m === 'lighter_day' || m === 'play_guide' || m === 'unknown' || m.startsWith('lighter_day'))
  const explain = vg.filter(e => !isTalk(e.metadata) && !isNav(e.metadata))
  const nav = vg.filter(e => isNav(e.metadata))
  const talk = vg.filter(e => isTalk(e.metadata))
  const screens = new Map<string, number>()
  for (const e of explain) screens.set(e.metadata ?? '?', (screens.get(e.metadata ?? '?') ?? 0) + 1)
  return {
    explain: { people: people(explain), plays: explain.length },
    navigate: { people: people(nav), asks: nav.length, unknown: nav.filter(e => e.metadata === 'nav:unknown' || e.metadata === 'unknown').length },
    talk: { people: people(talk), opens: talk.length },
    byScreen: [...screens.entries()].map(([screen, plays]) => ({ screen, plays })).sort((a, b) => b.plays - a.plays),
  }
}

export interface LessonUse {
  libraryOpeners: number
  readers: number
  reads: number
  /** Most-read lessons by distinct readers. */
  top: { id: string; readers: number }[]
}

export function lessonUse(events: FeatureEventRow[], topN = 5): LessonUse {
  const ps = events.filter(e => e.feature === 'psychology')
  const reads = ps.filter(e => e.action === 'use' && e.metadata)
  const by = new Map<string, Set<string>>()
  for (const r of reads) {
    if (!by.has(r.metadata!)) by.set(r.metadata!, new Set())
    by.get(r.metadata!)!.add(r.userId)
  }
  return {
    libraryOpeners: people(ps.filter(e => e.action === 'open')),
    readers: people(reads),
    reads: reads.length,
    top: [...by.entries()].map(([id, s]) => ({ id, readers: s.size })).sort((a, b) => b.readers - a.readers || a.id.localeCompare(b.id)).slice(0, topN),
  }
}

export interface ExperimentUse {
  people: number
  started: number
  finished: number
  stopped: number
  running: number
  byKind: { kind: string; started: number }[]
}

export function experimentUse(rows: { userId: string; kind: string; status: string }[]): ExperimentUse {
  const kinds = new Map<string, number>()
  for (const r of rows) kinds.set(r.kind, (kinds.get(r.kind) ?? 0) + 1)
  return {
    people: people(rows),
    started: rows.length,
    finished: rows.filter(r => r.status === 'done').length,
    stopped: rows.filter(r => r.status === 'stopped').length,
    running: rows.filter(r => r.status === 'active').length,
    byKind: [...kinds.entries()].map(([kind, started]) => ({ kind, started })).sort((a, b) => b.started - a.started),
  }
}
