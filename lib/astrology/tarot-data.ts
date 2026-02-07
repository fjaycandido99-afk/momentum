/**
 * Tarot Card of the Day — Major Arcana data and daily selection logic.
 *
 * All 22 Major Arcana cards with element-personalized hints.
 * Uses deterministic seeded selection so every user sees the same card
 * for their sign on a given day, but it changes at midnight.
 */

import { getZodiacTraits, type ZodiacElement } from '@/lib/ai/zodiac-traits'
import { seededRandom } from '@/components/home/home-types'

export interface TarotCard {
  numeral: string
  name: string
  keywords: string[]
  uprightMeaning: string
  elementalAffinity: string
  elementHints: Record<'fire' | 'earth' | 'air' | 'water', string>
}

export const MAJOR_ARCANA: TarotCard[] = [
  {
    numeral: '0',
    name: 'The Fool',
    keywords: ['new beginnings', 'innocence', 'adventure'],
    uprightMeaning: 'A leap of faith awaits. Trust the unknown and embrace the fresh start the universe is offering you.',
    elementalAffinity: 'Air',
    elementHints: {
      fire: 'Your boldness makes this leap natural — charge forward without hesitation.',
      earth: 'Ground your adventurous spirit in one small, practical first step today.',
      air: 'Your mind is already racing with possibilities — follow the most exciting one.',
      water: 'Let your intuition guide you into this new chapter with open arms.',
    },
  },
  {
    numeral: 'I',
    name: 'The Magician',
    keywords: ['manifestation', 'willpower', 'resourcefulness'],
    uprightMeaning: 'You have all the tools you need. Channel your focus and turn intention into reality.',
    elementalAffinity: 'Mercury',
    elementHints: {
      fire: 'Your passionate energy is the spark — direct it and watch magic happen.',
      earth: 'Gather your resources methodically; your patience will amplify results.',
      air: 'Your clever ideas are the wand — speak your vision into existence.',
      water: 'Trust your emotional intelligence to guide your manifestation today.',
    },
  },
  {
    numeral: 'II',
    name: 'The High Priestess',
    keywords: ['intuition', 'mystery', 'inner knowledge'],
    uprightMeaning: 'Look inward for answers. The wisdom you seek already lives within you.',
    elementalAffinity: 'Moon',
    elementHints: {
      fire: 'Pause your forward charge — the answers come in stillness today.',
      earth: 'Your practical instincts are whispering something important. Listen closely.',
      air: 'Quiet the mental chatter and let the deeper knowing surface.',
      water: 'You are naturally attuned to this energy — trust what you feel.',
    },
  },
  {
    numeral: 'III',
    name: 'The Empress',
    keywords: ['abundance', 'nurturing', 'creativity'],
    uprightMeaning: 'Abundance flows toward you. Nurture what matters and let creativity bloom.',
    elementalAffinity: 'Venus',
    elementHints: {
      fire: 'Pour your passionate energy into creating something beautiful today.',
      earth: 'Your natural ability to cultivate growth is amplified — tend your garden.',
      air: 'Share your creative ideas generously; they will multiply.',
      water: 'Your compassionate nature attracts abundance effortlessly.',
    },
  },
  {
    numeral: 'IV',
    name: 'The Emperor',
    keywords: ['authority', 'structure', 'stability'],
    uprightMeaning: 'Take command of your day. Build structure and lead with confidence.',
    elementalAffinity: 'Aries',
    elementHints: {
      fire: 'Your natural leadership shines — own your authority today.',
      earth: 'Build solid foundations; your discipline creates lasting results.',
      air: 'Organize your brilliant ideas into an actionable framework.',
      water: 'Balance your sensitivity with firm boundaries today.',
    },
  },
  {
    numeral: 'V',
    name: 'The Hierophant',
    keywords: ['tradition', 'guidance', 'wisdom'],
    uprightMeaning: 'Seek guidance from trusted sources. There is wisdom in established paths.',
    elementalAffinity: 'Taurus',
    elementHints: {
      fire: 'Channel your energy into learning from someone who has walked this path.',
      earth: 'Proven methods are your ally today — trust the process.',
      air: 'Study and teach; knowledge shared is knowledge doubled.',
      water: 'Connect with a spiritual practice that resonates with your soul.',
    },
  },
  {
    numeral: 'VI',
    name: 'The Lovers',
    keywords: ['connection', 'choices', 'harmony'],
    uprightMeaning: 'A meaningful choice appears. Let your values guide you toward alignment.',
    elementalAffinity: 'Gemini',
    elementHints: {
      fire: 'Follow your heart boldly — passion and purpose align today.',
      earth: 'Choose the path that feels both right and realistic.',
      air: 'Weigh your options thoughtfully; the right connection will feel clear.',
      water: 'Your heart already knows the answer — honor that knowing.',
    },
  },
  {
    numeral: 'VII',
    name: 'The Chariot',
    keywords: ['determination', 'victory', 'willpower'],
    uprightMeaning: 'Stay focused and push forward. Victory comes through determined action.',
    elementalAffinity: 'Cancer',
    elementHints: {
      fire: 'Your unstoppable drive carries you to triumph today.',
      earth: 'Steady, consistent effort is your chariot — keep going.',
      air: 'Focus your scattered energy into one clear direction.',
      water: 'Harness your emotional strength as fuel for forward momentum.',
    },
  },
  {
    numeral: 'VIII',
    name: 'Strength',
    keywords: ['courage', 'patience', 'inner power'],
    uprightMeaning: 'True strength is gentle. Lead with compassion and quiet confidence.',
    elementalAffinity: 'Leo',
    elementHints: {
      fire: 'Your courage is magnetic — lead with warmth, not force.',
      earth: 'Your endurance and patience are your greatest powers today.',
      air: 'Strength of mind conquers all — stay calm and centered.',
      water: 'Emotional resilience is your superpower. You are stronger than you know.',
    },
  },
  {
    numeral: 'IX',
    name: 'The Hermit',
    keywords: ['solitude', 'reflection', 'inner light'],
    uprightMeaning: 'Step back and reflect. Solitude brings the clarity you need right now.',
    elementalAffinity: 'Virgo',
    elementHints: {
      fire: 'Take a rare pause — your inner fire needs quiet to reveal its direction.',
      earth: 'Retreat into nature or a quiet space; answers come through stillness.',
      air: 'Turn your analytical mind inward — journal or meditate today.',
      water: 'Solitude feeds your soul. Embrace the quiet and listen within.',
    },
  },
  {
    numeral: 'X',
    name: 'Wheel of Fortune',
    keywords: ['cycles', 'destiny', 'turning point'],
    uprightMeaning: 'The wheel turns in your favor. Embrace change as the universe realigns.',
    elementalAffinity: 'Jupiter',
    elementHints: {
      fire: 'A bold opportunity spins toward you — seize it with confidence.',
      earth: 'Adapt to shifting circumstances; your stability carries you through.',
      air: 'Read the signs around you — a pivotal shift is unfolding.',
      water: 'Trust the cosmic flow; this change serves your highest good.',
    },
  },
  {
    numeral: 'XI',
    name: 'Justice',
    keywords: ['fairness', 'truth', 'balance'],
    uprightMeaning: 'Truth and fairness prevail. Act with integrity and the scales will balance.',
    elementalAffinity: 'Libra',
    elementHints: {
      fire: 'Stand up for what is right with your characteristic boldness.',
      earth: 'Weigh the facts carefully before making your decision.',
      air: 'Your logical mind sees both sides clearly — choose wisely.',
      water: 'Balance your emotions with reason; fairness requires both.',
    },
  },
  {
    numeral: 'XII',
    name: 'The Hanged Man',
    keywords: ['surrender', 'new perspective', 'pause'],
    uprightMeaning: 'Let go of control. A shift in perspective reveals hidden truth.',
    elementalAffinity: 'Neptune',
    elementHints: {
      fire: 'Resist the urge to push — surrendering opens unexpected doors.',
      earth: 'Release your grip on the plan; a better path is forming.',
      air: 'Flip your thinking upside down — the answer is in the opposite.',
      water: 'You naturally understand surrender — let the current carry you.',
    },
  },
  {
    numeral: 'XIII',
    name: 'Death',
    keywords: ['transformation', 'endings', 'renewal'],
    uprightMeaning: 'Something ends so something greater can begin. Embrace transformation.',
    elementalAffinity: 'Scorpio',
    elementHints: {
      fire: 'Release the old flame to ignite something more powerful.',
      earth: 'Compost what no longer grows; fertile ground awaits.',
      air: 'Let go of outdated beliefs — a mental rebirth is calling.',
      water: 'You understand deep transformation intuitively. Trust the process.',
    },
  },
  {
    numeral: 'XIV',
    name: 'Temperance',
    keywords: ['balance', 'patience', 'moderation'],
    uprightMeaning: 'Find your middle ground. Patience and balance bring harmony today.',
    elementalAffinity: 'Sagittarius',
    elementHints: {
      fire: 'Temper your intensity with patience — balance amplifies your power.',
      earth: 'Your natural steadiness is an asset; maintain your balanced rhythm.',
      air: 'Blend your many ideas into one cohesive approach.',
      water: 'Mix head and heart in equal measure for the best outcome.',
    },
  },
  {
    numeral: 'XV',
    name: 'The Devil',
    keywords: ['shadow', 'attachment', 'liberation'],
    uprightMeaning: 'Examine what holds you back. Awareness of chains is the first step to freedom.',
    elementalAffinity: 'Capricorn',
    elementHints: {
      fire: 'Your impulsive side may be running the show — reclaim your power.',
      earth: 'Release attachment to material security if it limits your growth.',
      air: 'Notice the mental loops that keep you stuck — break the pattern.',
      water: 'Acknowledge the emotional bonds that no longer serve you.',
    },
  },
  {
    numeral: 'XVI',
    name: 'The Tower',
    keywords: ['upheaval', 'breakthrough', 'revelation'],
    uprightMeaning: 'Sudden change clears the way for truth. What crumbles needed to fall.',
    elementalAffinity: 'Mars',
    elementHints: {
      fire: 'You thrive in disruption — use this upheaval to rebuild stronger.',
      earth: 'The ground shifts, but your roots hold. Rebuild with intention.',
      air: 'A sudden insight shatters an illusion — welcome the clarity.',
      water: 'Let the emotional wave pass; calmer, clearer waters follow.',
    },
  },
  {
    numeral: 'XVII',
    name: 'The Star',
    keywords: ['hope', 'inspiration', 'renewal'],
    uprightMeaning: 'Hope shines bright. Trust that healing and inspiration are flowing to you.',
    elementalAffinity: 'Aquarius',
    elementHints: {
      fire: 'Let hope reignite your passion — your brightest chapter is ahead.',
      earth: 'Plant seeds of hope in practical soil; they will blossom.',
      air: 'Your visionary nature connects deeply with this energy — dream big.',
      water: 'Let healing wash over you. Your sensitivity is a gift today.',
    },
  },
  {
    numeral: 'XVIII',
    name: 'The Moon',
    keywords: ['illusion', 'subconscious', 'dreams'],
    uprightMeaning: 'Not everything is as it seems. Trust your instincts to navigate the shadows.',
    elementalAffinity: 'Pisces',
    elementHints: {
      fire: 'Slow down and look beneath the surface before charging ahead.',
      earth: 'Ground yourself when things feel unclear — trust your senses.',
      air: 'Your mind may overthink; let intuition lead through the fog.',
      water: 'You are at home in these depths — trust your dreams and visions.',
    },
  },
  {
    numeral: 'XIX',
    name: 'The Sun',
    keywords: ['joy', 'success', 'vitality'],
    uprightMeaning: 'Radiant energy surrounds you. Step into the light and celebrate your wins.',
    elementalAffinity: 'Sun',
    elementHints: {
      fire: 'This is your peak energy — shine as brightly as you were made to.',
      earth: 'Enjoy the fruits of your hard work; you have earned this warmth.',
      air: 'Share your joy and ideas freely — your light inspires others.',
      water: 'Let warmth melt any heaviness. Today is for happiness and gratitude.',
    },
  },
  {
    numeral: 'XX',
    name: 'Judgement',
    keywords: ['reflection', 'calling', 'awakening'],
    uprightMeaning: 'A higher calling beckons. Reflect on your journey and answer the call.',
    elementalAffinity: 'Pluto',
    elementHints: {
      fire: 'Answer your calling with bold, decisive action.',
      earth: 'Reflect on your accomplishments and plan your next elevation.',
      air: 'A mental awakening shifts your perspective — embrace the clarity.',
      water: 'Deep emotional insight reveals your true purpose today.',
    },
  },
  {
    numeral: 'XXI',
    name: 'The World',
    keywords: ['completion', 'fulfillment', 'wholeness'],
    uprightMeaning: 'A cycle completes. Celebrate how far you have come and welcome what is next.',
    elementalAffinity: 'Saturn',
    elementHints: {
      fire: 'You have conquered this chapter — celebrate before igniting the next.',
      earth: 'Savor the completion; your persistent work has paid off beautifully.',
      air: 'Integration of all you have learned opens a new horizon.',
      water: 'Feel the deep fulfillment of this ending. Wholeness is yours.',
    },
  },
]

/**
 * Pick a deterministic daily tarot card for a given zodiac sign.
 * Same card all day, changes at midnight, different per sign.
 */
export function getDailyTarotCard(sign: string): { card: TarotCard; elementHint: string } {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24))

  // Hash the sign name into a number
  let signHash = 0
  for (let i = 0; i < sign.length; i++) {
    signHash += sign.charCodeAt(i)
  }

  const seed = dayOfYear * 100 + signHash
  const index = Math.floor(seededRandom(seed) * MAJOR_ARCANA.length)
  const card = MAJOR_ARCANA[index]

  // Get the user's element for personalized hint
  const traits = getZodiacTraits(sign)
  const element: 'fire' | 'earth' | 'air' | 'water' = traits?.element || 'fire'
  const elementHint = card.elementHints[element]

  return { card, elementHint }
}
