'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Dumbbell, Compass } from 'lucide-react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { PathScene } from './PathScene'
import { ScrollReveal } from './ScrollReveal'
import { StreakFlame } from './StreakFlame'
import { PullToRefresh } from './PullToRefresh'
import { PathJourneyCard } from './PathJourneyCard'
import { DailyInsightCard } from './DailyInsightCard'
import { DailyParableCard } from './DailyParableCard'
import { DailyQuoteCard } from './DailyQuoteCard'
import { GuidedVisualizationCard } from './GuidedVisualizationCard'
import { CorePrinciplesCard } from './CorePrinciplesCard'
import { DecisionFrameworkCard } from './DecisionFrameworkCard'
import { DailyReflectionCard } from './DailyReflectionCard'
import { DailyRitualTimer } from './DailyRitualTimer'
import { PhilosophyCompass } from './PhilosophyCompass'
import { MastersDesk } from './MastersDesk'
import { PathSoundscapes } from './PathSoundscapes'
import { VirtueTrackerCard } from './VirtueTrackerCard'
import { StoicControlExercise } from './exercises/StoicControlExercise'
import { ExistentialistChoiceExercise } from './exercises/ExistentialistChoiceExercise'
import { CynicChallengeExercise } from './exercises/CynicChallengeExercise'
import { HedonistPleasureExercise } from './exercises/HedonistPleasureExercise'
import { SamuraiTrainingExercise } from './exercises/SamuraiTrainingExercise'

type M = Exclude<MindsetId, 'scholar'>

const PATH_TITLES: Record<M, string> = {
  stoic: 'Stoic Path',
  existentialist: 'The Existentialist',
  cynic: "Cynic's Way",
  hedonist: 'Garden of Epicurus',
  samurai: 'Way of the Warrior',
}

const MINDSET_NOUNS: Record<M, string> = {
  stoic: 'Stoic',
  existentialist: 'Seeker',
  cynic: 'Cynic',
  hedonist: 'Epicurean',
  samurai: 'Warrior',
}

function getTimeGreeting(mindsetId: M): string {
  const hour = new Date().getHours()
  const noun = MINDSET_NOUNS[mindsetId]
  if (hour < 6) return `Still night, ${noun}. Rest or reflect.`
  if (hour < 12) return `Good morning, ${noun}`
  if (hour < 17) return `Good afternoon, ${noun}`
  if (hour < 21) return `Good evening, ${noun}`
  return `Late hours, ${noun}. Wind down.`
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10" />
      <span className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-medium">{title}</span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10" />
    </div>
  )
}

function MindsetExercise({ mindsetId, onPathActivity }: { mindsetId: M; onPathActivity?: () => void }) {
  switch (mindsetId) {
    case 'stoic': return <StoicControlExercise onPathActivity={onPathActivity} />
    case 'existentialist': return <ExistentialistChoiceExercise onPathActivity={onPathActivity} />
    case 'cynic': return <CynicChallengeExercise onPathActivity={onPathActivity} />
    case 'hedonist': return <HedonistPleasureExercise onPathActivity={onPathActivity} />
    case 'samurai': return <SamuraiTrainingExercise onPathActivity={onPathActivity} />
  }
}

// ── Tabbed section wrapper ──

function TabbedSection({ tabs, children, title, icon }: {
  tabs: { id: string; label: string }[]
  children: (activeTab: string) => React.ReactNode
  title: string
  icon: React.ReactNode
}) {
  const [active, setActive] = useState(tabs[0].id)

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2.5 mb-4">
        {icon}
        <h3 className="text-sm font-medium text-white">{title}</h3>
      </div>

      <div className="flex gap-1 mb-3 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`flex-1 min-w-0 py-1.5 text-[11px] rounded-lg transition-all press-scale whitespace-nowrap px-1 ${
              active === t.id
                ? 'bg-white/12 text-white font-medium'
                : 'text-white/60 hover:text-white/80'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div key={active} className="animate-fade-in card-path-flat">
        {children(active)}
      </div>
    </div>
  )
}

// ── Main ──

interface PathPageProps {
  mindsetId: M
}

export function PathPage({ mindsetId }: PathPageProps) {
  const config = MINDSET_CONFIGS[mindsetId]
  const details = MINDSET_DETAILS[mindsetId]
  const title = PATH_TITLES[mindsetId]
  const [pathRefreshKey, setPathRefreshKey] = useState(0)
  const [streak, setStreak] = useState(0)

  const greeting = useMemo(() => getTimeGreeting(mindsetId), [mindsetId])

  // Fetch streak from path status
  useEffect(() => {
    fetch('/api/path/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.streak) setStreak(data.streak)
      })
      .catch(() => {})
  }, [pathRefreshKey])

  const handlePathActivity = useCallback(() => {
    setTimeout(() => setPathRefreshKey(k => k + 1), 500)
  }, [])

  const handlePullRefresh = useCallback(async () => {
    setPathRefreshKey(k => k + 1)
    // Brief delay to let cards re-fetch
    await new Promise(r => setTimeout(r, 800))
  }, [])

  const practiceTabs = [
    { id: 'ritual', label: 'Ritual' },
    { id: 'reflect', label: 'Reflect' },
    { id: 'exercise', label: 'Exercise' },
    { id: 'visualize', label: 'Visualize' },
    { id: 'virtue', label: 'Virtue' },
    { id: 'decide', label: 'Decide' },
  ]

  const exploreTabs = [
    { id: 'compass', label: 'Compass' },
    { id: 'desk', label: "Master's Desk" },
    { id: 'principles', label: 'Principles' },
    { id: 'sounds', label: 'Sounds' },
  ]

  return (
    <PullToRefresh mindsetId={mindsetId} onRefresh={handlePullRefresh}>
      <div className="min-h-screen text-white px-5 pt-10 pb-4">
        {/* ── Hero: scene background, no card ── */}
        <div className="mb-5 animate-fade-in-down relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0">
            <PathScene mindsetId={mindsetId} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
          <div className="relative z-10 px-5 pt-7 pb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white">{config.icon} {title}</h1>
              <StreakFlame streak={streak} />
            </div>
            <p className="text-white/80 text-[13px] mt-1">{greeting}</p>
            <p className="text-[12px] text-white/70 leading-relaxed mt-3">{details.overview}</p>
          </div>
        </div>

        {/* ── Today's Journey ── */}
        <ScrollReveal variant="fade-up">
          <div className="mb-4">
            <PathJourneyCard mindsetId={mindsetId} refreshKey={pathRefreshKey} />
          </div>
        </ScrollReveal>

        {/* ── Daily Wisdom ── */}
        <ScrollReveal variant="fade-up">
          <SectionHeader title="Daily Wisdom" />
        </ScrollReveal>

        <div className="space-y-3 mb-1">
          <ScrollReveal variant="slide-left" delay={0.05}>
            <DailyInsightCard mindsetId={mindsetId} />
          </ScrollReveal>

          <ScrollReveal variant="slide-right" delay={0.1}>
            <DailyQuoteCard mindsetId={mindsetId} onPathActivity={handlePathActivity} />
          </ScrollReveal>

          <ScrollReveal variant="scale-up" delay={0.05}>
            <DailyParableCard mindsetId={mindsetId} />
          </ScrollReveal>
        </div>

        {/* ── Practice (tabbed) ── */}
        <ScrollReveal variant="slide-right">
          <div className="mt-5 mb-3">
            <TabbedSection
              title="Practice"
              icon={<Dumbbell className="w-4 h-4 text-white/70" />}
              tabs={practiceTabs}
            >
              {(tab) => (
                <>
                  {tab === 'ritual' && <DailyRitualTimer mindsetId={mindsetId} />}
                  {tab === 'reflect' && <DailyReflectionCard mindsetId={mindsetId} onPathActivity={handlePathActivity} />}
                  {tab === 'exercise' && <MindsetExercise mindsetId={mindsetId} onPathActivity={handlePathActivity} />}
                  {tab === 'visualize' && <GuidedVisualizationCard mindsetId={mindsetId} />}
                  {tab === 'virtue' && <VirtueTrackerCard mindsetId={mindsetId} />}
                  {tab === 'decide' && <DecisionFrameworkCard mindsetId={mindsetId} />}
                </>
              )}
            </TabbedSection>
          </div>
        </ScrollReveal>

        {/* ── Explore (tabbed) ── */}
        <ScrollReveal variant="slide-left">
          <div className="mb-3">
            <TabbedSection
              title="Explore"
              icon={<Compass className="w-4 h-4 text-white/70" />}
              tabs={exploreTabs}
            >
              {(tab) => (
                <>
                  {tab === 'compass' && <PhilosophyCompass mindsetId={mindsetId} />}
                  {tab === 'desk' && <MastersDesk mindsetId={mindsetId} />}
                  {tab === 'principles' && <CorePrinciplesCard mindsetId={mindsetId} />}
                  {tab === 'sounds' && <PathSoundscapes mindsetId={mindsetId} onPathActivity={handlePathActivity} />}
                </>
              )}
            </TabbedSection>
          </div>
        </ScrollReveal>

        {/* Bottom spacing for nav */}
        <div className="h-28" />
      </div>
    </PullToRefresh>
  )
}
