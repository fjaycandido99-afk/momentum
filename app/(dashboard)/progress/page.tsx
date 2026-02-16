'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Flame, Mail } from 'lucide-react'
import { StreakHeatmap } from '@/components/progress/StreakHeatmap'
import { ListeningStats } from '@/components/progress/ListeningStats'
import { ModulesCompleted } from '@/components/progress/ModulesCompleted'
import { MoodTrends } from '@/components/progress/MoodTrends'
import { XPProgress } from '@/components/progress/XPProgress'
import { AchievementGrid } from '@/components/progress/AchievementGrid'
import { AchievementCelebration } from '@/components/progress/AchievementCelebration'
import { DailyChallenges } from '@/components/progress/DailyChallenges'
import { WeeklyMissions } from '@/components/progress/WeeklyMissions'
import { SocialProofCard } from '@/components/progress/SocialProofCard'
import { UnlockableRewards } from '@/components/progress/UnlockableRewards'
import { MoodInsights } from '@/components/progress/MoodInsights'
import { WellnessScore } from '@/components/progress/WellnessScore'
import { MonthlyRetrospective } from '@/components/progress/MonthlyRetrospective'
import { MindsetEvolution } from '@/components/progress/MindsetEvolution'
import { LetterToSelf } from '@/components/progress/LetterToSelf'
import { ProgressHub } from '@/components/path/ProgressHub'
import { useMindset } from '@/contexts/MindsetContext'
import { migrateLocalXP } from '@/lib/gamification'
import { FeatureHint } from '@/components/ui/FeatureHint'

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
  const { mindset } = useMindset()
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

  const handleAchievementClick = useCallback((achievement: any) => {
    if (achievement.unlocked) {
      setCelebratingAchievement(achievement)
    }
  }, [])

  return (
    <div className="min-h-screen text-white pb-24">
      <div className="sticky top-0 z-50 px-6 pt-12 pb-4 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        <h1 className="text-2xl font-semibold shimmer-text">Progress</h1>
        <FeatureHint id="progress-intro" text="Your streaks, listening time & journal stats at a glance" mode="once" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
        </div>
      ) : !data ? (
        <div className="text-center py-20 text-white/50 text-sm">Unable to load progress data</div>
      ) : (
        <div className="px-6 space-y-4">
          {/* Streak + XP Row */}
          <div className="flex gap-3">
            <div className="glass-refined rounded-2xl p-4 flex items-center gap-3 flex-1">
              <Flame className="w-6 h-6 text-amber-400" />
              <div>
                <p className="text-2xl font-bold text-amber-400">{gamification?.streak ?? data.streak}</p>
                <p className="text-xs text-white/50">day streak</p>
              </div>
            </div>
            {gamification && (
              <div className="glass-refined rounded-2xl p-4 flex items-center gap-3 flex-1">
                <div className="text-lg">⚡</div>
                <div>
                  <p className="text-2xl font-bold text-cyan-400">{gamification.xp.today}</p>
                  <p className="text-xs text-white/50">XP today</p>
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
                className="w-full p-4 rounded-2xl bg-gradient-to-r from-pink-500/10 to-amber-500/10 border border-pink-500/20 flex items-center gap-3 hover:from-pink-500/15 hover:to-amber-500/15 transition-all"
              >
                <div className="p-2 rounded-xl bg-pink-500/20 shrink-0">
                  <Mail className="w-5 h-5 text-pink-400" />
                </div>
                <div className="text-left flex-1">
                  <p className="text-sm font-medium text-white">{streak}-day milestone!</p>
                  <p className="text-[10px] text-white/60">Read a letter from your future self</p>
                </div>
                <span className="text-xs text-pink-400 font-medium shrink-0">View</span>
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

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <ModulesCompleted count={data.modulesCompleted} activeDays={data.activeDays} />
            <ListeningStats totalMinutes={data.listeningMinutes} categoryMinutes={data.categoryMinutes} />
          </div>

          {/* Path Progress */}
          {mindset && (
            <ProgressHub mindsetId={mindset} />
          )}

          {/* Mood Insights */}
          {data?.moodInsights && (
            <MoodInsights insights={data.moodInsights} />
          )}

          {/* Legacy Mood Trends */}
          <MoodTrends moodData={data.moodData} />
        </div>
      )}

      {/* Achievement Celebration Modal */}
      {celebratingAchievement && (
        <AchievementCelebration
          achievement={celebratingAchievement}
          onClose={() => setCelebratingAchievement(null)}
        />
      )}
    </div>
  )
}
