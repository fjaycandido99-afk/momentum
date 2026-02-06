/**
 * Pre-written affirmations per zodiac sign.
 * Used as fallback when AI-generated affirmations are unavailable.
 * Each sign has 6 affirmations to rotate through (3 per day, 2 days of unique content).
 */

export const FALLBACK_AFFIRMATIONS: Record<string, string[]> = {
  aries: [
    'I channel my fire into focused action that moves mountains.',
    'My courage is not reckless—it is the universe clearing a path for me.',
    'I lead with my heart, and the world follows.',
    'Every challenge I face becomes fuel for my unstoppable spirit.',
    'I trust my instincts to guide me toward bold new beginnings.',
    'My energy inspires others to find their own inner fire.',
  ],
  taurus: [
    'I am grounded in my worth, and abundance flows to me naturally.',
    'My patience is a superpower that builds lasting foundations.',
    'I deserve comfort, beauty, and the finer things life offers.',
    'I trust the timing of my life and enjoy each moment fully.',
    'My steady presence is a gift to everyone around me.',
    'I release what no longer grows and make room for new blessings.',
  ],
  gemini: [
    'My curiosity opens doors that others don\'t even see.',
    'I communicate my truth with clarity and charm.',
    'Every conversation holds a lesson; I am always learning.',
    'My adaptability is my greatest strength in a changing world.',
    'I embrace all sides of myself with love and acceptance.',
    'My ideas have the power to connect and inspire.',
  ],
  cancer: [
    'My sensitivity is a gift that helps me understand the world deeply.',
    'I create safe spaces wherever I go, starting within myself.',
    'My intuition is my compass—I trust where it leads.',
    'I nurture myself as lovingly as I nurture others.',
    'My emotions are valid messengers guiding me toward growth.',
    'I am both strong and tender, and that is my power.',
  ],
  leo: [
    'I shine my light boldly, giving others permission to do the same.',
    'My creativity flows from an endless wellspring within.',
    'I am worthy of celebration, recognition, and love.',
    'My warmth and generosity create joy wherever I go.',
    'I lead with confidence and compassion in equal measure.',
    'Today, I step fully into my radiant, magnificent self.',
  ],
  virgo: [
    'My attention to detail creates excellence in everything I touch.',
    'I release the need for perfection and embrace beautiful progress.',
    'My analytical mind is a gift that brings clarity to chaos.',
    'I am worthy of the same care and kindness I give others.',
    'Small, consistent steps lead me to extraordinary outcomes.',
    'I trust myself to solve any problem that comes my way.',
  ],
  libra: [
    'I create harmony not by avoiding conflict, but by seeking truth.',
    'My sense of beauty makes the world a more graceful place.',
    'I deserve balanced relationships that honor my needs too.',
    'My ability to see all sides is a gift of deep wisdom.',
    'I make decisions from a place of inner knowing and peace.',
    'I bring elegance and fairness to every situation I enter.',
  ],
  scorpio: [
    'My depth and intensity are forces of transformation.',
    'I release what must die so what is meant to live can flourish.',
    'My intuition pierces through illusion to find the truth.',
    'I embrace my power without fear of my own magnitude.',
    'Every ending I face is a doorway to rebirth.',
    'My emotional depth is a wellspring of strength and wisdom.',
  ],
  sagittarius: [
    'My optimism is contagious and opens doors everywhere I go.',
    'The universe rewards my adventurous spirit with wisdom.',
    'I expand beyond my comfort zone and find freedom there.',
    'My honesty and humor make the world a brighter place.',
    'Every experience is a teacher, and I am an eager student.',
    'I trust that my journey is leading me somewhere extraordinary.',
  ],
  capricorn: [
    'My discipline and vision are building something remarkable.',
    'I climb my mountains one steady step at a time.',
    'I am worthy of rest and celebration, not just achievement.',
    'My ambition serves a greater purpose beyond myself.',
    'I trust the structure I have built to support my dreams.',
    'Today, I honor both my drive and my need for balance.',
  ],
  aquarius: [
    'My unique perspective is exactly what the world needs.',
    'I innovate not to be different, but to make a difference.',
    'My independence is a strength that inspires others.',
    'I connect with humanity while honoring my individuality.',
    'The future I envision is already taking shape through my actions.',
    'I embrace my originality as my greatest contribution.',
  ],
  pisces: [
    'My compassion is boundless, and I direct it inward first.',
    'My dreams are not fantasies—they are blueprints for my reality.',
    'I set healthy boundaries while keeping my heart open.',
    'My intuition connects me to a wisdom beyond words.',
    'I flow with life\'s currents while staying true to my course.',
    'My sensitivity allows me to see beauty others miss.',
  ],
}

/**
 * Get 3 affirmations for a sign, rotated by day-of-year.
 */
export function getFallbackAffirmations(sign: string): string[] {
  const affirmations = FALLBACK_AFFIRMATIONS[sign.toLowerCase()]
  if (!affirmations) {
    return [
      'I am aligned with the energy of the cosmos.',
      'I trust the universe to guide my path today.',
      'I embrace the gifts this day brings with open arms.',
    ]
  }

  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  )
  const startIndex = (dayOfYear * 3) % affirmations.length
  const result: string[] = []
  for (let i = 0; i < 3; i++) {
    result.push(affirmations[(startIndex + i) % affirmations.length])
  }
  return result
}
