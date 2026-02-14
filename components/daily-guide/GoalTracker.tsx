'use client'

import { useState, useEffect } from 'react'
import { Target, Plus, Check, Loader2, Trash2, ChevronDown, ChevronUp, Crown, Lock, Sparkles, Clock } from 'lucide-react'
import { useSubscription } from '@/contexts/SubscriptionContext'

interface Goal {
  id: string
  title: string
  description: string | null
  frequency: string
  target_count: number
  current_count: number
  status: string
  created_at: string
}

export function GoalTracker() {
  const { checkAccess, openUpgradeModal } = useSubscription()
  const hasGoalAccess = checkAccess('goal_tracker')

  const [goals, setGoals] = useState<Goal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [newFrequency, setNewFrequency] = useState('daily')
  const [newTarget, setNewTarget] = useState('1')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [incrementingId, setIncrementingId] = useState<string | null>(null)
  const [decomposingId, setDecomposingId] = useState<string | null>(null)
  const [microActions, setMicroActions] = useState<Record<string, { action: string; when: string; durationMinutes: number }[]>>({})
  const [expandedGoalId, setExpandedGoalId] = useState<string | null>(null)

  useEffect(() => {
    if (hasGoalAccess) {
      fetchGoals()
    } else {
      setIsLoading(false)
    }
  }, [hasGoalAccess])

  const fetchGoals = async () => {
    try {
      const response = await fetch('/api/goals')
      if (response.ok) {
        const data = await response.json()
        setGoals(data.goals || [])
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          frequency: newFrequency,
          target_count: parseInt(newTarget) || 1,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        setGoals(prev => [data.goal, ...prev])
        setNewTitle('')
        setNewTarget('1')
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Failed to create goal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleIncrement = async (goalId: string) => {
    setIncrementingId(goalId)
    try {
      const response = await fetch('/api/goals', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId, increment: true }),
      })
      if (response.ok) {
        const data = await response.json()
        setGoals(prev => prev.map(g => g.id === goalId ? data.goal : g))
      }
    } catch (error) {
      console.error('Failed to increment goal:', error)
    } finally {
      setIncrementingId(null)
    }
  }

  const handleArchive = async (goalId: string) => {
    try {
      const response = await fetch('/api/goals', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: goalId }),
      })
      if (response.ok) {
        setGoals(prev => prev.filter(g => g.id !== goalId))
      }
    } catch (error) {
      console.error('Failed to archive goal:', error)
    }
  }

  const handleDecompose = async (goalId: string) => {
    if (decomposingId) return
    // Toggle if already expanded with data
    if (expandedGoalId === goalId && microActions[goalId]) {
      setExpandedGoalId(null)
      return
    }
    setExpandedGoalId(goalId)
    if (microActions[goalId]) return // Already loaded

    setDecomposingId(goalId)
    try {
      const res = await fetch('/api/ai/goal-decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId }),
      })
      if (res.ok) {
        const data = await res.json()
        setMicroActions(prev => ({ ...prev, [goalId]: data.microActions }))
      }
    } catch {
      // Silently fail
    } finally {
      setDecomposingId(null)
    }
  }

  const activeGoals = goals.filter(g => g.status === 'active')
  const completedGoals = goals.filter(g => g.status === 'completed')

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)] p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-4 h-4 text-white/95 animate-spin" />
          <span className="text-sm text-white/95">Loading goals...</span>
        </div>
      </div>
    )
  }

  // Show locked state for free users
  if (!hasGoalAccess) {
    return (
      <div className="rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
        <button
          onClick={openUpgradeModal}
          className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/20 relative">
              <Target className="w-4 h-4 text-purple-400" />
              <Lock className="absolute -top-1 -right-1 w-3 h-3 text-white" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-white flex items-center gap-2">
                Goals
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-medium">PRO</span>
              </h3>
              <p className="text-xs text-white/95">Track habits & achieve more</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-black border border-white/20 shadow-[0_2px_20px_rgba(255,255,255,0.08)]">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        aria-label="Toggle goals section"
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20">
            <Target className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <h3 className="font-medium text-white">Goals</h3>
            <p className="text-xs text-white/95">
              {activeGoals.length} active{completedGoals.length > 0 ? `, ${completedGoals.length} done` : ''}
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/95" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/95" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {/* Empty State */}
          {activeGoals.length === 0 && completedGoals.length === 0 && (
            <div className="text-center py-4">
              <Target className="w-5 h-5 text-white/95 mx-auto mb-2" />
              <p className="text-sm text-white/95">No goals yet</p>
              <p className="text-xs text-white/95 mt-0.5">Add a goal to start tracking</p>
            </div>
          )}

          {/* Active Goals */}
          {activeGoals.map(goal => {
            const progress = Math.min((goal.current_count / goal.target_count) * 100, 100)
            return (
              <div key={goal.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-white">{goal.title}</h4>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleArchive(goal.id)}
                      aria-label={`Delete ${goal.title}`}
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                    >
                      <Trash2 className="w-3 h-3 text-white/95" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={goal.current_count} aria-valuemin={0} aria-valuemax={goal.target_count} aria-label={`${goal.title} progress`}>
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-white/95">
                        {goal.current_count}/{goal.target_count} {goal.frequency}
                      </span>
                      <span className="text-[10px] text-purple-400">{Math.round(progress)}%</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleIncrement(goal.id)}
                    disabled={incrementingId === goal.id}
                    aria-label={`Increment ${goal.title}`}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 text-xs font-medium transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                  >
                    {incrementingId === goal.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      '+1'
                    )}
                  </button>
                </div>

                {/* AI Breakdown button */}
                <button
                  onClick={() => handleDecompose(goal.id)}
                  disabled={decomposingId === goal.id}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-[10px] font-medium transition-colors disabled:opacity-40"
                >
                  {decomposingId === goal.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  AI Breakdown
                </button>

                {/* Micro-actions */}
                {expandedGoalId === goal.id && microActions[goal.id] && (
                  <div className="mt-2 space-y-1.5">
                    {microActions[goal.id].map((ma, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                        <div className="w-4 h-4 rounded border border-white/20 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-white/90 leading-snug">{ma.action}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-white/40 capitalize">{ma.when}</span>
                            <Clock className="w-2.5 h-2.5 text-white/30" />
                            <span className="text-[9px] text-white/40">{ma.durationMinutes}m</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {/* Completed Goals */}
          {completedGoals.map(goal => (
            <div key={goal.id} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 opacity-60">
              <div className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-sm text-white/95 line-through">{goal.title}</span>
              </div>
            </div>
          ))}

          {/* Add Goal Form */}
          {showAddForm ? (
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                placeholder="Goal title..."
                aria-label="Goal title"
                className="w-full p-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-white/30 focus-visible:ring-1 focus-visible:ring-white/20"
                maxLength={100}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <select
                  value={newFrequency}
                  onChange={e => setNewFrequency(e.target.value)}
                  aria-label="Goal frequency"
                  className="p-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none appearance-none focus-visible:ring-1 focus-visible:ring-white/20"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <input
                  type="number"
                  value={newTarget}
                  onChange={e => setNewTarget(e.target.value)}
                  min="1"
                  max="100"
                  aria-label="Target count"
                  className="w-16 p-2 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none text-center focus-visible:ring-1 focus-visible:ring-white/20"
                  placeholder="Target"
                />
                <span className="text-xs text-white/95">times</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 rounded-lg bg-white/5 text-white/95 text-xs hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || isSubmitting}
                  aria-busy={isSubmitting}
                  className="flex-1 py-2 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-40 flex items-center justify-center gap-1 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Add Goal
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full p-3 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-white/95 hover:text-white/95 text-sm transition-colors flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
            >
              <Plus className="w-4 h-4" />
              Add Goal
            </button>
          )}
        </div>
      )}
    </div>
  )
}
