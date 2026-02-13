'use client'

import { useState, useCallback } from 'react'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { PathScene } from './PathScene'
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

const PATH_SUBTITLES: Record<M, string> = {
  stoic: 'Walk with Marcus Aurelius',
  existentialist: 'Create your own meaning',
  cynic: 'Question everything',
  hedonist: 'Savor what matters',
  samurai: 'Train your spirit daily',
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

function TabbedSection({ tabs, children }: {
  tabs: { id: string; label: string }[]
  children: (activeTab: string) => React.ReactNode
}) {
  const [active, setActive] = useState(tabs[0].id)

  return (
    <div>
      {/* Tab bar */}
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

      <div key={active} className="animate-fade-in">
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
  const subtitle = PATH_SUBTITLES[mindsetId]
  const [pathRefreshKey, setPathRefreshKey] = useState(0)

  const handlePathActivity = useCallback(() => {
    setTimeout(() => setPathRefreshKey(k => k + 1), 500)
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
    <div className="min-h-screen text-white px-5 pt-10 pb-4">
      {/* ── Hero ── */}
      <div className="mb-5 animate-fade-in-down">
        <h1 className="text-xl font-semibold text-white">{config.icon} {title}</h1>
        <p className="text-white/80 text-[13px] mt-1">{subtitle}</p>
        <p className="text-[12px] text-white/70 leading-relaxed mt-3">{details.overview}</p>
      </div>

      {/* ── Today's Journey ── */}
      <div className="mb-4 animate-fade-in" style={{ animationDelay: '0.05s' }}>
        <PathJourneyCard mindsetId={mindsetId} refreshKey={pathRefreshKey} />
      </div>

      {/* ── Daily Wisdom ── */}
      <SectionHeader title="Daily Wisdom" />

      <div className="space-y-3 mb-1">
        <div className="animate-fade-in" style={{ animationDelay: '0.08s' }}>
          <DailyInsightCard mindsetId={mindsetId} />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <DailyQuoteCard mindsetId={mindsetId} onPathActivity={handlePathActivity} />
        </div>

        <div className="animate-fade-in" style={{ animationDelay: '0.12s' }}>
          <DailyParableCard mindsetId={mindsetId} />
        </div>
      </div>

      {/* ── Practice (tabbed) ── */}
      <SectionHeader title="Practice" />

      <div className="mb-1 animate-fade-in" style={{ animationDelay: '0.14s' }}>
        <TabbedSection tabs={practiceTabs}>
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

      {/* ── Explore (tabbed) ── */}
      <SectionHeader title="Explore" />

      <div className="mb-1 animate-fade-in" style={{ animationDelay: '0.16s' }}>
        <TabbedSection tabs={exploreTabs}>
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

      {/* Bottom spacing for nav */}
      <div className="h-28" />
    </div>
  )
}
