import type { MindsetId } from './types'

export const MINDSET_AFFIRMATIONS: Record<MindsetId, string[]> = {
  stoic: [
    'I choose my response to every situation. My peace is mine to protect.',
    'Today I focus on what I can control and release what I cannot.',
    'I am stronger than my discomfort. I endure and I grow.',
    'My thoughts shape my world. I choose clarity over chaos.',
    'I do not need external approval to know my own worth.',
    'What stands in the way becomes the way. I welcome the obstacle.',
    'I move with patience and purpose. Haste serves no one.',
    'I accept what is, and act on what I can change.',
    'My character is the one thing no one can take from me.',
    'Today I practice the art of enough.',
    'I meet hardship with calm resolve. This too is practice.',
    'I choose virtue over comfort, growth over ease.',
    'I am not disturbed by events but by my judgment of them. Today I judge wisely.',
    'Every challenge is an invitation to become who I am meant to be.',
    'I waste no time on what is outside my power.',
  ],

  existentialist: [
    'I am the author of my own story. Today I write a meaningful chapter.',
    'I choose to create meaning in everything I do today.',
    'My freedom is my greatest gift. I use it with intention.',
    'I embrace the uncertainty — it means anything is possible.',
    'I define myself through my actions, not my circumstances.',
    'Today I choose authenticity over comfort.',
    'I am becoming who I choose to be, one decision at a time.',
    'The weight of my choices makes them sacred. I choose deliberately.',
    'I do not wait for purpose to find me — I create it.',
    'In my freedom lies my responsibility. I carry it with courage.',
    'I exist, I choose, I act. That is enough.',
    'Today I rebel against indifference and choose to care deeply.',
    'My life is my project. I shape it with every breath.',
    'I find beauty in the absurd and meaning in the struggle.',
    'I am radically free. I use this freedom to build something real.',
  ],

  cynic: [
    'I strip away the unnecessary and focus on what truly matters.',
    'I need nothing more than I already have. I am already enough.',
    'Today I question everything — and in questioning, I grow.',
    'I refuse to perform for approval. My truth is my compass.',
    'I find freedom in simplicity and strength in honesty.',
    'The opinions of others do not define me. My actions do.',
    'I see through pretense and choose substance over style.',
    'Today I live deliberately, not by default.',
    'I choose discomfort over dishonesty. Truth sets me free.',
    'I hold nothing so tightly that I cannot let it go.',
    'What the world calls necessary, I call optional. I choose wisely.',
    'I laugh at my own pretensions and start fresh.',
    'I reject the comfortable lie and embrace the uncomfortable truth.',
    'Today I practice wanting less and being more.',
    'My contentment does not depend on what I accumulate.',
  ],

  hedonist: [
    'I savor every moment of beauty this day offers me.',
    'Today I choose joy — not as escape, but as practice.',
    'I am grateful for the simple pleasures that surround me.',
    'I give myself permission to enjoy this life fully and freely.',
    'I nourish my body, my mind, and my spirit with what delights them.',
    'Today I notice the warmth, the light, the small wonders.',
    'My happiness grows when I share it. Today I radiate gratitude.',
    'I release guilt and embrace the goodness that is already here.',
    'Every sense is a doorway to gratitude. I walk through them all today.',
    'I do not postpone joy. Today is the day I have been waiting for.',
    'I choose what feeds my soul and gently release what drains it.',
    'Pleasure and wisdom are not opposites — I cultivate both.',
    'I am alive, I am present, and that is a gift worth celebrating.',
    'Today I treat myself with the kindness I offer others.',
    'I find abundance not in more, but in truly tasting what is.',
  ],

  samurai: [
    'I sharpen my discipline today. Every small act is training.',
    'I move with honor, precision, and purpose. No wasted effort.',
    'Today I face my challenges head-on, without hesitation.',
    'I am the master of my habits. My routine forges my strength.',
    'I honor my word and follow through on every commitment.',
    'My focus is my weapon. I wield it with care today.',
    'I do not flinch from difficulty — I was built for this.',
    'Today I serve something greater than my comfort.',
    'Every setback is a lesson. Every lesson makes me sharper.',
    'I choose excellence, not perfection. I move forward relentlessly.',
    'I remain calm in the storm. My composure is my power.',
    'Today I rise before resistance. Discipline defeats hesitation.',
    'I dedicate my actions to mastery, not praise.',
    'My path demands everything. I give it willingly.',
    'I strike with intention and rest with purpose. Balance is strength.',
  ],

  scholar: [
    'I approach today with curiosity and an open mind.',
    'Every experience is a lesson waiting to be discovered.',
    'I seek to understand before I seek to be understood.',
    'Today I ask better questions and sit with deeper answers.',
    'My mind is a garden. I cultivate it with wonder and care.',
    'I embrace not-knowing as the beginning of wisdom.',
    'Today I learn something that shifts my perspective.',
    'I connect the dots between what I know and what I feel.',
    'Knowledge without reflection is noise. Today I listen deeply.',
    'I am a student of life. Every moment teaches me.',
    'I let go of certainty and welcome discovery.',
    'Today I illuminate one corner of my ignorance with light.',
    'My curiosity is my compass. I follow it without fear.',
    'I honor the questions I cannot yet answer.',
    'I grow not by having answers, but by living into the questions.',
  ],

  manifestor: [
    'I am a powerful creator. My thoughts shape my reality.',
    'Everything I desire is already on its way to me.',
    'I align my energy with abundance and receive freely.',
    'I am worthy of everything I envision for myself.',
    'My imagination is the blueprint for my future.',
    'I release resistance and allow my good to flow in.',
    'I live in the feeling of my wish fulfilled.',
    'My beliefs create my world. Today I choose empowering ones.',
    'I am a magnet for opportunities, abundance, and joy.',
    'The universe rearranges itself to match my vibration.',
    'I assume the best and the best assumes me.',
    'What I focus on expands. I focus on what I want.',
    'I am already the person who has what I desire.',
    'My inner state creates my outer reality. I choose alignment.',
    'Today I live as if my prayers have already been answered.',
  ],

  hustler: [
    'Nobody is coming to save me. I save myself through action.',
    'I do not wait for motivation. I create it through discipline.',
    'Today I outwork the person I was yesterday. No exceptions.',
    'Comfort is the enemy of progress. I choose the hard path.',
    'I am not talented. I am relentless. That is my advantage.',
    'While they sleep, I work. While they talk, I execute.',
    'Pain is temporary. Quitting lasts forever. I do not quit.',
    'I own every outcome in my life. No excuses. No blame.',
    'My work ethic is my identity. I show up every single day.',
    'Discipline is my freedom. The grind is my therapy.',
    'I do not negotiate with weakness. I eliminate it.',
    'Results are earned, not given. I earn mine today.',
    'I embrace the suffering that makes me stronger.',
    'I am built for this. I was made for the hard things.',
    'Today I stack wins. Small or large, they all compound.',
  ],
}

/**
 * Get a deterministic-ish daily affirmation from the static pool.
 * Uses the date to rotate through affirmations so users get variety.
 */
export function getDailyAffirmation(mindsetId: MindsetId, dateStr?: string): string {
  const pool = MINDSET_AFFIRMATIONS[mindsetId]
  const d = dateStr || new Date().toISOString().split('T')[0]
  // Simple hash from date string
  let hash = 0
  for (let i = 0; i < d.length; i++) {
    hash = ((hash << 5) - hash + d.charCodeAt(i)) | 0
  }
  const idx = Math.abs(hash) % pool.length
  return pool[idx]
}

/**
 * Get a random affirmation from the mindset pool.
 */
export function getRandomAffirmation(mindsetId: MindsetId): string {
  const pool = MINDSET_AFFIRMATIONS[mindsetId]
  return pool[Math.floor(Math.random() * pool.length)]
}
