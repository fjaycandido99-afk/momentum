/**
 * Planetary Transits — simplified orbital calculations and per-sign meanings.
 *
 * Uses J2000.0 epoch (Jan 1 2000 12:00 TT) with mean orbital periods
 * to estimate current zodiac sign for each classical planet.
 * Not astronomy-precise, but suitable for astrology context.
 */

const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

export interface Planet {
  name: string
  symbol: string
  orbitalPeriodDays: number
  j2000LongitudeDeg: number
}

export const PLANETS: Planet[] = [
  { name: 'Sun',     symbol: '☉', orbitalPeriodDays: 365.25,   j2000LongitudeDeg: 280.46 },
  { name: 'Moon',    symbol: '☽', orbitalPeriodDays: 27.32,    j2000LongitudeDeg: 218.32 },
  { name: 'Mercury', symbol: '☿', orbitalPeriodDays: 87.97,    j2000LongitudeDeg: 252.25 },
  { name: 'Venus',   symbol: '♀', orbitalPeriodDays: 224.70,   j2000LongitudeDeg: 181.98 },
  { name: 'Mars',    symbol: '♂', orbitalPeriodDays: 686.97,   j2000LongitudeDeg: 355.45 },
  { name: 'Jupiter', symbol: '♃', orbitalPeriodDays: 4332.59,  j2000LongitudeDeg: 34.35  },
  { name: 'Saturn',  symbol: '♄', orbitalPeriodDays: 10759.22, j2000LongitudeDeg: 49.94  },
]

/** J2000.0 epoch: Jan 1, 2000 12:00 UTC */
const J2000_EPOCH = Date.UTC(2000, 0, 1, 12, 0, 0)

/**
 * Get the current zodiac sign index (0-11) for a planet.
 */
function getCurrentSignIndex(planet: Planet): number {
  const now = Date.now()
  const daysSinceEpoch = (now - J2000_EPOCH) / (1000 * 60 * 60 * 24)
  const degreesTraversed = (daysSinceEpoch / planet.orbitalPeriodDays) * 360
  const currentLongitude = (planet.j2000LongitudeDeg + degreesTraversed) % 360
  const normalized = ((currentLongitude % 360) + 360) % 360
  return Math.floor(normalized / 30)
}

/**
 * Get the current zodiac sign name for a planet.
 */
export function getCurrentPlanetSign(planet: Planet): string {
  return SIGN_NAMES[getCurrentSignIndex(planet)]
}

/**
 * Short transit meaning for each planet in each sign.
 * 7 planets x 12 signs = 84 entries.
 */
export const TRANSIT_MEANINGS: Record<string, Record<string, string>> = {
  Sun: {
    Aries: 'Bold energy fuels your identity — time to lead.',
    Taurus: 'Focus on comfort, values, and steady progress.',
    Gemini: 'Curiosity peaks — explore, communicate, connect.',
    Cancer: 'Home and emotions take center stage.',
    Leo: 'Creative confidence radiates from within.',
    Virgo: 'Details matter — refine your daily routines.',
    Libra: 'Seek harmony in relationships and aesthetics.',
    Scorpio: 'Deep transformation and inner power emerge.',
    Sagittarius: 'Adventure and expanding horizons call to you.',
    Capricorn: 'Discipline and ambition drive your path.',
    Aquarius: 'Innovate and connect with your community.',
    Pisces: 'Intuition and compassion guide your steps.',
  },
  Moon: {
    Aries: 'Emotions run hot — channel them into action.',
    Taurus: 'Emotional comfort comes through stability.',
    Gemini: 'Feelings shift quickly — stay mentally flexible.',
    Cancer: 'Deep emotional sensitivity is heightened.',
    Leo: 'Express your feelings with dramatic flair.',
    Virgo: 'Process emotions through organization and care.',
    Libra: 'Seek emotional balance in partnerships.',
    Scorpio: 'Intense feelings bring transformative insight.',
    Sagittarius: 'Emotional freedom and optimism uplift you.',
    Capricorn: 'Grounded emotions support practical goals.',
    Aquarius: 'Detached perspective helps you see clearly.',
    Pisces: 'Dreams and intuition are especially vivid.',
  },
  Mercury: {
    Aries: 'Quick thinking and direct communication prevail.',
    Taurus: 'Thoughtful, deliberate decisions serve you well.',
    Gemini: 'Mental agility is at its peak — learn everything.',
    Cancer: 'Intuitive communication deepens connections.',
    Leo: 'Speak with confidence and creative expression.',
    Virgo: 'Analytical precision sharpens your thinking.',
    Libra: 'Diplomatic words smooth every conversation.',
    Scorpio: 'Penetrating insight reveals hidden truths.',
    Sagittarius: 'Big-picture thinking inspires new plans.',
    Capricorn: 'Strategic, focused communication wins the day.',
    Aquarius: 'Innovative ideas flow freely — share them.',
    Pisces: 'Poetic expression and empathic listening shine.',
  },
  Venus: {
    Aries: 'Passionate, spontaneous love energy ignites.',
    Taurus: 'Sensual pleasures and loyal affection deepen.',
    Gemini: 'Flirtatious charm and social connections bloom.',
    Cancer: 'Nurturing love and domestic harmony grow.',
    Leo: 'Romantic grand gestures and warmth abound.',
    Virgo: 'Love expressed through acts of service.',
    Libra: 'Romance, beauty, and partnership flourish.',
    Scorpio: 'Deep, intense connections magnetize you.',
    Sagittarius: 'Adventurous love and joyful connections.',
    Capricorn: 'Committed, lasting bonds are your focus.',
    Aquarius: 'Unconventional connections spark excitement.',
    Pisces: 'Dreamy, compassionate love fills your heart.',
  },
  Mars: {
    Aries: 'Raw energy and drive are at maximum power.',
    Taurus: 'Persistent effort yields tangible results.',
    Gemini: 'Mental energy fuels multiple pursuits.',
    Cancer: 'Protective instincts motivate your actions.',
    Leo: 'Courageous action and creative drive soar.',
    Virgo: 'Precise, productive energy gets things done.',
    Libra: 'Assert yourself diplomatically in conflicts.',
    Scorpio: 'Focused determination cuts through obstacles.',
    Sagittarius: 'Adventurous energy pushes boundaries.',
    Capricorn: 'Disciplined action builds lasting achievement.',
    Aquarius: 'Revolutionary drive challenges the status quo.',
    Pisces: 'Compassionate action inspired by imagination.',
  },
  Jupiter: {
    Aries: 'Expansion through bold, independent ventures.',
    Taurus: 'Growth comes through financial wisdom.',
    Gemini: 'Luck in communication and learning new skills.',
    Cancer: 'Abundance flows through family and home.',
    Leo: 'Generous spirit attracts creative opportunities.',
    Virgo: 'Growth through service and health improvement.',
    Libra: 'Expansion in partnerships and legal matters.',
    Scorpio: 'Deep transformation brings hidden blessings.',
    Sagittarius: 'Maximum expansion — travel, learn, explore.',
    Capricorn: 'Structured growth and professional success.',
    Aquarius: 'Innovation and community bring opportunities.',
    Pisces: 'Spiritual growth and compassion expand your world.',
  },
  Saturn: {
    Aries: 'Lessons in patience and disciplined leadership.',
    Taurus: 'Building long-term financial security.',
    Gemini: 'Structuring your communication and learning.',
    Cancer: 'Strengthening emotional boundaries and home.',
    Leo: 'Mastering self-expression with maturity.',
    Virgo: 'Perfecting routines through disciplined effort.',
    Libra: 'Commitment and responsibility in relationships.',
    Scorpio: 'Deep restructuring of power and resources.',
    Sagittarius: 'Grounding your vision with realistic plans.',
    Capricorn: 'Peak discipline — build your legacy now.',
    Aquarius: 'Restructuring your role in community and society.',
    Pisces: 'Grounding spiritual wisdom into daily practice.',
  },
}

export interface TransitInfo {
  planet: string
  symbol: string
  currentSign: string
  meaning: string
  isInUserSign: boolean
}

/**
 * Get current planetary transits with personalized meanings.
 */
export function getTransitsForSign(sign: string): TransitInfo[] {
  // Capitalize sign for display matching
  const signLabel = sign.charAt(0).toUpperCase() + sign.slice(1).toLowerCase()

  return PLANETS.map(planet => {
    const currentSign = getCurrentPlanetSign(planet)
    const meaning = TRANSIT_MEANINGS[planet.name]?.[currentSign] || 'Cosmic energy is in motion.'

    return {
      planet: planet.name,
      symbol: planet.symbol,
      currentSign,
      meaning,
      isInUserSign: currentSign === signLabel,
    }
  })
}
