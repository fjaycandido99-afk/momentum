import type { DayType, GuideSegment } from '../ai/daily-guide-prompts'

export type { DayType, GuideSegment }

export interface UserSchedule {
  workDays: number[] // 0=Sun, 1=Mon, ..., 6=Sat
  workStartTime?: string // "09:00"
  workEndTime?: string // "17:00"
  wakeTime?: string // "07:00"
}

export function getDayType(
  date: Date,
  schedule: UserSchedule,
  isRecoveryOverride: boolean = false
): DayType {
  if (isRecoveryOverride) {
    return 'recovery'
  }

  const dayOfWeek = date.getDay() // 0=Sun, 1=Mon, ..., 6=Sat
  const isWorkDay = schedule.workDays.includes(dayOfWeek)

  return isWorkDay ? 'work' : 'off'
}

export function getDateString(date: Date): string {
  return date.toISOString().split('T')[0] // "2025-01-21"
}

export function parseTimeString(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours, minutes }
}

export function getCurrentSegment(
  now: Date,
  schedule: UserSchedule
): GuideSegment | null {
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  // Default times if not set
  const wakeTime = schedule.wakeTime ? parseTimeString(schedule.wakeTime) : { hours: 7, minutes: 0 }
  const workStart = schedule.workStartTime ? parseTimeString(schedule.workStartTime) : { hours: 9, minutes: 0 }
  const workEnd = schedule.workEndTime ? parseTimeString(schedule.workEndTime) : { hours: 17, minutes: 0 }

  const wakeMinutes = wakeTime.hours * 60 + wakeTime.minutes
  const workStartMinutes = workStart.hours * 60 + workStart.minutes
  const workEndMinutes = workEnd.hours * 60 + workEnd.minutes

  // Morning: from wake time to 2 hours after wake
  const morningEnd = wakeMinutes + 120
  if (currentTime >= wakeMinutes && currentTime < morningEnd) {
    return 'morning'
  }

  // Midday: around lunch (12:00 - 14:00)
  const middayStart = 12 * 60
  const middayEnd = 14 * 60
  if (currentTime >= middayStart && currentTime < middayEnd) {
    return 'midday'
  }

  // Afternoon: 14:00 until work end or 17:00
  const afternoonEnd = Math.max(workEndMinutes, 17 * 60)
  if (currentTime >= middayEnd && currentTime < afternoonEnd) {
    return 'afternoon'
  }

  // Evening: from work end until 22:00
  const eveningEnd = 22 * 60
  if (currentTime >= afternoonEnd && currentTime < eveningEnd) {
    return 'evening'
  }

  return null
}

export function getSegmentAvailability(
  now: Date,
  schedule: UserSchedule
): Partial<Record<GuideSegment, { available: boolean; time: string }>> {
  const wakeTime = schedule.wakeTime || '07:00'
  const workEnd = schedule.workEndTime || '17:00'

  const { hours: wakeHours, minutes: wakeMinutes } = parseTimeString(wakeTime)
  const { hours: workEndHours } = parseTimeString(workEnd)

  // Morning available from wake time
  const morningTime = wakeTime

  // Midday available at 12:30
  const middayTime = '12:30'

  // Afternoon available at 15:00
  const afternoonTime = '15:00'

  // Evening available at work end or 18:00
  const eveningHour = Math.max(workEndHours, 18)
  const eveningTime = `${eveningHour.toString().padStart(2, '0')}:00`

  const currentTime = now.getHours() * 60 + now.getMinutes()

  return {
    morning: {
      available: currentTime >= wakeHours * 60 + wakeMinutes,
      time: morningTime,
    },
    midday: {
      available: currentTime >= 12 * 60 + 30,
      time: middayTime,
    },
    afternoon: {
      available: currentTime >= 15 * 60,
      time: afternoonTime,
    },
    evening: {
      available: currentTime >= eveningHour * 60,
      time: eveningTime,
    },
  }
}

export function formatSegmentTime(segment: GuideSegment, schedule: UserSchedule): string {
  const availability = getSegmentAvailability(new Date(), schedule)
  const segmentAvail = availability[segment]

  // Only time-of-day segments have availability data
  if (!segmentAvail) {
    return ''
  }

  const time = segmentAvail.time

  const { hours, minutes } = parseTimeString(time)
  const period = hours >= 12 ? 'pm' : 'am'
  const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours
  const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : ''

  return `${displayHours}${displayMinutes}${period}`
}

export function getFormattedDate(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  const dayName = days[date.getDay()]
  const monthName = months[date.getMonth()]
  const dayNum = date.getDate()

  return `${dayName}, ${monthName} ${dayNum}`
}
