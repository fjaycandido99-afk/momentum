'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Compass,
  Calendar,
  Clock,
  Mic2,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Zap,
  Briefcase,
  GraduationCap,
  Music,
  BookOpen,
  Sun,
  Sparkles,
  Lightbulb,
  Wind,
  Moon,
  Layers,
} from 'lucide-react'
import type { GuideTone } from '@/lib/ai/daily-guide-prompts'
import type { TimeMode } from '@/lib/daily-guide/decision-tree'

type UserType = 'professional' | 'student' | 'hybrid'

interface OnboardingData {
  userType: UserType
  // Professional settings
  workDays: number[]
  wakeTime: string
  workStartTime: string
  workEndTime: string
  // Student settings
  classDays: number[]
  classStartTime: string
  classEndTime: string
  studyStartTime: string
  studyEndTime: string
  // Common settings
  guideTone: GuideTone
  defaultTimeMode: TimeMode
  backgroundMusicEnabled: boolean
  preferredMusicGenre: string | null
  // Segment customization
  enabledSegments: string[]
}

type SegmentOption = {
  id: string
  label: string
  description: string
  icon: typeof Sun
  required?: boolean
}

const SEGMENT_OPTIONS: SegmentOption[] = [
  {
    id: 'morning_prime',
    label: 'Morning Greeting',
    description: 'A warm welcome to start your day',
    icon: Sun,
    required: true,
  },
  {
    id: 'movement',
    label: 'Quote of the Day',
    description: 'Daily inspiration to motivate you',
    icon: Sparkles,
  },
  {
    id: 'micro_lesson',
    label: 'Motivation Video',
    description: 'Short video to fuel your day',
    icon: Lightbulb,
  },
  {
    id: 'breath',
    label: 'Breath',
    description: 'Centered breathing exercise',
    icon: Wind,
  },
  {
    id: 'day_close',
    label: 'Day Close',
    description: 'Reflect and wind down',
    icon: Moon,
    required: true,
  },
]

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const USER_TYPES: { value: UserType; label: string; icon: typeof Briefcase; description: string }[] = [
  {
    value: 'professional',
    label: 'Professional',
    icon: Briefcase,
    description: 'Working full-time or part-time with set hours.',
  },
  {
    value: 'student',
    label: 'Student',
    icon: GraduationCap,
    description: 'In school or university with classes and study time.',
  },
  {
    value: 'hybrid',
    label: 'Both',
    icon: BookOpen,
    description: 'Working while studying or balancing both.',
  },
]

const TONES: { value: GuideTone; label: string; description: string }[] = [
  {
    value: 'calm',
    label: 'Calm',
    description: 'Soft, deliberate, and gentle. Like a trusted friend.',
  },
  {
    value: 'direct',
    label: 'Direct',
    description: 'Clear and concise. No fluff, just focus.',
  },
  {
    value: 'neutral',
    label: 'Neutral',
    description: 'Balanced and measured. Professional but personal.',
  },
]

const TIME_MODES: { value: TimeMode; label: string; duration: string; description: string }[] = [
  {
    value: 'quick',
    label: 'Quick',
    duration: '~5 min',
    description: 'Fast start. Morning prime + day close only.',
  },
  {
    value: 'normal',
    label: 'Normal',
    duration: '~15 min',
    description: 'Balanced. Includes movement and checkpoints.',
  },
  {
    value: 'full',
    label: 'Full',
    duration: '~25 min',
    description: 'Complete experience with micro-lessons.',
  },
]


const MUSIC_GENRES = [
  { value: null, label: 'Daily Rotation', description: 'Different genre each day' },
  { value: 'lofi', label: 'Lo-Fi', description: 'Chill beats to relax' },
  { value: 'jazz', label: 'Jazz', description: 'Smooth vibes' },
  { value: 'piano', label: 'Piano', description: 'Peaceful keys' },
  { value: 'study', label: 'Study', description: 'Focus music' },
  { value: 'classical', label: 'Classical', description: 'Timeless elegance' },
  { value: 'ambient', label: 'Ambient', description: 'Atmospheric soundscapes' },
]

export function DailyGuideOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    userType: 'professional',
    // Professional settings
    workDays: [1, 2, 3, 4, 5],
    wakeTime: '07:00',
    workStartTime: '09:00',
    workEndTime: '17:00',
    // Student settings
    classDays: [1, 2, 3, 4, 5],
    classStartTime: '08:00',
    classEndTime: '15:00',
    studyStartTime: '18:00',
    studyEndTime: '21:00',
    // Common settings
    guideTone: 'calm',
    defaultTimeMode: 'normal',
    backgroundMusicEnabled: true,
    preferredMusicGenre: null,
    // All segments enabled by default
    enabledSegments: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
  })

  // Dynamic steps based on user type
  const getSteps = () => {
    const baseSteps = [
      { title: 'Welcome', icon: Compass },
      { title: 'You', icon: Briefcase },
    ]

    if (data.userType === 'professional') {
      baseSteps.push(
        { title: 'Work Days', icon: Calendar },
        { title: 'Schedule', icon: Clock },
      )
    } else if (data.userType === 'student') {
      baseSteps.push(
        { title: 'Class Days', icon: Calendar },
        { title: 'Schedule', icon: Clock },
      )
    } else {
      // Hybrid - both work and class
      baseSteps.push(
        { title: 'Work Days', icon: Calendar },
        { title: 'Work Hours', icon: Clock },
        { title: 'Class Days', icon: GraduationCap },
        { title: 'Study Time', icon: BookOpen },
      )
    }

    baseSteps.push(
      { title: 'Time', icon: Zap },
      { title: 'Segments', icon: Layers },
      { title: 'Tone', icon: Mic2 },
      { title: 'Music', icon: Music },
      { title: 'Complete', icon: Check },
    )

    return baseSteps
  }

  const steps = getSteps()

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: data.userType,
          work_days: data.workDays,
          wake_time: data.wakeTime,
          work_start_time: data.workStartTime,
          work_end_time: data.workEndTime,
          class_days: data.classDays,
          class_start_time: data.classStartTime,
          class_end_time: data.classEndTime,
          study_start_time: data.studyStartTime,
          study_end_time: data.studyEndTime,
          guide_tone: data.guideTone,
          default_time_mode: data.defaultTimeMode,
          workout_enabled: data.enabledSegments.includes('movement'),
          workout_intensity: 'full', // Default to full when movement is enabled
          background_music_enabled: data.backgroundMusicEnabled,
          preferred_music_genre: data.preferredMusicGenre,
          enabled_segments: data.enabledSegments,
          micro_lesson_enabled: data.enabledSegments.includes('micro_lesson'),
          breath_cues_enabled: data.enabledSegments.includes('breath'),
          daily_guide_enabled: true,
          guide_onboarding_done: true,
        }),
      })

      if (response.ok) {
        // Generate today's guide
        await fetch('/api/daily-guide/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeMode: data.defaultTimeMode,
          }),
        })

        router.push('/daily-guide')
      }
    } catch (error) {
      console.error('Onboarding error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleDay = (day: number, type: 'work' | 'class') => {
    const key = type === 'work' ? 'workDays' : 'classDays'
    setData(prev => ({
      ...prev,
      [key]: prev[key].includes(day)
        ? prev[key].filter(d => d !== day)
        : [...prev[key], day].sort(),
    }))
  }

  const renderStep = () => {
    const currentStepTitle = steps[step]?.title

    switch (currentStepTitle) {
      case 'Welcome':
        return (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.03] flex items-center justify-center mx-auto mb-8 animate-float animate-glow-pulse">
              <Compass className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-4">
              Daily Guide
            </h1>
            <p className="text-white leading-relaxed max-w-sm mx-auto">
              Your personalized daily routine - morning intention, movement, quick insights, and evening reflection. Tailored to your schedule and lifestyle.
            </p>
          </div>
        )

      case 'You':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              What describes you best?
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              This helps us personalize your experience
            </p>
            <div className="space-y-3">
              {USER_TYPES.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.value}
                    onClick={() => setData(prev => ({ ...prev, userType: type.value }))}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all
                      ${data.userType === type.value
                        ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.08)]'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${data.userType === type.value ? 'bg-white/10' : 'bg-white/5'}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{type.label}</h3>
                        <p className="text-sm text-white/70 mt-0.5">{type.description}</p>
                      </div>
                      {data.userType === type.value && (
                        <Check className="w-5 h-5 text-white" />
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )

      case 'Work Days':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Which days do you work?
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              We&apos;ll adjust the pace on your days off
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value, 'work')}
                  className={`
                    w-14 h-14 rounded-xl text-sm font-medium transition-all
                    ${data.workDays.includes(day.value)
                      ? 'bg-white/[0.08] text-white border border-white/[0.15] shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                      : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )

      case 'Class Days':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Which days do you have classes?
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              We&apos;ll prepare you for class days differently
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {DAYS.map(day => (
                <button
                  key={day.value}
                  onClick={() => toggleDay(day.value, 'class')}
                  className={`
                    w-14 h-14 rounded-xl text-sm font-medium transition-all
                    ${data.classDays.includes(day.value)
                      ? 'bg-white/[0.08] text-white border border-white/[0.15] shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                      : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  {day.label}
                </button>
              ))}
            </div>
          </div>
        )

      case 'Schedule':
        if (data.userType === 'student') {
          return (
            <div>
              <h2 className="text-xl font-semibold text-white mb-2 text-center">
                Your schedule
              </h2>
              <p className="text-white/70 text-sm mb-8 text-center">
                This helps us time your sessions
              </p>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-white mb-2">
                    Wake time
                  </label>
                  <input
                    type="time"
                    value={data.wakeTime}
                    onChange={(e) => setData(prev => ({ ...prev, wakeTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white mb-2">
                      Classes start
                    </label>
                    <input
                      type="time"
                      value={data.classStartTime}
                      onChange={(e) => setData(prev => ({ ...prev, classStartTime: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white mb-2">
                      Classes end
                    </label>
                    <input
                      type="time"
                      value={data.classEndTime}
                      onChange={(e) => setData(prev => ({ ...prev, classEndTime: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white mb-2">
                      Study starts
                    </label>
                    <input
                      type="time"
                      value={data.studyStartTime}
                      onChange={(e) => setData(prev => ({ ...prev, studyStartTime: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white mb-2">
                      Study ends
                    </label>
                    <input
                      type="time"
                      value={data.studyEndTime}
                      onChange={(e) => setData(prev => ({ ...prev, studyEndTime: e.target.value }))}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        }
        // Professional schedule
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Your schedule
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              This helps us time your checkpoints
            </p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-white mb-2">
                  Wake time
                </label>
                <input
                  type="time"
                  value={data.wakeTime}
                  onChange={(e) => setData(prev => ({ ...prev, wakeTime: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white mb-2">
                    Work starts
                  </label>
                  <input
                    type="time"
                    value={data.workStartTime}
                    onChange={(e) => setData(prev => ({ ...prev, workStartTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-2">
                    Work ends
                  </label>
                  <input
                    type="time"
                    value={data.workEndTime}
                    onChange={(e) => setData(prev => ({ ...prev, workEndTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'Work Hours':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Work hours
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              Your typical work schedule
            </p>
            <div className="space-y-6">
              <div>
                <label className="block text-sm text-white mb-2">
                  Wake time
                </label>
                <input
                  type="time"
                  value={data.wakeTime}
                  onChange={(e) => setData(prev => ({ ...prev, wakeTime: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white mb-2">
                    Work starts
                  </label>
                  <input
                    type="time"
                    value={data.workStartTime}
                    onChange={(e) => setData(prev => ({ ...prev, workStartTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-2">
                    Work ends
                  </label>
                  <input
                    type="time"
                    value={data.workEndTime}
                    onChange={(e) => setData(prev => ({ ...prev, workEndTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'Study Time':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Study schedule
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              When do you typically study?
            </p>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white mb-2">
                    Classes start
                  </label>
                  <input
                    type="time"
                    value={data.classStartTime}
                    onChange={(e) => setData(prev => ({ ...prev, classStartTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-2">
                    Classes end
                  </label>
                  <input
                    type="time"
                    value={data.classEndTime}
                    onChange={(e) => setData(prev => ({ ...prev, classEndTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white mb-2">
                    Study starts
                  </label>
                  <input
                    type="time"
                    value={data.studyStartTime}
                    onChange={(e) => setData(prev => ({ ...prev, studyStartTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white mb-2">
                    Study ends
                  </label>
                  <input
                    type="time"
                    value={data.studyEndTime}
                    onChange={(e) => setData(prev => ({ ...prev, studyEndTime: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-white/20"
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 'Time':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              How much time?
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              Your default morning session length
            </p>
            <div className="space-y-3">
              {TIME_MODES.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => setData(prev => ({ ...prev, defaultTimeMode: mode.value }))}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all
                    ${data.defaultTimeMode === mode.value
                      ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.08)]'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{mode.label}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${data.defaultTimeMode === mode.value ? 'bg-white/[0.08] text-white' : 'bg-white/10 text-white/70'}`}>
                          {mode.duration}
                        </span>
                      </div>
                      <p className="text-sm text-white/70 mt-1">{mode.description}</p>
                    </div>
                    {data.defaultTimeMode === mode.value && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-white/50 text-xs mt-4 text-center">
              You can change this each morning
            </p>
          </div>
        )

      case 'Segments':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Customize your flow
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              Choose which segments to include
            </p>
            <div className="space-y-3">
              {SEGMENT_OPTIONS.map(segment => {
                const Icon = segment.icon
                const isEnabled = data.enabledSegments.includes(segment.id)
                const isRequired = segment.required

                return (
                  <button
                    key={segment.id}
                    onClick={() => {
                      if (isRequired) return // Can't disable required segments
                      setData(prev => ({
                        ...prev,
                        enabledSegments: isEnabled
                          ? prev.enabledSegments.filter(s => s !== segment.id)
                          : [...prev.enabledSegments, segment.id],
                      }))
                    }}
                    disabled={isRequired}
                    className={`
                      w-full p-4 rounded-xl text-left transition-all
                      ${isEnabled
                        ? 'bg-white/[0.08] border border-white/[0.15]'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }
                      ${isRequired ? 'cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${isEnabled ? 'bg-white/10' : 'bg-white/5'}`}>
                        <Icon className={`w-5 h-5 ${isEnabled ? 'text-white' : 'text-white/50'}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${isEnabled ? 'text-white' : 'text-white/60'}`}>
                            {segment.label}
                          </h3>
                          {isRequired && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-white/50">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-white/60 mt-0.5">{segment.description}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isEnabled
                          ? 'bg-white border-white'
                          : 'border-white/30'
                      }`}>
                        {isEnabled && <Check className="w-3.5 h-3.5 text-black" />}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-white/50 text-xs mt-4 text-center">
              You can change this anytime in settings
            </p>
          </div>
        )

      case 'Tone':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Choose your tone
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              How should your guide speak to you?
            </p>
            <div className="space-y-3">
              {TONES.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => setData(prev => ({ ...prev, guideTone: tone.value }))}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all
                    ${data.guideTone === tone.value
                      ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.08)]'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{tone.label}</h3>
                      <p className="text-sm text-white/70 mt-1">{tone.description}</p>
                    </div>
                    {data.guideTone === tone.value && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 'Music':
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2 text-center">
              Background music
            </h2>
            <p className="text-white/70 text-sm mb-8 text-center">
              Optional music during your sessions
            </p>

            {/* Toggle */}
            <div className="mb-6">
              <button
                onClick={() => setData(prev => ({ ...prev, backgroundMusicEnabled: !prev.backgroundMusicEnabled }))}
                className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                  data.backgroundMusicEnabled
                    ? 'bg-white/[0.08] border border-white/[0.15]'
                    : 'bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-white" />
                  <span className="text-white font-medium">Enable music</span>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all ${data.backgroundMusicEnabled ? 'bg-white/30' : 'bg-white/10'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${data.backgroundMusicEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>

            {/* Genre selection */}
            {data.backgroundMusicEnabled && (
              <div className="space-y-2">
                <p className="text-white/60 text-xs mb-3">Preferred genre</p>
                <div className="grid grid-cols-2 gap-2">
                  {MUSIC_GENRES.map(genre => (
                    <button
                      key={genre.value || 'rotation'}
                      onClick={() => setData(prev => ({ ...prev, preferredMusicGenre: genre.value }))}
                      className={`p-3 rounded-xl text-left transition-all ${
                        data.preferredMusicGenre === genre.value
                          ? 'bg-white/[0.08] border border-white/[0.15]'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <h4 className="text-sm font-medium text-white">{genre.label}</h4>
                      <p className="text-xs text-white/60 mt-0.5">{genre.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'Complete':
        return (
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.03] flex items-center justify-center mx-auto mb-8 animate-float animate-glow-pulse">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-semibold text-white mb-4">
              You&apos;re all set!
            </h2>
            <p className="text-white leading-relaxed max-w-sm mx-auto mb-8">
              Your Daily Guide is ready. Start your morning, move, learn, breathe, and close your day with intention.
            </p>
            <div className="bg-white/5 rounded-xl p-4 text-left max-w-sm mx-auto">
              <h3 className="text-sm font-medium text-white mb-3">Your daily flow</h3>
              <ul className="space-y-2 text-sm text-white">
                {SEGMENT_OPTIONS.filter(s => data.enabledSegments.includes(s.id)).map(segment => {
                  const Icon = segment.icon
                  return (
                    <li key={segment.id} className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-white/60" />
                      {segment.label}
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/70">
                <div className="flex items-center gap-2 mb-1">
                  {data.userType === 'professional' && <Briefcase className="w-3 h-3" />}
                  {data.userType === 'student' && <GraduationCap className="w-3 h-3" />}
                  {data.userType === 'hybrid' && <BookOpen className="w-3 h-3" />}
                  <span className="capitalize">{data.userType}</span>
                </div>
                {data.userType === 'professional' || data.userType === 'hybrid' ? (
                  <div>Work days: {data.workDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}</div>
                ) : null}
                {data.userType === 'student' || data.userType === 'hybrid' ? (
                  <div>Class days: {data.classDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}</div>
                ) : null}
                <div>Tone: {TONES.find(t => t.value === data.guideTone)?.label}</div>
                {data.backgroundMusicEnabled && (
                  <div>Music: {data.preferredMusicGenre ? MUSIC_GENRES.find(g => g.value === data.preferredMusicGenre)?.label : 'Daily rotation'}</div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Progress */}
      <div className="p-4">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all ${
                i <= step ? 'w-6 bg-white/40' : 'w-6 bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-32">
        <div className="w-full max-w-sm">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-20 left-0 right-0 p-6 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f] to-transparent">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-white hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50 shadow-[0_0_25px_rgba(255,255,255,0.3)]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Start Daily Guide
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
