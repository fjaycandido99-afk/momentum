'use client'

import { X, Save, Loader2, Check } from 'lucide-react'

interface FocusModeToolbarProps {
  label: string
  text: string
  autosaveStatus: 'idle' | 'saving' | 'saved' | 'error'
  onClose: () => void
  onSave: () => void
  isSaving: boolean
}

export function FocusModeToolbar({
  label,
  text,
  autosaveStatus,
  onClose,
  onSave,
  isSaving,
}: FocusModeToolbarProps) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length

  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-black/95 backdrop-blur-sm border-t border-white/[0.08] safe-area-pb">
      {/* Left: close + label */}
      <div className="flex items-center gap-3">
        <button
          onClick={onClose}
          className="p-1.5 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Exit focus mode"
        >
          <X className="w-5 h-5 text-white/85" />
        </button>
        <span className="text-xs text-white/70 font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Center: word count + autosave */}
      <div className="flex items-center gap-2 text-[11px] text-white/60">
        <span><span className="font-medium text-white/70">{words}</span> {words === 1 ? 'word' : 'words'}</span>
        <span className="text-white/20">|</span>
        <span>{chars}</span>
        {autosaveStatus === 'saving' && (
          <Loader2 className="w-3 h-3 animate-spin text-white/60" />
        )}
        {autosaveStatus === 'saved' && (
          <span className="text-emerald-400/70 flex items-center gap-0.5">
            <Check className="w-3 h-3" /> Saved
          </span>
        )}
        {autosaveStatus === 'error' && (
          <span className="text-red-400/70">Failed</span>
        )}
      </div>

      {/* Right: save button */}
      <button
        onClick={onSave}
        disabled={isSaving}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-xs text-white/80 disabled:opacity-40"
      >
        {isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Save className="w-3.5 h-3.5" />
        )}
        Save
      </button>
    </div>
  )
}
