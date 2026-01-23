'use client'

import { Briefcase, Coffee, Heart, GraduationCap, BookOpen, FileCheck } from 'lucide-react'
import type { DayType } from '@/lib/ai/daily-guide-prompts'

interface DayTypeIndicatorProps {
  dayType: DayType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const dayTypeConfig: Record<DayType, {
  label: string
  icon: typeof Briefcase
  bgClass: string
  textClass: string
  borderClass: string
}> = {
  work: {
    label: 'WORK DAY',
    icon: Briefcase,
    bgClass: 'bg-white/10',
    textClass: 'text-white',
    borderClass: 'border-white/20',
  },
  off: {
    label: 'DAY OFF',
    icon: Coffee,
    bgClass: 'bg-white/10',
    textClass: 'text-white',
    borderClass: 'border-white/20',
  },
  recovery: {
    label: 'RECOVERY',
    icon: Heart,
    bgClass: 'bg-white/10',
    textClass: 'text-white',
    borderClass: 'border-white/20',
  },
  class: {
    label: 'CLASS DAY',
    icon: GraduationCap,
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-300',
    borderClass: 'border-blue-400/20',
  },
  study: {
    label: 'STUDY DAY',
    icon: BookOpen,
    bgClass: 'bg-purple-500/10',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/20',
  },
  exam: {
    label: 'EXAM DAY',
    icon: FileCheck,
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/20',
  },
}

const sizeClasses = {
  sm: {
    container: 'px-2 py-1 text-xs gap-1.5',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-3 py-1.5 text-xs gap-2',
    icon: 'w-3.5 h-3.5',
  },
  lg: {
    container: 'px-4 py-2 text-sm gap-2',
    icon: 'w-4 h-4',
  },
}

export function DayTypeIndicator({
  dayType,
  size = 'md',
  showLabel = true,
}: DayTypeIndicatorProps) {
  const config = dayTypeConfig[dayType]
  const sizeConfig = sizeClasses[size]
  const Icon = config.icon

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full border animate-scale-in
        ${config.bgClass} ${config.textClass} ${config.borderClass}
        ${sizeConfig.container}
      `}
    >
      <Icon className={sizeConfig.icon} />
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}
