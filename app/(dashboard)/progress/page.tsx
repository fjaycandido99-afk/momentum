'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { SectionTabs } from '@/components/ui/SectionTabs'
import { Loader2, Flame, Mail, BarChart3, Grid3x3 } from 'lucide-react'
import { StreakFlame } from '@/components/ui/StreakFlame'
import { StreakHeatmap } from '@/components/progress/StreakHeatmap'
import { ListeningStats } from '@/components/progress/ListeningStats'
import { ModulesCompleted } from '@/components/progress/ModulesCompleted'
import { MoodTrends } from '@/components/progress/MoodTrends'
import { XPProgress } from '@/components/progress/XPProgress'
import { AchievementGrid } from '@/components/progress/AchievementGrid'
import { RelicDetailSheet } from '@/components/relics/RelicDetailSheet'
import { AchievementCelebration } from '@/components/progress/AchievementCelebration'
import { DailyChallenges } from '@/components/progress/DailyChallenges'
import { WeeklyMissions } from '@/components/progress/WeeklyMissions'
import { SocialProofCard } from '@/components/progress/SocialProofCard'
import { UnlockableRewards } from '@/components/progress/UnlockableRewards'
import { MoodInsights } from '@/components/progress/MoodInsights'
import { WellnessScore } from '@/components/progress/WellnessScore'
import { RecordPatterns } from '@/components/progress/RecordPatterns'
import { WellnessCheckIn } from '@/components/progress/WellnessCheckIn'
import { MonthlyRetrospective } from '@/components/progress/MonthlyRetrospective'
import { MindsetEvolution } from '@/components/progress/MindsetEvolution'
import { LetterToSelf } from '@/components/progress/LetterToSelf'
import { GoalTracker } from '@/components/daily-guide/GoalTracker'
import { JourneyCard } from '@/components/progress/JourneyCard'
import { migrateLocalXP } from '@/lib/gamification'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { TierBanner } from '@/components/premium/TierBanner'

interface ProgressData {
  streak: number
  activeDays: number
  listeningMinutes: number
  categoryMinutes: Record<string, number>
  modulesCompleted: number
  moodData: { date: string; before: number | null; after: number | null }[]
  heatmap: Record<string, number>
  daysLimit: number
  moodInsights: any
}

interface GamificationData {
  xp: { total: number; today: number; week: number }
  level: { current: { level: number; title: string; minXP: number; color: string }; next: { level: number; title: string; minXP: number; color: string } | null; progress: number }
  streak: number
  achievements: any[]
  dailyChallenges: any[]
  weeklyMissions: any[]
  socialNudges: { message: string; icon: string }[]
  rewards: { unlocked: any[]; next: any | null }
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null)
  const [gamification, setGamification] = useState<GamificationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [celebratingAchievement, setCelebratingAchievement] = useState<any>(null)

  useEffect(() => {
    // Migrate localStorage XP to server (one-time)
    migrateLocalXP()

    // Fetch both endpoints in parallel
    Promise.all([
      fetch('/api/progress').then(r => r.ok ? r.json() : null),
      fetch('/api/gamification/status').then(r => r.ok ? r.json() : null),
    ])
      .then(([progressData, gamificationData]) => {
        if (progressData) setData(progressData)
        if (gamificationData) setGamification(gamificationData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // An earned coin opens the unlock popup again (Francis prefers it), now
  // with its chain; a locked one opens the detail popup — progress and chain.
  const [detailId, setDetailId] = useState<string | null>(null)
  const [viewing, setViewing] = useState(false)
  const handleAchievementClick = useCallback((achievement: any) => {
    if (achievement.unlocked) { setViewing(true); setCelebratingAchievement(achievement) }
    else setDetailId(achievement.id)
  }, [])

  return (
    <div className="h-[100dvh] overflow-y-auto overscroll-contain text-white pb-24"
      data-app-shell
    >
      {/* App-shell scroll: this container scrolls, the document does not.
      iOS rubber-bands the document past its ends and the whole visual
      viewport moves with it, carrying any sticky/fixed header along.
      Scrolling a container with overscroll-contain removes the bounce,
      so the header actually holds still. */}
      <div className="sticky top-0 z-50 px-6 safe-area-pt pb-4 mb-4 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        {/* Same centered column as You, its tab partner — on iPad the page
            used to stretch the phone layout edge to edge. */}
        <div className="max-w-md md:max-w-lg mx-auto">
        <SectionTabs section="you" className="mb-3" />
        <h1 className="text-2xl font-semibold shimmer-text">Progress</h1>
        <FeatureHint id="progress-intro" text="Your streaks, listening time & journal stats at a glance" mode="once" />
        </div>
      </div>

      <TierBanner page="progress" />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-white/70 animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="p-4 rounded-full bg-white/[0.04] mb-4">
            <BarChart3 className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/70 text-sm font-medium mb-1">No progress data yet</p>
          <p className="text-white/40 text-xs mb-6">Complete a session or journal entry to start tracking your progress</p>
          <Link href="/" className="px-5 py-2.5 rounded-xl bg-white/10 text-sm text-white font-medium hover:bg-white/15 transition-colors">
            Start your first session
          </Link>
        </div>
      ) : (
        <div className="px-6 space-y-4 max-w-md md:max-w-lg mx-auto">
          {/* Journey — the felt arc (Day N of becoming more ___), ahead of the raw numbers */}
          <JourneyCard day={gamification?.streak ?? data.streak} />

          {/* Streak + XP Row */}
          <div className="flex gap-3">
            <div className="glass-refined rounded-2xl p-4 flex items-center gap-3 flex-1 relative overflow-hidden">
              <div className="absolute -top-2 left-2">
                <StreakFlame streak={gamification?.streak ?? data.streak} size="md" />
              </div>
              <Flame className="w-6 h-6 text-white relative z-10" />
              <div className="relative z-10">
                <p className="text-2xl font-bold text-white">{gamification?.streak ?? data.streak}</p>
                <p className="text-xs text-white/70">day streak</p>
              </div>
            </div>
            {gamification && (
              <div className="glass-refined rounded-2xl p-4 flex items-center gap-3 flex-1">
                <div className="text-lg">⚡</div>
                <div>
                  <p className="text-2xl font-bold text-white">{gamification.xp.today}</p>
                  <p className="text-xs text-white/70">XP today</p>
                </div>
              </div>
            )}
          </div>

          {/* Milestone Banner — shown at streak milestones */}
          {(() => {
            const streak = gamification?.streak ?? data.streak
            const milestones = [7, 14, 21, 30, 50, 75, 100]
            const hitMilestone = milestones.includes(streak)
            if (!hitMilestone) return null
            return (
              <button
                onClick={() => {
                  document.getElementById('letter-to-self')?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="w-full p-4 rounded-2xl bg-white/[0.06] border border-white/15 flex items-center gap-3 hover:bg-white/[0.1] transition-all"
              >
                <div className="p-2 rounded-xl bg-white/10 shrink-0">
                  <Mail className="w-5 h-5 text-white/80" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-white">{streak}-day milestone!</p>
                  <p className="text-px-10 text-white/75">Read a letter from your future self</p>
                </div>
                <span className="text-xs text-white font-medium shrink-0">View</span>
              </button>
            )
          })()}

          {/* XP Level Progress */}
          <XPProgress
            totalXP={gamification?.xp.total}
            todaysXP={gamification?.xp.today}
          />

          {/* Wellness Score — surfaced early for visibility */}
          <WellnessScore />

          {/* The daily check-in, right above the patterns it feeds — so what
              it's for is visible from where it's asked. */}
          <WellnessCheckIn />

          {/* What your record shows — computed from the user's own promise and
              mood history, with the counts attached. Sits under the wellness
              score on purpose: that one is the coach's read, this one is the
              arithmetic. */}
          <RecordPatterns />

          {/* Goals — relocated here from the journal so it's actually findable */}
          <div id="goals" className="scroll-mt-24"><GoalTracker /></div>

          {/* Daily Challenges */}
          {gamification?.dailyChallenges && (
            <DailyChallenges challenges={gamification.dailyChallenges} />
          )}

          {/* Weekly Missions */}
          {gamification?.weeklyMissions && (
            <WeeklyMissions missions={gamification.weeklyMissions} />
          )}

          {/* Achievements */}
          {gamification?.achievements && (
            <AchievementGrid
              achievements={gamification.achievements}
              onAchievementClick={handleAchievementClick}
            />
          )}

          {/* Social Proof */}
          {gamification?.socialNudges && (
            <SocialProofCard nudges={gamification.socialNudges} />
          )}

          {/* Unlockable Rewards */}
          {gamification?.rewards && gamification?.level && (
            <UnlockableRewards
              unlockedRewards={gamification.rewards.unlocked}
              nextReward={gamification.rewards.next}
              currentLevel={gamification.level.current.level}
            />
          )}

          {/* Monthly Retrospective */}
          <MonthlyRetrospective />

          {/* Mindset Evolution Advisor */}
          <MindsetEvolution />

          {/* Letter to Self */}
          <LetterToSelf />

          {/* Heatmap */}
          <StreakHeatmap heatmap={data.heatmap} daysLimit={data.daysLimit} />

          {/* The other calendar, and the difference is the point: this page
              counts what the app gave you, /proof counts what you did. */}
          <Link href="/proof" className="block rounded-2xl border border-white/[0.12] p-4 hover:bg-white/[0.03]">
            <div className="flex items-center gap-1.5 text-px-10 tracking-[0.2em] uppercase text-white/50">
              <Grid3x3 className="w-3.5 h-3.5" /> Your year in proof
            </div>
            <p className="text-px-15 text-white mt-1.5 leading-snug">
              Every day you kept a promise — and what was going on that day.
            </p>
          </Link>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <ModulesCompleted count={data.modulesCompleted} activeDays={data.activeDays} />
            <ListeningStats totalMinutes={data.listeningMinutes} categoryMinutes={data.categoryMinutes} />
          </div>

          {/* Mood Insights */}
          {data?.moodInsights && (
            <MoodInsights insights={data.moodInsights} />
          )}

          {/* Legacy Mood Trends */}
          <MoodTrends moodData={data.moodData} />
        </div>
      )}

      {/* Achievement Celebration Modal */}
      {detailId && gamification?.achievements && (
        <RelicDetailSheet
          id={detailId}
          statusOf={id => gamification.achievements.find((x: { id: string }) => x.id === id)}
          onClose={() => setDetailId(null)}
        />
      )}

      {celebratingAchievement && (
        <AchievementCelebration
          achievement={celebratingAchievement}
          viewOnly={viewing}
          statusOf={id => gamification?.achievements?.find((x: { id: string }) => x.id === id)}
          note={gamification?.achievements?.find((x: { id: string }) => x.id === celebratingAchievement.id)?.note ?? null}
          onNoteSaved={(id, note) => setGamification(g => g && {
            ...g,
            achievements: g.achievements.map((x: { id: string }) => (x.id === id ? { ...x, note } : x)),
          })}
          onClose={() => { setCelebratingAchievement(null); setViewing(false) }}
        />
      )}
    </div>
  )
}
