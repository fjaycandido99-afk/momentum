'use client'

import { useState, useEffect } from 'react'
import { Flame, Trophy, Star, Zap, Crown, Sparkles, X, Share2 } from 'lucide-react'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { useShareCard } from '@/hooks/useShareCard'
import { generateStreakCard } from '@/hooks/useShareCardTemplates'

interface StreakDisplayProps {
  streak: number
  showCelebration?: boolean
  onCelebrationClose?: () => void
}

// Milestone thresholds and their rewards
const MILESTONES = [
  { days: 7, label: '1 Week', icon: Star, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30' },
  { days: 14, label: '2 Weeks', icon: Zap, color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30' },
  { days: 21, label: '3 Weeks', icon: Sparkles, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30' },
  { days: 30, label: '1 Month', icon: Trophy, color: 'text-amber-400', bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30' },
  { days: 60, label: '2 Months', icon: Crown, color: 'text-rose-400', bg: 'from-rose-500/20 to-red-500/20', border: 'border-rose-500/30' },
  { days: 90, label: '3 Months', icon: Crown, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30' },
  { days: 100, label: 'Century', icon: Crown, color: 'text-white', bg: 'from-white/20 to-white/10', border: 'border-white/40' },
  { days: 365, label: '1 Year', icon: Crown, color: 'text-yellow-300', bg: 'from-yellow-400/30 to-amber-500/30', border: 'border-yellow-400/50' },
]

// Get current milestone info
function getCurrentMilestone(streak: number) {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (streak >= MILESTONES[i].days) {
      return MILESTONES[i]
    }
  }
  return null
}

// Get next milestone
function getNextMilestone(streak: number) {
  for (const milestone of MILESTONES) {
    if (streak < milestone.days) {
      return milestone
    }
  }
  return null
}

// Check if streak just hit a milestone
function isNewMilestone(streak: number) {
  return MILESTONES.some(m => m.days === streak)
}

export function StreakDisplay({ streak, showCelebration, onCelebrationClose }: StreakDisplayProps) {
  const [showMilestoneModal, setShowMilestoneModal] = useState(false)
  const { shareFromHTML, isGenerating } = useShareCard()
  const currentMilestone = getCurrentMilestone(streak)
  const nextMilestone = getNextMilestone(streak)
  const isMilestone = isNewMilestone(streak)

  // Show celebration modal for new milestones
  useEffect(() => {
    if (showCelebration && isMilestone) {
      setShowMilestoneModal(true)
    }
  }, [showCelebration, isMilestone])

  const handleCloseCelebration = () => {
    setShowMilestoneModal(false)
    onCelebrationClose?.()
  }

  if (streak === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
        <Flame className="w-4 h-4 text-white/95" />
        <span className="text-sm text-white/95">Start your streak!</span>
      </div>
    )
  }

  const MilestoneIcon = currentMilestone?.icon || Flame

  return (
    <>
      {/* Streak Badge */}
      <div>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${
          currentMilestone ? currentMilestone.bg : 'from-amber-500/20 to-orange-500/20'
        } border ${currentMilestone ? currentMilestone.border : 'border-amber-500/30'} ${
          isMilestone ? 'animate-pulse' : ''
        }`}
      >
        <div className="relative">
          <Flame className={`w-5 h-5 ${currentMilestone?.color || 'text-amber-400'} animate-bounce`}
            style={{ animationDuration: '1s' }}
          />
          {streak >= 7 && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
          )}
        </div>
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold ${currentMilestone?.color || 'text-amber-400'}`}>
              {streak}
            </span>
            <span className={`text-xs ${currentMilestone?.color || 'text-amber-400'} opacity-70`}>
              day{streak !== 1 ? 's' : ''}
            </span>
          </div>
          {currentMilestone && (
            <span className="text-[10px] text-white/95">{currentMilestone.label}</span>
          )}
        </div>
        {nextMilestone && (
          <div className="ml-2 pl-2 border-l border-white/10">
            <div className="text-[10px] text-white/95">
              {nextMilestone.days - streak} to {nextMilestone.label}
            </div>
          </div>
        )}
      </div>
      <FeatureHint id="streak" text="Consistency builds momentum — rest days don't break your streak" mode="once" />
      </div>

      {/* Milestone Celebration Modal */}
      {showMilestoneModal && currentMilestone && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm">
            {/* Confetti effect */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][i % 5],
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${1 + Math.random()}s`,
                  }}
                />
              ))}
            </div>

            {/* Modal content */}
            <div className={`relative p-8 rounded-3xl bg-gradient-to-br ${currentMilestone.bg} border ${currentMilestone.border} text-center`}>
              <button
                onClick={handleCloseCelebration}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white/95" />
              </button>

              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-full bg-white/10 ${currentMilestone.color}`}>
                  <MilestoneIcon className="w-12 h-12 animate-bounce" />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white mb-2">
                {currentMilestone.label} Streak!
              </h2>
              <p className={`text-4xl font-bold ${currentMilestone.color} mb-4`}>
                {streak} Days
              </p>

              {/* Message */}
              <p className="text-white/95 text-sm mb-6">
                {streak >= 100
                  ? "Legendary! You're unstoppable!"
                  : streak >= 30
                  ? "Amazing dedication! Keep it going!"
                  : streak >= 7
                  ? "Great start! You're building a habit!"
                  : "You're on fire!"}
              </p>

              {/* Next milestone */}
              {nextMilestone && (
                <div className="p-3 rounded-xl bg-white/5 text-sm text-white/95">
                  Next milestone: <span className="text-white font-medium">{nextMilestone.label}</span>
                  <span className="text-white/95"> ({nextMilestone.days - streak} days away)</span>
                </div>
              )}

              {/* Action buttons */}
              <div className="mt-6 flex gap-3 justify-center">
                <button
                  onClick={handleCloseCelebration}
                  className="px-6 py-3 rounded-xl bg-white/20 hover:bg-white/30 text-white font-medium transition-colors"
                >
                  Keep Going!
                </button>
                <button
                  onClick={() => shareFromHTML(generateStreakCard(streak))}
                  disabled={isGenerating}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50"
                  aria-label="Share streak"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add confetti animation styles */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(400px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 2s ease-out forwards;
        }
      `}</style>
    </>
  )
}

// Compact version for header
export function StreakBadge({ streak }: { streak: number }) {
  const currentMilestone = getCurrentMilestone(streak)

  if (streak === 0) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5">
        <Flame className="w-3.5 h-3.5 text-white/95" />
        <span className="text-xs text-white/95">0</span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r ${
      currentMilestone ? currentMilestone.bg : 'from-amber-500/20 to-orange-500/20'
    } border ${currentMilestone ? currentMilestone.border : 'border-amber-500/30'}`}>
      <Flame className={`w-3.5 h-3.5 ${currentMilestone?.color || 'text-amber-400'}`} />
      <span className={`text-xs font-bold ${currentMilestone?.color || 'text-amber-400'}`}>
        {streak}
      </span>
    </div>
  )
}
