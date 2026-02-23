import {
  Clock,
  MessageCircle,
  Lightbulb,
  Flame,
  Bell,
  type LucideIcon,
} from 'lucide-react'

export type AlertPriority = 'urgent' | 'high' | 'normal' | 'low'
export type AlertChannel = 'push' | 'in_app' | 'email'
export type AlertCategory = 'reminder' | 'coach' | 'insight' | 'streak' | 'general'

export interface AlertPreference {
  alert_type_id: string
  label: string
  description: string | null
  category: string
  premium_only: boolean
  enabled: boolean
  priority: string
  channel: string
  quiet_start: string | null
  quiet_end: string | null
  is_default: boolean
}

export interface AlertPreferenceUpdate {
  alert_type_id: string
  enabled?: boolean
  priority?: string
  channel?: string
  quiet_start?: string | null
  quiet_end?: string | null
}

export const CATEGORY_META: Record<string, { label: string; icon: LucideIcon }> = {
  reminder: { label: 'Reminders', icon: Clock },
  coach: { label: 'Coach', icon: MessageCircle },
  insight: { label: 'Insights', icon: Lightbulb },
  streak: { label: 'Streaks', icon: Flame },
  general: { label: 'General', icon: Bell },
}

export const CATEGORY_ORDER: AlertCategory[] = ['reminder', 'coach', 'insight', 'streak', 'general']
