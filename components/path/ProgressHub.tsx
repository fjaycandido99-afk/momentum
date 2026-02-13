'use client'

import { useState, useEffect } from 'react'
import { Flame, Star, Trophy, Award, Milestone } from 'lucide-react'
import { RANK_TABLES, PATH_ACCENT_COLORS } from '@/lib/path-journey'
import { ACHIEVEMENTS, RARITY_COLORS, RARITY_BG } from '@/lib/achievements'
import type { MindsetId } from '@/lib/mindset/types'

type M = Exclude<MindsetId, 'scholar'>

// ── Data types ──

interface WeeklyData {
  activeDays: number
  totalActivities: number
  currentStreak: number
  longestStreak: number
  topActivity: string | null
  weekData: { date: string; active: boolean; count: number }[]
}

interface EvolutionStage {
  emoji: string
  name: string
  description: string
  minDays: number
}

// ── Static content ──

const EVOLUTION_STAGES: Record<M, EvolutionStage[]> = {
  stoic: [
    { emoji: '🪨', name: 'Rough Stone', description: 'Raw material.', minDays: 0 },
    { emoji: '🗿', name: 'Carved Form', description: 'A shape emerges.', minDays: 3 },
    { emoji: '🏛️', name: 'Standing Column', description: 'You bear weight now.', minDays: 7 },
    { emoji: '⚔️', name: 'Philosopher King', description: 'Wisdom and power in balance.', minDays: 14 },
    { emoji: '👑', name: 'Marble Immortal', description: 'Virtue outlasts empires.', minDays: 30 },
  ],
  existentialist: [
    { emoji: '✨', name: 'Single Star', description: 'A spark in the dark.', minDays: 0 },
    { emoji: '🌟', name: 'Scattered Stars', description: 'Points of meaning appear.', minDays: 3 },
    { emoji: '⭐', name: 'Connected Pattern', description: 'Your constellation takes shape.', minDays: 7 },
    { emoji: '🌌', name: 'Galaxy', description: 'A spiral of purpose.', minDays: 14 },
    { emoji: '💫', name: 'Supernova', description: 'Your light creates new stars.', minDays: 30 },
  ],
  cynic: [
    { emoji: '💨', name: 'Spark', description: 'The question is asked.', minDays: 0 },
    { emoji: '🕯️', name: 'Candle', description: 'You see through one illusion.', minDays: 3 },
    { emoji: '🔥', name: 'Bonfire', description: 'Convention burns.', minDays: 7 },
    { emoji: '☄️', name: 'Inferno', description: 'Nothing false survives.', minDays: 14 },
    { emoji: '🌋', name: 'Eternal Flame', description: 'A beacon for miles.', minDays: 30 },
  ],
  hedonist: [
    { emoji: '🌱', name: 'Seed', description: 'Potential sleeps.', minDays: 0 },
    { emoji: '🌿', name: 'Sprout', description: 'Green shoots push through.', minDays: 3 },
    { emoji: '🌸', name: 'Flowering', description: 'Beauty unfolds.', minDays: 7 },
    { emoji: '🌳', name: 'Orchard', description: 'Abundance and shade.', minDays: 14 },
    { emoji: '🏝️', name: 'Paradise Garden', description: 'Epicurus would rejoice.', minDays: 30 },
  ],
  samurai: [
    { emoji: '⛏️', name: 'Raw Ore', description: 'Unrefined metal.', minDays: 0 },
    { emoji: '🔨', name: 'Forged Steel', description: 'The blade takes shape.', minDays: 3 },
    { emoji: '🗡️', name: 'Shaped Blade', description: 'Edge and form align.', minDays: 7 },
    { emoji: '⚔️', name: 'Polished Katana', description: 'Mirror-bright and sharp.', minDays: 14 },
    { emoji: '🏆', name: 'Legendary Blade', description: 'Spoken of in stories.', minDays: 30 },
  ],
}

const BAR_COLORS: Record<M, string> = {
  stoic: 'bg-slate-400/40',
  existentialist: 'bg-violet-400/40',
  cynic: 'bg-orange-400/40',
  hedonist: 'bg-emerald-400/40',
  samurai: 'bg-red-400/40',
}

const ACTIVITY_LABELS: Record<string, string> = {
  reflection: 'Reflection',
  exercise: 'Exercise',
  quote: 'Quote',
  soundscape: 'Soundscape',
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const PATH_ACHIEVEMENT_IDS = ['path_first', 'path_7', 'path_21', 'path_streak_7', 'path_streak_30', 'virtue_tracker']
const pathAchievements = ACHIEVEMENTS.filter(a => PATH_ACHIEVEMENT_IDS.includes(a.id))

type Tab = 'evolution' | 'weekly' | 'ranks' | 'badges'

// ── Component ──

interface ProgressHubProps {
  mindsetId: M
  totalDays?: number
}

export function ProgressHub({ mindsetId, totalDays: totalDaysProp }: ProgressHubProps) {
  const [tab, setTab] = useState<Tab>('evolution')
  const [streak, setStreak] = useState(0)
  const [totalDays, setTotalDays] = useState(totalDaysProp ?? 0)
  const [weekly, setWeekly] = useState<WeeklyData | null>(null)
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/path/status').then(r => r.ok ? r.json() : null),
      fetch('/api/path/weekly-review').then(r => r.ok ? r.json() : null),
      fetch('/api/gamification/status').then(r => r.ok ? r.json() : { achievements: [] }),
    ]).then(([status, weeklyData, gamification]) => {
      if (status?.streak !== undefined) setStreak(status.streak)
      if (status?.totalDays !== undefined) setTotalDays(status.totalDays)
      if (weeklyData) setWeekly(weeklyData)
      const ids = new Set<string>(
        (gamification?.achievements || [])
          .filter((a: { unlocked: boolean }) => a.unlocked)
          .map((a: { id: string }) => a.id)
      )
      setUnlockedIds(ids)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const tabs: { id: Tab; label: string }[] = [
    { id: 'evolution', label: 'Evolution' },
    { id: 'weekly', label: 'Weekly' },
    { id: 'ranks', label: 'Ranks' },
    { id: 'badges', label: 'Badges' },
  ]

  if (loading) {
    return (
      <div className="card-path p-5 animate-pulse">
        <div className="h-6 w-full rounded bg-white/[0.07] mb-4" />
        <div className="h-32 w-full rounded bg-white/[0.07]" />
      </div>
    )
  }

  return (
    <div className="card-path p-5">
      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 text-[11px] rounded-lg transition-all press-scale ${
              tab === t.id
                ? 'bg-white/12 text-white/90 font-medium'
                : 'text-white/35 hover:text-white/55'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="animate-fade-in" key={tab}>
        {tab === 'evolution' && <EvolutionTab mindsetId={mindsetId} streak={streak} />}
        {tab === 'weekly' && <WeeklyTab data={weekly} mindsetId={mindsetId} />}
        {tab === 'ranks' && <RanksTab mindsetId={mindsetId} totalDays={totalDays} />}
        {tab === 'badges' && <BadgesTab unlockedIds={unlockedIds} />}
      </div>
    </div>
  )
}

// ── Evolution Tab ──

function EvolutionTab({ mindsetId, streak }: { mindsetId: M; streak: number }) {
  const stages = EVOLUTION_STAGES[mindsetId]
  const barColor = BAR_COLORS[mindsetId]
  let currentStage = 0
  for (let i = 0; i < stages.length; i++) {
    if (streak >= stages[i].minDays) currentStage = i
  }
  const stage = stages[currentStage]
  const nextStage = stages[currentStage + 1]
  const progressToNext = nextStage
    ? Math.min(1, (streak - stage.minDays) / (nextStage.minDays - stage.minDays))
    : 1

  return (
    <>
      {/* Current stage */}
      <div className="flex items-center gap-4 mb-4">
        <span className={`text-4xl ${currentStage >= 4 ? 'animate-[evolve-glow_3s_ease-in-out_infinite]' : ''}`}>
          {stage.emoji}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{stage.name}</p>
            <span className="text-[10px] text-white/40">{streak}d streak</span>
          </div>
          <p className="text-xs text-white/50 mt-0.5">{stage.description}</p>
          {nextStage && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[9px] text-white/35 mb-1">
                <span>Next: {nextStage.name}</span>
                <span>{nextStage.minDays - streak}d</span>
              </div>
              <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${progressToNext * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stage row */}
      <div className="flex items-center justify-between gap-1 pt-2 border-t border-white/[0.06]">
        {stages.map((s, i) => (
          <div key={i} className="flex flex-col items-center flex-1">
            <span className={`text-base transition-all ${i <= currentStage ? '' : 'grayscale opacity-20'} ${i === currentStage ? 'scale-110' : ''}`}>
              {s.emoji}
            </span>
            <span className={`text-[8px] mt-0.5 ${i <= currentStage ? 'text-white/40' : 'text-white/15'}`}>{s.minDays}d</span>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Weekly Tab ──

function WeeklyTab({ data, mindsetId }: { data: WeeklyData | null; mindsetId: M }) {
  if (!data) return <p className="text-xs text-white/40 text-center py-4">No data yet</p>
  const barColor = BAR_COLORS[mindsetId]

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="text-center">
          <div className="text-lg font-semibold text-white">{data.activeDays}<span className="text-xs text-white/50">/7</span></div>
          <div className="text-[9px] text-white/50 uppercase tracking-wider">Active</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Flame className="w-3 h-3 text-orange-400" />
            <span className="text-lg font-semibold text-white">{data.currentStreak}</span>
          </div>
          <div className="text-[9px] text-white/50 uppercase tracking-wider">Streak</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-semibold text-white">{data.totalActivities}</div>
          <div className="text-[9px] text-white/50 uppercase tracking-wider">Done</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end justify-between gap-1.5 h-14 mb-2">
        {data.weekData.map((day, i) => {
          const height = day.count > 0 ? Math.max(20, (day.count / 4) * 100) : 8
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-0.5">
              <div className={`w-full rounded-sm transition-all ${day.active ? barColor : 'bg-white/[0.06]'}`} style={{ height: `${height}%` }} />
              <span className="text-[8px] text-white/35">{DAY_LABELS[i]}</span>
            </div>
          )
        })}
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-[10px] text-white/35">
        {data.topActivity && (
          <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5 text-amber-400/60" />{ACTIVITY_LABELS[data.topActivity] || data.topActivity}</span>
        )}
        <span className="flex items-center gap-1"><Trophy className="w-2.5 h-2.5" />Best: {data.longestStreak}d</span>
      </div>
    </>
  )
}

// ── Ranks Tab ──

function RanksTab({ mindsetId, totalDays }: { mindsetId: M; totalDays: number }) {
  const ranks = RANK_TABLES[mindsetId]
  const accentColor = PATH_ACCENT_COLORS[mindsetId]

  let currentRankIndex = 0
  for (let i = 0; i < ranks.length; i++) {
    if (totalDays >= ranks[i].minDays) currentRankIndex = i
    else break
  }

  return (
    <div className="relative pl-5">
      <div className="absolute left-[7px] top-1 bottom-1 w-px bg-white/10" />
      {ranks.map((rank, i) => {
        const isAchieved = i <= currentRankIndex
        const isCurrent = i === currentRankIndex
        const isNext = i === currentRankIndex + 1
        const daysNeeded = rank.minDays - totalDays
        return (
          <div key={rank.title} className="relative flex items-start gap-2.5 mb-3 last:mb-0">
            <div className={`absolute -left-5 top-0.5 w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center ${
              isCurrent ? 'border-white/60 bg-white/20' : isAchieved ? 'border-white/30 bg-white/10' : 'border-white/10 bg-white/[0.05]'
            }`}>
              {isAchieved && (
                <svg className="w-2 h-2 text-white/70" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="flex-1 flex items-center justify-between">
              <span className={`text-xs font-medium ${isCurrent ? accentColor : isAchieved ? 'text-white/70' : 'text-white/30'}`}>{rank.title}</span>
              <span className={`text-[9px] ${isAchieved ? 'text-white/50' : 'text-white/25'}`}>
                {rank.minDays === 0 ? 'Start' : `${rank.minDays}d`}
                {isNext && daysNeeded > 0 && ` · ${daysNeeded} to go`}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Badges Tab ──

function BadgesTab({ unlockedIds }: { unlockedIds: Set<string> }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const count = pathAchievements.filter(a => unlockedIds.has(a.id)).length

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-white/40 flex items-center gap-1">
          <Award className="w-3 h-3" /> {count}/{pathAchievements.length} unlocked
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {pathAchievements.map(a => {
          const unlocked = unlockedIds.has(a.id)
          const isExpanded = expanded === a.id
          return (
            <button
              key={a.id}
              onClick={() => unlocked && setExpanded(isExpanded ? null : a.id)}
              className={`relative flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all ${
                unlocked ? `${RARITY_BG[a.rarity]} ${RARITY_COLORS[a.rarity]} press-scale` : 'bg-white/[0.03] border-white/10 opacity-40'
              }`}
            >
              <span className={`text-lg ${unlocked ? '' : 'grayscale'}`}>{unlocked ? a.icon : '?'}</span>
              <span className={`text-[9px] text-center leading-tight ${unlocked ? 'text-white/70' : 'text-white/25'}`}>
                {unlocked ? a.title : '???'}
              </span>
              {isExpanded && (
                <div className="absolute -bottom-1 left-0 right-0 translate-y-full z-10 bg-black/90 border border-white/10 rounded-lg p-2 text-[9px] text-white/50 text-center">
                  {a.description}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </>
  )
}
