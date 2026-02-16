'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Dumbbell, Compass, Sparkles, Music, Star, Orbit } from 'lucide-react'
import Link from 'next/link'
import type { MindsetId } from '@/lib/mindset/types'
import { MINDSET_CONFIGS } from '@/lib/mindset/configs'
import { AnimatedPathLogo } from '@/components/home/AnimatedPathLogo'
import { MINDSET_DETAILS } from '@/lib/mindset/detail-content'
import { ZodiacIdentityCard } from '@/components/astrology/ZodiacIdentityCard'
import { MoonPhaseWidget } from '@/components/astrology/MoonPhaseWidget'
import { TarotCardOfDay } from '@/components/astrology/TarotCardOfDay'
import { PlanetaryTransits } from '@/components/astrology/PlanetaryTransits'
import { ZodiacAffirmations } from '@/components/astrology/ZodiacAffirmations'
import { CompatibilitySnapshot } from '@/components/astrology/CompatibilitySnapshot'
import { CosmicInsightCard } from '@/components/daily-guide/CosmicInsightCard'

const WordAnimationPlayer = dynamic(
  () => import('@/components/player/WordAnimationPlayer').then(mod => mod.WordAnimationPlayer),
  { ssr: false }
)
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
import { ScholarExercise } from './exercises/ScholarExercise'

type M = MindsetId

const PATH_TITLES: Record<M, string> = {
  stoic: 'Stoic Path',
  existentialist: 'The Existentialist',
  cynic: "Cynic's Way",
  hedonist: 'Garden of Epicurus',
  samurai: 'Way of the Warrior',
  scholar: 'The Depth Path',
}

const MINDSET_NOUNS: Record<M, string> = {
  stoic: 'Stoic',
  existentialist: 'Seeker',
  cynic: 'Cynic',
  hedonist: 'Epicurean',
  samurai: 'Warrior',
  scholar: 'Scholar',
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
    case 'scholar': return <ScholarExercise onPathActivity={onPathActivity} />
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

// ── Cosmic soundscapes (Scholar only) ──

const COSMIC_SOUNDS = [
  { id: 'cosmic', word: 'Cosmic', icon: Music, color: 'from-indigo-500/[0.08] to-purple-500/[0.04]', youtubeId: 'Os5L24RamnM' },
  { id: 'astral', word: 'Astral', icon: Orbit, color: 'from-indigo-500/[0.08] to-purple-500/[0.04]', youtubeId: 'oKTj0bfn0oc' },
  { id: 'starlight', word: 'Starlight', icon: Star, color: 'from-indigo-500/[0.08] to-purple-500/[0.04]', youtubeId: '5dhxKwr6G5c' },
]

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
  const [zodiacSign, setZodiacSign] = useState<string | null>(null)
  const [playingSound, setPlayingSound] = useState<typeof COSMIC_SOUNDS[0] | null>(null)

  const greeting = useMemo(() => getTimeGreeting(mindsetId), [mindsetId])
  const isScholar = mindsetId === 'scholar'

  // Fetch streak from path status
  useEffect(() => {
    fetch('/api/path/status')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.streak) setStreak(data.streak)
      })
      .catch(() => {})
  }, [pathRefreshKey])

  // Fetch zodiac sign for Scholar
  useEffect(() => {
    if (!isScholar) return
    fetch('/api/daily-guide/preferences', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.zodiac_sign) setZodiacSign(data.zodiac_sign)
      })
      .catch(() => {})
  }, [isScholar])

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

  const cosmicTabs = [
    { id: 'zodiac', label: 'Zodiac' },
    { id: 'insight', label: 'Insight' },
    { id: 'tarot', label: 'Tarot' },
    { id: 'moon', label: 'Moon' },
    { id: 'transits', label: 'Transits' },
    { id: 'sounds', label: 'Sounds' },
  ]

  const exploreTabs = [
    { id: 'compass', label: 'Compass' },
    { id: 'desk', label: "Master's Desk" },
    { id: 'principles', label: 'Principles' },
    { id: 'sounds', label: 'Sounds' },
  ]

  return (
    <PullToRefresh mindsetId={mindsetId} onRefresh={handlePullRefresh}>
      {/* Cosmic Sound Player overlay */}
      {playingSound && (
        <WordAnimationPlayer
          word={playingSound.word}
          script=""
          color={playingSound.color}
          youtubeId={playingSound.youtubeId}
          showConstellation
          onClose={() => setPlayingSound(null)}
        />
      )}

      <div className="min-h-screen text-white px-5 pt-10 pb-4">
        {/* ── Hero: scene background, no card ── */}
        <div className="mb-5 animate-fade-in-down relative overflow-hidden rounded-2xl">
          <div className="absolute inset-0">
            <PathScene mindsetId={mindsetId} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/35 to-black/65" />
          <div className="relative z-10 px-5 pt-7 pb-6">
            <div className="flex items-center gap-3">
              <AnimatedPathLogo mindsetId={mindsetId} size={40} />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-white">{title}</h1>
                  <StreakFlame streak={streak} />
                </div>
              </div>
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

        {/* ── Scholar: Cosmic Guide (replaces Daily Wisdom) ── */}
        {isScholar ? (
          <ScrollReveal variant="scale-up">
            <div className="mb-3">
              <TabbedSection
                title="Cosmic Guide"
                icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
                tabs={cosmicTabs}
              >
                {(tab) => (
                  <>
                    {tab === 'zodiac' && (
                      <div className="space-y-3">
                        <ZodiacIdentityCard zodiacSign={zodiacSign} />
                        <CompatibilitySnapshot zodiacSign={zodiacSign} />
                      </div>
                    )}
                    {tab === 'insight' && (
                      zodiacSign ? (
                        <CosmicInsightCard
                          isCompleted={false}
                          zodiacSign={zodiacSign}
                          onComplete={() => {}}
                          variant="cosmic"
                        />
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-white/60 mb-2">Set your zodiac sign for cosmic insights</p>
                          <Link href="/settings" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            Go to Settings →
                          </Link>
                        </div>
                      )
                    )}
                    {tab === 'tarot' && (
                      zodiacSign ? (
                        <TarotCardOfDay zodiacSign={zodiacSign} />
                      ) : (
                        <div className="text-center py-6">
                          <p className="text-sm text-white/60 mb-2">Set your zodiac sign for tarot readings</p>
                          <Link href="/settings" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                            Go to Settings →
                          </Link>
                        </div>
                      )
                    )}
                    {tab === 'moon' && <MoonPhaseWidget />}
                    {tab === 'transits' && (
                      zodiacSign ? (
                        <div className="space-y-3">
                          <PlanetaryTransits zodiacSign={zodiacSign} />
                          <ZodiacAffirmations zodiacSign={zodiacSign} />
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <ZodiacAffirmations zodiacSign={null} />
                          <div className="text-center py-3">
                            <p className="text-sm text-white/60 mb-2">Set your zodiac sign for planetary transits</p>
                            <Link href="/settings" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                              Go to Settings →
                            </Link>
                          </div>
                        </div>
                      )
                    )}
                    {tab === 'sounds' && (
                      <div className="flex justify-evenly py-2">
                        {COSMIC_SOUNDS.map((sound) => {
                          const Icon = sound.icon
                          return (
                            <button
                              key={sound.id}
                              aria-label={`Play ${sound.word} soundscape`}
                              onClick={() => setPlayingSound(sound)}
                              className="flex flex-col items-center gap-2 press-scale"
                            >
                              <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 card-cosmic-round">
                                <Icon className="w-5 h-5 text-indigo-300" strokeWidth={1.5} />
                              </div>
                              <span className="text-[11px] text-white/95">{sound.word}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </TabbedSection>
            </div>
          </ScrollReveal>
        ) : (
          /* ── Non-Scholar: Daily Wisdom ── */
          <>
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
          </>
        )}

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
