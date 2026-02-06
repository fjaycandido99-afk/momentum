/**
 * Shared astrology constants used across the Cosmic Guide page and related components.
 */

export const ZODIAC_SYMBOLS: Record<string, string> = {
  aries: '\u2648',
  taurus: '\u2649',
  gemini: '\u264A',
  cancer: '\u264B',
  leo: '\u264C',
  virgo: '\u264D',
  libra: '\u264E',
  scorpio: '\u264F',
  sagittarius: '\u2650',
  capricorn: '\u2651',
  aquarius: '\u2652',
  pisces: '\u2653',
}

export const ZODIAC_SIGNS = [
  { id: 'aries', label: 'Aries', symbol: '\u2648', dates: 'Mar 21 - Apr 19' },
  { id: 'taurus', label: 'Taurus', symbol: '\u2649', dates: 'Apr 20 - May 20' },
  { id: 'gemini', label: 'Gemini', symbol: '\u264A', dates: 'May 21 - Jun 20' },
  { id: 'cancer', label: 'Cancer', symbol: '\u264B', dates: 'Jun 21 - Jul 22' },
  { id: 'leo', label: 'Leo', symbol: '\u264C', dates: 'Jul 23 - Aug 22' },
  { id: 'virgo', label: 'Virgo', symbol: '\u264D', dates: 'Aug 23 - Sep 22' },
  { id: 'libra', label: 'Libra', symbol: '\u264E', dates: 'Sep 23 - Oct 22' },
  { id: 'scorpio', label: 'Scorpio', symbol: '\u264F', dates: 'Oct 23 - Nov 21' },
  { id: 'sagittarius', label: 'Sagittarius', symbol: '\u2650', dates: 'Nov 22 - Dec 21' },
  { id: 'capricorn', label: 'Capricorn', symbol: '\u2651', dates: 'Dec 22 - Jan 19' },
  { id: 'aquarius', label: 'Aquarius', symbol: '\u2652', dates: 'Jan 20 - Feb 18' },
  { id: 'pisces', label: 'Pisces', symbol: '\u2653', dates: 'Feb 19 - Mar 20' },
] as const

export const ELEMENT_COLORS: Record<string, { from: string; to: string; text: string }> = {
  fire: { from: 'from-orange-500/20', to: 'to-red-500/20', text: 'text-orange-400' },
  earth: { from: 'from-emerald-500/20', to: 'to-green-500/20', text: 'text-emerald-400' },
  air: { from: 'from-sky-500/20', to: 'to-cyan-500/20', text: 'text-sky-400' },
  water: { from: 'from-blue-500/20', to: 'to-indigo-500/20', text: 'text-blue-400' },
}

export const ELEMENT_COMPATIBILITY: Record<string, string[]> = {
  fire: ['fire', 'air'],
  earth: ['earth', 'water'],
  air: ['air', 'fire'],
  water: ['water', 'earth'],
}

export const MOON_PHASE_MEANINGS: Record<string, { name: string; meaning: string; energy: string }> = {
  new_moon: {
    name: 'New Moon',
    meaning: 'A time for fresh starts and setting intentions.',
    energy: 'Plant seeds for new goals. Reflect on what you want to manifest.',
  },
  waxing_crescent: {
    name: 'Waxing Crescent',
    meaning: 'Momentum is building. Take small steps forward.',
    energy: 'Nurture your intentions. Stay focused on your vision.',
  },
  first_quarter: {
    name: 'First Quarter',
    meaning: 'Time to take action and make decisions.',
    energy: 'Push through challenges. Commit to your path.',
  },
  waxing_gibbous: {
    name: 'Waxing Gibbous',
    meaning: 'Refine and adjust. Almost there.',
    energy: 'Fine-tune your plans. Trust the process.',
  },
  full_moon: {
    name: 'Full Moon',
    meaning: 'Culmination and illumination. See things clearly.',
    energy: 'Celebrate progress. Release what no longer serves you.',
  },
  waning_gibbous: {
    name: 'Waning Gibbous',
    meaning: 'Share wisdom and give back.',
    energy: 'Express gratitude. Share your gifts with others.',
  },
  last_quarter: {
    name: 'Last Quarter',
    meaning: 'Let go and forgive. Make space.',
    energy: 'Release old patterns. Prepare for renewal.',
  },
  waning_crescent: {
    name: 'Waning Crescent',
    meaning: 'Rest and surrender. The cycle is completing.',
    energy: 'Reflect and recharge. Trust the quiet before the new.',
  },
}
