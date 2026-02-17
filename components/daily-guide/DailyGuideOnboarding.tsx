'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Briefcase,
  GraduationCap,
  Clock,
  Mic2,
  Sparkles,
  Layers,
} from 'lucide-react'
import type { GuideTone } from '@/lib/ai/daily-guide-prompts'
import { BACKGROUND_ANIMATIONS, setPreferredAnimation } from '@/components/player/DailyBackground'
import { ONBOARDING_COPY } from '@/lib/onboarding-copy'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { SuccessAnimation } from '@/components/ui/SuccessAnimation'

type UserType = 'professional' | 'student'

interface OnboardingData {
  userType: UserType
  workDays: number[]
  classDays: number[]
  wakeTime: string
  guideTone: GuideTone
}

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

const TONES: { value: GuideTone; label: string; description: string }[] = [
  {
    value: 'calm',
    label: ONBOARDING_COPY.step1.tones.calm.label,
    description: ONBOARDING_COPY.step1.tones.calm.description,
  },
  {
    value: 'direct',
    label: ONBOARDING_COPY.step1.tones.direct.label,
    description: ONBOARDING_COPY.step1.tones.direct.description,
  },
  {
    value: 'neutral',
    label: ONBOARDING_COPY.step1.tones.neutral.label,
    description: ONBOARDING_COPY.step1.tones.neutral.description,
  },
]

export function DailyGuideOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [animating, setAnimating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [data, setData] = useState<OnboardingData>({
    userType: 'professional',
    workDays: [1, 2, 3, 4, 5],
    classDays: [1, 2, 3, 4, 5],
    wakeTime: '07:00',
    guideTone: 'calm',
  })
  const [selectedAnimation, setSelectedAnimation] = useState<string | null>(null)
  const mindsetCtx = useMindsetOptional()

  // Filter backgrounds to the user's mindset pool
  const filteredAnimations = mindsetCtx?.backgroundPool
    ? BACKGROUND_ANIMATIONS.filter(a => mindsetCtx.backgroundPool.includes(a.id))
    : BACKGROUND_ANIMATIONS

  const totalSteps = 4

  const handleNext = () => {
    if (step < totalSteps - 1 && !animating) {
      setDirection('forward')
      setAnimating(true)
      setTimeout(() => {
        setStep(step + 1)
        setAnimating(false)
      }, 250)
    }
  }

  const handleBack = () => {
    if (step > 0 && !animating) {
      setDirection('backward')
      setAnimating(true)
      setTimeout(() => {
        setStep(step - 1)
        setAnimating(false)
      }, 250)
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

  const handleComplete = async () => {
    setIsSubmitting(true)
    try {
      // Smart defaults applied here
      const response = await fetch('/api/daily-guide/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_type: data.userType,
          work_days: data.workDays,
          wake_time: data.wakeTime,
          // Smart defaults for work/class hours
          work_start_time: '09:00',
          work_end_time: '17:00',
          class_days: data.classDays,
          class_start_time: '08:00',
          class_end_time: '15:00',
          study_start_time: '18:00',
          study_end_time: '21:00',
          // User-selected tone
          guide_tone: data.guideTone,
          // Smart defaults
          default_time_mode: 'normal',
          workout_enabled: true,
          workout_intensity: 'full',
          background_music_enabled: true,
          preferred_music_genre: null, // Daily rotation
          enabled_segments: ['morning_prime', 'movement', 'micro_lesson', 'breath', 'day_close'],
          micro_lesson_enabled: true,
          breath_cues_enabled: true,
          daily_guide_enabled: true,
          // Skip BOTH onboarding flows
          guide_onboarding_done: true,
          theme_onboarding_done: true,
        }),
      })

      if (response.ok) {
        // Save animation preference to localStorage
        setPreferredAnimation(selectedAnimation)

        // Generate today's guide
        await fetch('/api/daily-guide/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeMode: 'normal',
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

  const renderStep = () => {
    switch (step) {
      // Step 0: Design Your Day
      case 0:
        return (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1 text-center">
              {ONBOARDING_COPY.step0.title}
            </h2>
            <p className="text-white/75 text-sm mb-8 text-center">
              {ONBOARDING_COPY.step0.subtitle}
            </p>

            {/* User Type */}
            <div className="space-y-3 mb-8">
              <p className="text-label px-1">I am a</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'professional' as UserType, label: 'Professional', icon: Briefcase, desc: 'Working with set hours' },
                  { value: 'student' as UserType, label: 'Student', icon: GraduationCap, desc: 'In school or university' },
                ]).map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.value}
                      onClick={() => setData(prev => ({ ...prev, userType: type.value }))}
                      className={`
                        p-4 rounded-xl text-center transition-all press-scale
                        ${data.userType === type.value
                          ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.08)] glow-sm'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                        }
                      `}
                    >
                      <div className={`p-2.5 rounded-xl mx-auto w-fit mb-2 ${data.userType === type.value ? 'bg-white/10' : 'bg-white/5'}`}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="font-medium text-white text-sm">{type.label}</h3>
                      <p className="text-xs text-white/95 mt-0.5">{type.desc}</p>
                    </button>
                  )
                })}
              </div>
              {/* Why this matters micro-copy */}
              <p className="text-xs text-white/60 text-center italic px-4">
                {ONBOARDING_COPY.step0.whyMatters[data.userType]}
              </p>
            </div>

            {/* Days Toggle */}
            <div className="mb-8">
              <p className="text-label px-1 mb-3">
                {data.userType === 'professional' ? 'Work days' : 'Class days'}
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {DAYS.map(day => {
                  const dayList = data.userType === 'professional' ? data.workDays : data.classDays
                  const toggleType = data.userType === 'professional' ? 'work' : 'class'
                  return (
                    <button
                      key={day.value}
                      onClick={() => toggleDay(day.value, toggleType)}
                      className={`
                        w-12 h-12 rounded-xl text-sm font-medium transition-all press-scale
                        ${dayList.includes(day.value)
                          ? 'bg-white/[0.08] text-white border border-white/[0.15] shadow-[0_0_15px_rgba(255,255,255,0.1)] glow-sm'
                          : 'bg-white/5 text-white/95 border border-transparent hover:bg-white/10'
                        }
                      `}
                    >
                      {day.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Wake Time */}
            <div>
              <p className="text-label px-1 mb-3">Wake time</p>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/15">
                <Clock className="w-5 h-5 text-white/95" />
                <input
                  type="time"
                  value={data.wakeTime}
                  onChange={(e) => setData(prev => ({ ...prev, wakeTime: e.target.value }))}
                  className="flex-1 bg-transparent text-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        )

      // Step 1: Choose Your Guide
      case 1:
        return (
          <div>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.03] flex items-center justify-center mx-auto mb-6">
                <Mic2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">
                {ONBOARDING_COPY.step1.title}
              </h2>
              <p className="text-white/75 text-sm">
                {ONBOARDING_COPY.step1.subtitle}
              </p>
            </div>
            <div className="space-y-3">
              {TONES.map(tone => (
                <button
                  key={tone.value}
                  onClick={() => setData(prev => ({ ...prev, guideTone: tone.value }))}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all press-scale
                    ${data.guideTone === tone.value
                      ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_20px_rgba(255,255,255,0.08)] glow-sm'
                      : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-white">{tone.label}</h3>
                      <p className="text-sm text-white/75 mt-1">{tone.description}</p>
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

      // Step 2: Set Your Scene
      case 2:
        return (
          <div>
            <div className="text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/[0.08] to-white/[0.03] flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-1">
                {ONBOARDING_COPY.step2.title}
              </h2>
              <p className="text-white/75 text-sm">
                {ONBOARDING_COPY.step2.subtitle}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Daily Rotation option */}
              <button
                onClick={() => setSelectedAnimation(null)}
                className={`p-2 rounded-xl transition-all press-scale ${
                  selectedAnimation === null
                    ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_15px_rgba(255,255,255,0.08)] glow-sm'
                    : 'bg-white/5 border border-transparent hover:bg-white/10'
                }`}
              >
                <div className="aspect-[3/2] rounded-lg overflow-hidden bg-black/50 mb-2 relative flex items-center justify-center">
                  <div className="text-center">
                    <Sparkles className="w-5 h-5 text-white/75 mx-auto mb-1" />
                    <span className="text-[10px] text-white/70">Auto</span>
                  </div>
                </div>
                <p className="text-xs font-medium text-white text-center">Daily Rotation</p>
                <p className="text-[10px] text-white/95 text-center">Changes each day</p>
              </button>

              {/* Individual animation options with live preview */}
              {filteredAnimations.map(anim => {
                const AnimComponent = anim.component
                return (
                  <button
                    key={anim.id}
                    onClick={() => setSelectedAnimation(anim.id)}
                    className={`p-2 rounded-xl transition-all press-scale ${
                      selectedAnimation === anim.id
                        ? 'bg-white/[0.08] border border-white/[0.15] shadow-[0_0_15px_rgba(255,255,255,0.08)] glow-sm'
                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    <div className="aspect-[3/2] rounded-lg overflow-hidden bg-black/50 mb-2 relative">
                      <AnimComponent animate topOffset={0} className="absolute inset-0" />
                    </div>
                    <p className="text-xs font-medium text-white text-center">{anim.name}</p>
                    <p className="text-[10px] text-white/95 text-center">{anim.description}</p>
                  </button>
                )
              })}
            </div>
          </div>
        )

      // Step 3: You're Ready
      case 3:
        return (
          <div className="text-center">
            {/* Success Animation */}
            <div className="mb-6">
              <SuccessAnimation />
            </div>

            <h2 className="text-2xl font-semibold text-white mb-3">
              {ONBOARDING_COPY.step3.title}
            </h2>

            <p className="text-white/75 text-sm leading-relaxed max-w-sm mx-auto mb-4">
              {ONBOARDING_COPY.step3.affirmation}
            </p>

            <div className="glass rounded-xl p-4 text-left max-w-sm mx-auto glow-sm">
              <h3 className="text-sm font-medium text-white mb-3">Your setup</h3>
              <div className="space-y-2 text-sm text-white/95">
                <div className="flex items-center gap-2">
                  {data.userType === 'professional' ? (
                    <Briefcase className="w-3.5 h-3.5 text-white/95" />
                  ) : (
                    <GraduationCap className="w-3.5 h-3.5 text-white/95" />
                  )}
                  <span className="capitalize">{data.userType}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-white/95" />
                  <span>
                    {data.userType === 'professional' ? 'Work' : 'Class'}: {(data.userType === 'professional' ? data.workDays : data.classDays).map(d => DAYS.find(day => day.value === d)?.label).join(', ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mic2 className="w-3.5 h-3.5 text-white/95" />
                  <span>Tone: {TONES.find(t => t.value === data.guideTone)?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-white/95" />
                  <span>Background: {selectedAnimation ? filteredAnimations.find(a => a.id === selectedAnimation)?.name : 'Daily Rotation'}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-white/15 text-xs text-white/95">
                Wake: {data.wakeTime} &middot; All modules on
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Progress */}
      <div className="p-4">
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-white/60 animate-dot-pulse' : i < step ? 'w-8 bg-white/40' : 'w-8 bg-white/10'
              }`}
            />
          ))}
        </div>
        {/* Animated progress bar */}
        <div className="mt-2 mx-auto max-w-[120px] h-0.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-white/30 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto px-6 pb-32">
        <div
          key={step}
          className={`w-full max-w-sm my-auto ${animating ? 'animate-slide-down-exit' : 'animate-slide-up-enter'}`}
        >
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-8 bg-gradient-to-t from-black from-60% to-transparent">
        <div className="flex items-center justify-between max-w-sm mx-auto">
          {step > 0 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-white hover:text-white transition-colors press-scale"
            >
              <ChevronLeft className="w-5 h-5" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps - 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors press-scale"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black hover:bg-white/90 transition-colors disabled:opacity-50 cta-glow-pulse press-scale"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  {ONBOARDING_COPY.step3.cta}
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
