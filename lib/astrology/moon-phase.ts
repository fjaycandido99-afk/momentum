/**
 * Moon phase calculation utilities.
 *
 * Uses the synodic month algorithm (29.53059 days) with a known
 * new moon reference date (Jan 6, 2000 18:14 UTC).
 */

const SYNODIC_MONTH = 29.53059 // days
const REFERENCE_NEW_MOON = new Date('2000-01-06T18:14:00Z').getTime()

export interface MoonPhaseData {
  phase: string
  phaseName: string
  illumination: number
  age: number // days into cycle
  nextFullMoon: Date
  nextNewMoon: Date
}

/**
 * Calculate the moon's age (days into current cycle) for a given date.
 */
function getMoonAge(date: Date): number {
  const diff = date.getTime() - REFERENCE_NEW_MOON
  const days = diff / (1000 * 60 * 60 * 24)
  const age = days % SYNODIC_MONTH
  return age < 0 ? age + SYNODIC_MONTH : age
}

/**
 * Determine the moon phase name from its age.
 */
function getPhaseFromAge(age: number): string {
  if (age < 1.85) return 'new_moon'
  if (age < 7.38) return 'waxing_crescent'
  if (age < 9.23) return 'first_quarter'
  if (age < 14.77) return 'waxing_gibbous'
  if (age < 16.61) return 'full_moon'
  if (age < 22.15) return 'waning_gibbous'
  if (age < 23.99) return 'last_quarter'
  if (age < 27.68) return 'waning_crescent'
  return 'new_moon'
}

const PHASE_DISPLAY_NAMES: Record<string, string> = {
  new_moon: 'New Moon',
  waxing_crescent: 'Waxing Crescent',
  first_quarter: 'First Quarter',
  waxing_gibbous: 'Waxing Gibbous',
  full_moon: 'Full Moon',
  waning_gibbous: 'Waning Gibbous',
  last_quarter: 'Last Quarter',
  waning_crescent: 'Waning Crescent',
}

/**
 * Calculate illumination percentage from moon age.
 * 0% at new moon, 100% at full moon.
 */
function getIllumination(age: number): number {
  // Cosine curve: 0 at new moon (age=0), 1 at full moon (age=SYNODIC_MONTH/2)
  const fraction = (1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2
  return Math.round(fraction * 100)
}

/**
 * Find the next occurrence of a specific phase age from a given date.
 * targetAge: 0 for new moon, SYNODIC_MONTH/2 for full moon
 */
function getNextPhaseDate(fromDate: Date, targetAge: number): Date {
  const currentAge = getMoonAge(fromDate)
  let daysUntil = targetAge - currentAge
  if (daysUntil <= 0) daysUntil += SYNODIC_MONTH
  return new Date(fromDate.getTime() + daysUntil * 24 * 60 * 60 * 1000)
}

/**
 * Get full moon phase data for a given date (defaults to now).
 */
export function getMoonPhase(date?: Date): MoonPhaseData {
  const d = date || new Date()
  const age = getMoonAge(d)
  const phase = getPhaseFromAge(age)

  return {
    phase,
    phaseName: PHASE_DISPLAY_NAMES[phase],
    illumination: getIllumination(age),
    age,
    nextFullMoon: getNextPhaseDate(d, SYNODIC_MONTH / 2),
    nextNewMoon: getNextPhaseDate(d, 0),
  }
}
