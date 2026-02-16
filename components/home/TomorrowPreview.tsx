'use client'

import { useState, useMemo } from 'react'
import { Eye, Bell, BellOff, ChevronRight } from 'lucide-react'
import { TOPIC_NAMES } from './home-types'
import { getPromptForDate } from '@/components/journal/JournalPrompts'
import { requestNotificationPermission, subscribeToPush } from '@/lib/push-notifications'

export function TomorrowPreview() {
  const [reminderSet, setReminderSet] = useState(false)
  const [settingReminder, setSettingReminder] = useState(false)

  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d
  }, [])

  const tomorrowDayOfYear = useMemo(() => {
    const start = new Date(tomorrow.getFullYear(), 0, 0)
    return Math.floor((tomorrow.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [tomorrow])

  const tomorrowTopic = TOPIC_NAMES[tomorrowDayOfYear % TOPIC_NAMES.length]
  const { prompt: tomorrowPrompt } = getPromptForDate(tomorrow)

  const handleSetReminder = async () => {
    if (settingReminder || reminderSet) return
    setSettingReminder(true)
    try {
      const permission = await requestNotificationPermission()
      if (permission === 'granted') {
        await subscribeToPush()
        setReminderSet(true)
      }
    } catch {
      // Silently fail
    } finally {
      setSettingReminder(false)
    }
  }

  return (
    <div className="mx-6 mb-6 p-4 rounded-2xl bg-black border border-white/15">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-white" />
        <p className="text-xs font-medium text-white/70 uppercase tracking-wider">Tomorrow's Preview</p>
      </div>

      {/* Topic */}
      <div className="flex items-center gap-2 mb-3">
        <ChevronRight className="w-3.5 h-3.5 text-white/50" />
        <p className="text-sm text-white">
          Topic: <span className="text-white font-medium">{tomorrowTopic}</span>
        </p>
      </div>

      {/* Blurred journal prompt preview */}
      <div className="relative mb-3 p-3 rounded-xl bg-white/5 overflow-hidden">
        <p className="text-xs text-white/70 mb-1">Journal prompt</p>
        <p className="text-sm text-white blur-[4px] select-none">{tomorrowPrompt.text}</p>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] text-white bg-black/60 px-2 py-0.5 rounded-full">Come back tomorrow</span>
        </div>
      </div>

      {/* Remind me button */}
      <button
        onClick={handleSetReminder}
        disabled={settingReminder || reminderSet}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
          reminderSet
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            : 'bg-white/10 text-white border border-white/15 hover:bg-white/15'
        } disabled:opacity-50`}
      >
        {reminderSet ? (
          <>
            <BellOff className="w-3.5 h-3.5" />
            Reminder set
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            {settingReminder ? 'Setting up...' : 'Remind me tomorrow'}
          </>
        )}
      </button>
    </div>
  )
}
