'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Flame } from 'lucide-react'
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
import { ProgressHub } from '@/components/path/ProgressHub'
import { useMindset } from '@/contexts/MindsetContext'
import { migrateLocalXP } from '@/lib/gamification'

interface ProgressData {
  streak: number
  activeDays: number
  listeningMinutes: number
  categoryMinutes: Record<string, number>
  modulesCompleted: number
  moodData: { date: string; before: number | null; after: number | null }[]
  heatmap: Record<string, number>
  daysLimit: number
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
  moodInsights: any
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
      <div className="px-6 pt-12 pb-4 header-fade-bg">
        <h1 className="text-2xl font-semibold shimmer-text">Progress</h1>
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

          {/* XP Level Progress */}
          <XPProgress
            totalXP={gamification?.xp.total}
            todaysXP={gamification?.xp.today}
          />

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

          {/* Heatmap */}
          <StreakHeatmap heatmap={data.heatmap} daysLimit={data.daysLimit} />

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <ModulesCompleted count={data.modulesCompleted} activeDays={data.activeDays} />
            <ListeningStats totalMinutes={data.listeningMinutes} categoryMinutes={data.categoryMinutes} />
          </div>

          {/* Path Progress */}
          {mindset && mindset !== 'scholar' && (
            <ProgressHub mindsetId={mindset} />
          )}

          {/* Mood Insights */}
          {gamification?.moodInsights && (
            <MoodInsights insights={gamification.moodInsights} />
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
