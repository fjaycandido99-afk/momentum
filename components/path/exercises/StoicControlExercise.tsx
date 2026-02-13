'use client'

import { useState, useRef } from 'react'
import { Shield, Plus, X } from 'lucide-react'

interface Item {
  id: string
  text: string
}

interface StoicControlExerciseProps {
  onPathActivity?: () => void
}

export function StoicControlExercise({ onPathActivity }: StoicControlExerciseProps) {
  const [input, setInput] = useState('')
  const trackedRef = useRef(false)
  const [withinControl, setWithinControl] = useState<Item[]>([])
  const [beyondControl, setBeyondControl] = useState<Item[]>([])
  const [activeColumn, setActiveColumn] = useState<'within' | 'beyond'>('within')

  const addItem = () => {
    if (!input.trim()) return
    if (!trackedRef.current) {
      trackedRef.current = true
      fetch('/api/path/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activity: 'exercise' }),
      }).catch(() => {})
      onPathActivity?.()
    }
    const item: Item = { id: Date.now().toString(), text: input.trim() }
    if (activeColumn === 'within') {
      setWithinControl(prev => [...prev, item])
    } else {
      setBeyondControl(prev => [...prev, item])
    }
    setInput('')
  }

  const removeItem = (id: string, column: 'within' | 'beyond') => {
    if (column === 'within') {
      setWithinControl(prev => prev.filter(i => i.id !== id))
    } else {
      setBeyondControl(prev => prev.filter(i => i.id !== id))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addItem()
    }
  }

  return (
    <div className="card-path p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-slate-500/10">
          <Shield className="w-4 h-4 text-slate-300/70" />
        </div>
        <h3 className="text-sm font-medium text-white">Dichotomy of Control</h3>
      </div>
      <p className="text-xs text-white/60 mb-4">Sort today&apos;s concerns into what you can and cannot control.</p>

      {/* Column selector */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setActiveColumn('within')}
          className={`flex-1 py-2 text-xs rounded-lg border transition-all press-scale ${
            activeColumn === 'within'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-white/[0.03] border-white/10 text-white/60'
          }`}
        >
          Within my control
        </button>
        <button
          onClick={() => setActiveColumn('beyond')}
          className={`flex-1 py-2 text-xs rounded-lg border transition-all press-scale ${
            activeColumn === 'beyond'
              ? 'bg-red-500/10 border-red-500/20 text-red-300'
              : 'bg-white/[0.03] border-white/10 text-white/60'
          }`}
        >
          Beyond my control
        </button>
      </div>

      {/* Input */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a concern..."
          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all"
        />
        <button
          onClick={addItem}
          disabled={!input.trim()}
          className="p-2 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-20 disabled:cursor-not-allowed transition-all press-scale"
        >
          <Plus className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">Within control</p>
          <div className="space-y-1.5 min-h-[40px]">
            {withinControl.map(item => (
              <div key={item.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
                <span className="text-xs text-white/80 flex-1">{item.text}</span>
                <button onClick={() => removeItem(item.id, 'within')} className="flex-shrink-0 press-scale">
                  <X className="w-3 h-3 text-white/50" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] text-white/50 uppercase tracking-wider mb-2">Beyond control</p>
          <div className="space-y-1.5 min-h-[40px]">
            {beyondControl.map(item => (
              <div key={item.id} className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/10 border border-red-500/20 animate-fade-in">
                <span className="text-xs text-white/80 flex-1">{item.text}</span>
                <button onClick={() => removeItem(item.id, 'beyond')} className="flex-shrink-0 press-scale">
                  <X className="w-3 h-3 text-white/50" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
