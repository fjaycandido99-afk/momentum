/**
 * Daily Guide Decision Tree
 *
 * Determines what modules and content to show based on:
 * - Day type (work/off/recovery)
 * - User preferences (workout, tone, time mode)
 * - Available time (quick/normal/full)
 * - Energy level (low/normal/high)
 */

export type DayType = 'work' | 'off' | 'recovery'
export type Pace = 'focused' | 'open' | 'gentle'
export type TimeMode = 'quick' | 'normal' | 'full'
export type EnergyLevel = 'low' | 'normal' | 'high'
export type WorkoutIntensity = 'none' | 'light' | 'full'
export type GuideTone = 'calm' | 'direct' | 'neutral'

export type ModuleType =
  | 'morning_prime'
  | 'workout'
  | 'micro_lesson'
  | 'breath'
  | 'day_close'
  | 'checkpoint_1'
  | 'checkpoint_2'
  | 'checkpoint_3'

export interface UserPreferences {
  workDays: number[]
  workStartTime?: string
  workEndTime?: string
  wakeTime?: string
  guideTone: GuideTone
  workoutEnabled: boolean
  workoutIntensity: WorkoutIntensity
  microLessonEnabled: boolean
  breathCuesEnabled: boolean
  defaultTimeMode: TimeMode
}

export interface DayContext {
  date: Date
  dayType: DayType
  pace: Pace
  timeMode: TimeMode
  energyLevel?: EnergyLevel
  isRecoveryOverride: boolean
  wasYesterdayHeavy?: boolean
}

export interface ModuleSelection {
  modules: ModuleType[]
  checkpoints: CheckpointConfig[]
  durations: Record<ModuleType, number>
}

export interface CheckpointConfig {
  id: 'checkpoint_1' | 'checkpoint_2' | 'checkpoint_3'
  name: string
  time: string // "09:00" format
  description: string
}

// Time durations in seconds for each time mode
const TIME_DURATIONS: Record<TimeMode, Record<ModuleType, number>> = {
  quick: {
    morning_prime: 30,
    workout: 180, // 3 min
    micro_lesson: 0, // skip in quick
    breath: 60,
    day_close: 30,
    checkpoint_1: 20,
    checkpoint_2: 20,
    checkpoint_3: 20,
  },
  normal: {
    morning_prime: 60,
    workout: 300, // 5 min
    micro_lesson: 180, // 3 min
    breath: 90,
    day_close: 45,
    checkpoint_1: 30,
    checkpoint_2: 30,
    checkpoint_3: 30,
  },
  full: {
    morning_prime: 90,
    workout: 420, // 7 min
    micro_lesson: 300, // 5 min
    breath: 120,
    day_close: 60,
    checkpoint_1: 45,
    checkpoint_2: 45,
    checkpoint_3: 45,
  },
}

/**
 * Step 1: Classify the day type
 */
export function classifyDayType(
  date: Date,
  preferences: UserPreferences,
  isRecoveryOverride: boolean = false,
  wasYesterdayHeavy: boolean = false
): DayType {
  // Recovery override takes precedence
  if (isRecoveryOverride) {
    return 'recovery'
  }

  // Check if yesterday was heavy and user might need recovery
  // (This would be determined by tracking - for now, explicit override only)
  if (wasYesterdayHeavy && isRecoveryOverride) {
    return 'recovery'
  }

  // Check schedule
  const dayOfWeek = date.getDay()
  const isWorkDay = preferences.workDays.includes(dayOfWeek)

  return isWorkDay ? 'work' : 'off'
}

/**
 * Step 2: Determine pace based on day type
 */
export function determinePace(dayType: DayType): Pace {
  switch (dayType) {
    case 'work':
      return 'focused'
    case 'off':
      return 'open'
    case 'recovery':
      return 'gentle'
  }
}

/**
 * Step 3: Adjust pace based on energy level (optional override)
 */
export function adjustPaceForEnergy(
  basePace: Pace,
  energyLevel?: EnergyLevel
): Pace {
  if (!energyLevel) return basePace

  // Low energy can downgrade pace even on work days
  if (energyLevel === 'low') {
    if (basePace === 'focused') return 'open'
    return 'gentle'
  }

  // High energy can upgrade pace
  if (energyLevel === 'high') {
    if (basePace === 'gentle') return 'open'
    return basePace
  }

  return basePace
}

/**
 * Step 4: Select modules based on preferences and context
 */
export function selectModules(
  dayContext: DayContext,
  preferences: UserPreferences
): ModuleType[] {
  const modules: ModuleType[] = []
  const { dayType, timeMode, pace } = dayContext

  // Always include: Morning Prime + Day Close
  modules.push('morning_prime')

  // Include Workout if:
  // - User enabled workouts AND
  // - (dayType != RECOVERY OR user chose Light intensity)
  if (preferences.workoutEnabled) {
    if (dayType !== 'recovery') {
      modules.push('workout')
    } else if (preferences.workoutIntensity === 'light') {
      modules.push('workout') // Light workout on recovery days
    }
  }

  // Include Micro Lesson if:
  // - timeMode >= normal (not quick) AND
  // - user opted in
  if (timeMode !== 'quick' && preferences.microLessonEnabled) {
    modules.push('micro_lesson')
  }

  // Include Breath Cues if:
  // - workout is active OR
  // - user has breath cues enabled OR
  // - pace is gentle (recovery days)
  if (
    modules.includes('workout') ||
    preferences.breathCuesEnabled ||
    pace === 'gentle'
  ) {
    modules.push('breath')
  }

  // Always include Day Close
  modules.push('day_close')

  return modules
}

/**
 * Step 5: Configure checkpoints based on day type
 */
export function configureCheckpoints(
  dayContext: DayContext,
  preferences: UserPreferences
): CheckpointConfig[] {
  const { dayType } = dayContext
  const workStart = preferences.workStartTime || '09:00'
  const workEnd = preferences.workEndTime || '17:00'

  switch (dayType) {
    case 'work':
      // WORK: 3 checkpoints (pre-work, midday, post-work)
      return [
        {
          id: 'checkpoint_1',
          name: 'Focus Target',
          time: workStart,
          description: 'Set your intention for the work ahead',
        },
        {
          id: 'checkpoint_2',
          name: 'Midday Reset',
          time: '12:30',
          description: 'Quick reset to finish strong',
        },
        {
          id: 'checkpoint_3',
          name: 'Downshift',
          time: workEnd,
          description: 'Transition out of work mode',
        },
      ]

    case 'off':
      // OFF: 2 checkpoints (late morning, evening)
      return [
        {
          id: 'checkpoint_1',
          name: 'Nourish',
          time: '10:30',
          description: 'Do one thing that feeds your soul',
        },
        {
          id: 'checkpoint_2',
          name: 'Close the Loop',
          time: '19:00',
          description: 'Reflect on your day off',
        },
      ]

    case 'recovery':
      // RECOVERY: 1-2 checkpoints (midday + stronger close)
      return [
        {
          id: 'checkpoint_1',
          name: 'Gentle Movement',
          time: '12:00',
          description: 'Breathe and move gently',
        },
        // Stronger day close handled in day_close module
      ]
  }
}

/**
 * Step 6: Get module durations based on time mode
 */
export function getModuleDurations(timeMode: TimeMode): Record<ModuleType, number> {
  return TIME_DURATIONS[timeMode]
}

/**
 * Step 7: Handle skip adaptation
 * If user skips a module, next checkpoint becomes shorter + more supportive
 */
export function adaptForSkip(
  currentModules: ModuleType[],
  skippedModule: ModuleType,
  currentDurations: Record<ModuleType, number>
): { modules: ModuleType[]; durations: Record<ModuleType, number>; toneShift: string } {
  const newDurations = { ...currentDurations }

  // Shorten subsequent checkpoints by 30%
  const checkpoints: ModuleType[] = ['checkpoint_1', 'checkpoint_2', 'checkpoint_3']
  checkpoints.forEach(cp => {
    if (newDurations[cp]) {
      newDurations[cp] = Math.floor(newDurations[cp] * 0.7)
    }
  })

  return {
    modules: currentModules.filter(m => m !== skippedModule),
    durations: newDurations,
    toneShift: 'supportive', // Signal to use more supportive, no-guilt tone
  }
}

/**
 * Step 8: Handle stress trigger
 * Immediately switch to breath module with calmer script
 */
export function handleStressTrigger(): {
  module: ModuleType
  duration: number
  toneOverride: GuideTone
} {
  return {
    module: 'breath',
    duration: 90, // 60-120s breath module
    toneOverride: 'calm', // Override to calm regardless of preference
  }
}

/**
 * Main decision function: Build the complete day plan
 */
export function buildDayPlan(
  date: Date,
  preferences: UserPreferences,
  options: {
    isRecoveryOverride?: boolean
    wasYesterdayHeavy?: boolean
    energyLevel?: EnergyLevel
    timeMode?: TimeMode
  } = {}
): {
  dayContext: DayContext
  modules: ModuleSelection
} {
  const {
    isRecoveryOverride = false,
    wasYesterdayHeavy = false,
    energyLevel,
    timeMode = preferences.defaultTimeMode,
  } = options

  // Step 1: Classify day type
  const dayType = classifyDayType(date, preferences, isRecoveryOverride, wasYesterdayHeavy)

  // Step 2: Determine base pace
  let pace = determinePace(dayType)

  // Step 3: Adjust pace for energy level
  pace = adjustPaceForEnergy(pace, energyLevel)

  const dayContext: DayContext = {
    date,
    dayType,
    pace,
    timeMode,
    energyLevel,
    isRecoveryOverride,
    wasYesterdayHeavy,
  }

  // Step 4: Select modules
  const selectedModules = selectModules(dayContext, preferences)

  // Step 5: Configure checkpoints
  const checkpoints = configureCheckpoints(dayContext, preferences)

  // Add checkpoint modules to selected modules
  checkpoints.forEach(cp => {
    selectedModules.push(cp.id)
  })

  // Step 6: Get durations
  const durations = getModuleDurations(timeMode)

  return {
    dayContext,
    modules: {
      modules: selectedModules,
      checkpoints,
      durations,
    },
  }
}

/**
 * Get tomorrow's preview context
 */
export function getTomorrowPreview(
  tomorrow: Date,
  preferences: UserPreferences
): { dayType: DayType; pace: Pace; message: string } {
  const dayType = classifyDayType(tomorrow, preferences)
  const pace = determinePace(dayType)

  const messages: Record<DayType, string> = {
    work: "Tomorrow is a work day. I've set a focused morning for you.",
    off: "Tomorrow is your day off. A relaxed start awaits.",
    recovery: "Tomorrow is for recovery. Rest well tonight.",
  }

  return {
    dayType,
    pace,
    message: messages[dayType],
  }
}

/**
 * Calculate time estimate for selected modules
 */
export function calculateTotalTime(
  modules: ModuleType[],
  durations: Record<ModuleType, number>
): number {
  return modules.reduce((total, module) => total + (durations[module] || 0), 0)
}

/**
 * Format time estimate for display
 */
export function formatTimeEstimate(seconds: number): string {
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
