'use client'

import { useState } from 'react'
import { ArrowLeft, Plus, X, Loader2, GripVertical } from 'lucide-react'

const ACTIVITY_OPTIONS = [
  { type: 'soundscape', id: 'focus', title: 'Focus Soundscape', subtitle: 'Concentration ambience' },
  { type: 'soundscape', id: 'relax', title: 'Relax Soundscape', subtitle: 'Calming ambience' },
  { type: 'soundscape', id: 'sleep', title: 'Sleep Soundscape', subtitle: 'Wind-down ambience' },
  { type: 'motivation', id: 'default', title: 'Motivation', subtitle: "Today's topic" },
  { type: 'music', id: 'lofi', title: 'Lo-Fi Music', subtitle: 'Chill beats' },
  { type: 'music', id: 'piano', title: 'Piano Music', subtitle: 'Peaceful keys' },
  { type: 'music', id: 'classical', title: 'Classical Music', subtitle: 'Timeless' },
]

interface RoutineStep {
  activity_type: string
  activity_id: string
  title: string
  subtitle?: string
  duration_minutes?: number
}

interface RoutineBuilderProps {
  onClose: () => void
  onCreated: () => void
}

export function RoutineBuilder({ onClose, onCreated }: RoutineBuilderProps) {
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<RoutineStep[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addStep = (opt: typeof ACTIVITY_OPTIONS[number]) => {
    setSteps(prev => [...prev, {
      activity_type: opt.type,
      activity_id: opt.id,
      title: opt.title,
      subtitle: opt.subtitle,
    }])
    setShowPicker(false)
  }

  const removeStep = (index: number) => {
    setSteps(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!name.trim() || steps.length === 0) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/routines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), steps }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create routine')
        return
      }
      onCreated()
      onClose()
    } catch {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overlay-enter">
      <div className="flex items-center gap-3 px-6 pt-12 pb-4">
        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors press-scale">
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        <h2 className="text-lg font-semibold text-white flex-1">New Routine</h2>
        <button
          onClick={handleSave}
          disabled={!name.trim() || steps.length === 0 || saving}
          className="px-4 py-2 rounded-full bg-white/15 hover:bg-white/20 text-sm text-white font-medium transition-colors disabled:opacity-40 press-scale"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-20 space-y-4">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Routine name (e.g. Morning Focus)"
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-white/10 focus:border-white/25 text-sm text-white placeholder:text-white/30 outline-none transition-colors"
        />

        {error && <p className="text-xs text-red-400">{error}</p>}

        <div className="space-y-1">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl glass-refined">
              <GripVertical className="w-4 h-4 text-white/20 shrink-0" />
              <span className="text-xs text-white/40 w-5">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{step.title}</p>
                {step.subtitle && <p className="text-xs text-white/50">{step.subtitle}</p>}
              </div>
              <button
                onClick={() => removeStep(i)}
                className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-3 rounded-xl border border-dashed border-white/15 hover:bg-white/5 text-sm text-white/60 transition-colors press-scale flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Step
        </button>

        {showPicker && (
          <div className="space-y-1 p-3 rounded-xl glass-refined">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/50 uppercase tracking-wider">Choose Activity</span>
              <button onClick={() => setShowPicker(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>
            {ACTIVITY_OPTIONS.map((opt, i) => (
              <button
                key={i}
                onClick={() => addStep(opt)}
                className="w-full text-left p-2.5 rounded-lg hover:bg-white/5 transition-colors"
              >
                <p className="text-sm text-white">{opt.title}</p>
                <p className="text-xs text-white/40">{opt.subtitle}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
