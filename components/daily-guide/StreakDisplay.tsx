'use client'

import { useState, useEffect } from 'react'
import { Flame, Trophy, Star, Zap, Crown, Sparkles, X, Share2 } from 'lucide-react'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { useShareCard } from '@/hooks/useShareCard'
import { generateStreakCard } from '@/hooks/useShareCardTemplates'
import { StreakFlame } from '@/components/ui/StreakFlame'

interface StreakDisplayProps {
  streak: number
  showCelebration?: boolean
  onCelebrationClose?: () => void
}

// Milestone thresholds and their rewards
const MILESTONES = [
  { days: 7, label: '1 Week', icon: Star, color: 'text-blue-400', bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', message: "You're building a habit!", confettiCount: 20 },
  { days: 14, label: '2 Weeks', icon: Zap, color: 'text-purple-400', bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', message: 'Two weeks strong! Consistency is your superpower.', confettiCount: 30 },
  { days: 21, label: '3 Weeks', icon: Sparkles, color: 'text-emerald-400', bg: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', message: '21 days — they say this is where habits stick!', confettiCount: 40 },
  { days: 30, label: '1 Month', icon: Trophy, color: 'text-amber-400', bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30', message: 'A full month! You are a force of nature.', confettiCount: 50 },
  { days: 60, label: '2 Months', icon: Crown, color: 'text-rose-400', bg: 'from-rose-500/20 to-red-500/20', border: 'border-rose-500/30', message: '60 days of dedication. Truly remarkable.', confettiCount: 60 },
  { days: 90, label: '3 Months', icon: Crown, color: 'text-yellow-400', bg: 'from-yellow-500/20 to-amber-500/20', border: 'border-yellow-500/30', message: 'A quarter year! This is who you are now.', confettiCount: 70 },
  { days: 100, label: 'Century', icon: Crown, color: 'text-white', bg: 'from-white/20 to-white/10', border: 'border-white/40', message: 'Legendary! 100 days of transformation.', confettiCount: 80 },
  { days: 365, label: '1 Year', icon: Crown, color: 'text-yellow-300', bg: 'from-yellow-400/30 to-amber-500/30', border: 'border-yellow-400/50', message: 'One full year. You are unstoppable.', confettiCount: 80 },
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
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/15">
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
        className={`relative flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r ${
          currentMilestone ? currentMilestone.bg : 'from-amber-500/20 to-orange-500/20'
        } border ${currentMilestone ? currentMilestone.border : 'border-amber-500/30'} ${
          isMilestone ? 'animate-pulse' : ''
        }`}
      >
        {/* Flame animation behind badge */}
        <div className="absolute -top-4 left-1">
          <StreakFlame streak={streak} size="md" />
        </div>
        {/* Progress ring toward next milestone */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          {nextMilestone && (() => {
            const prevDays = currentMilestone?.days || 0
            const progress = ((streak - prevDays) / (nextMilestone.days - prevDays)) * 100
            const radius = 14
            const circumference = 2 * Math.PI * radius
            const strokeDashoffset = circumference - (progress / 100) * circumference
            return (
              <svg className="absolute inset-0 w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                <circle
                  cx="16" cy="16" r={radius} fill="none"
                  stroke={currentMilestone?.color === 'text-amber-400' ? '#fbbf24' : currentMilestone?.color === 'text-blue-400' ? '#60a5fa' : currentMilestone?.color === 'text-purple-400' ? '#c084fc' : '#fbbf24'}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-700"
                />
              </svg>
            )
          })()}
          <Flame className={`w-4 h-4 ${currentMilestone?.color || 'text-amber-400'} relative z-10`} />
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
          <div className="ml-2 pl-2 border-l border-white/15">
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
            {/* Confetti effect - scaled by milestone tier */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(currentMilestone.confettiCount)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full confetti-burst"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${-10 - Math.random() * 20}%`,
                    backgroundColor: ['#fbbf24', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#10b981', '#f472b6'][i % 7],
                    animationDelay: `${Math.random() * 0.8}s`,
                    animationDuration: `${2 + Math.random() * 0.5}s`,
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
                {currentMilestone.message}
              </p>

              {/* Next milestone with progress ring */}
              {nextMilestone && (() => {
                const prevDays = currentMilestone.days
                const progress = ((streak - prevDays) / (nextMilestone.days - prevDays)) * 100
                const radius = 20
                const circumference = 2 * Math.PI * radius
                const strokeDashoffset = circumference - (progress / 100) * circumference
                return (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                    <svg className="w-12 h-12 -rotate-90 shrink-0" viewBox="0 0 48 48">
                      <circle cx="24" cy="24" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
                      <circle
                        cx="24" cy="24" r={radius} fill="none"
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <div className="text-sm text-white/95">
                      Next: <span className="text-white font-medium">{nextMilestone.label}</span>
                      <span className="text-white/75 ml-1">({nextMilestone.days - streak} days)</span>
                    </div>
                  </div>
                )
              })()}

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

      {/* Confetti animation uses .confetti-burst class from globals.css */}
    </>
  )
}

// Compact version for header
export function StreakBadge({ streak, freezeCount }: { streak: number; freezeCount?: number }) {
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
    <div className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gradient-to-r ${
      currentMilestone ? currentMilestone.bg : 'from-amber-500/20 to-orange-500/20'
    } border ${currentMilestone ? currentMilestone.border : 'border-amber-500/30'}`}>
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <StreakFlame streak={streak} size="sm" />
      </div>
      <Flame className={`w-3.5 h-3.5 ${currentMilestone?.color || 'text-amber-400'}`} />
      <span className={`text-xs font-bold ${currentMilestone?.color || 'text-amber-400'}`}>
        {streak}
      </span>
      {typeof freezeCount === 'number' && freezeCount > 0 && (
        <span className="text-[10px] text-cyan-400/70" title={`${freezeCount} streak freeze${freezeCount !== 1 ? 's' : ''}`}>
          ❄{freezeCount}
        </span>
      )}
    </div>
  )
}
