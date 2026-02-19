import type { MindsetId } from './types'

/**
 * Mindset-tagged daily reflection questions.
 * These are added to the general DAILY_QUESTIONS pool
 * with higher selection weight when the user's mindset matches.
 */
export const MINDSET_DAILY_QUESTIONS: Record<MindsetId, string[]> = {
  stoic: [
    'What is beyond your control that you need to release?',
    'Where did you practice emotional discipline today?',
    'What obstacle became an opportunity today?',
    'How did you respond — not react — to a challenge?',
    'What virtue did you embody today?',
    'What would Marcus Aurelius say about your day?',
  ],
  existentialist: [
    'What authentic choice did you make today?',
    'Where did you create meaning where there was none?',
    'What freedom scared you today — and did you lean in?',
    'Are you living according to your own values, or someone else\'s?',
    'What absurdity did you embrace today?',
    'What would you choose to do if no one was watching?',
  ],
  cynic: [
    'What social convention did you question today?',
    'What unnecessary possession or habit could you release?',
    'Where did you choose simplicity over complexity?',
    'What truth did everyone avoid that you confronted?',
    'Are you living for yourself, or for others\' approval?',
    'What would you dare to say if you feared nothing?',
  ],
  hedonist: [
    'What moment of genuine pleasure did you savor today?',
    'What friendship nourished you recently?',
    'What unnecessary desire are you chasing?',
    'Where did you find peace of mind today?',
    'What simple joy are you overlooking in your daily life?',
    'What would make today feel truly satisfying?',
  ],
  samurai: [
    'Where did you show unwavering discipline today?',
    'What skill did you practice with full presence?',
    'Did you act with honor in every interaction today?',
    'What distraction did you cut away?',
    'Are you training your mind as diligently as your body?',
    'What would the master version of you do differently?',
  ],
  scholar: [
    'What pattern did you notice in your behavior today?',
    'What archetype are you embodying right now?',
    'What does your inner world look like today?',
    'What cosmic connection did you feel today?',
    'What myth or story mirrors your current journey?',
    'What would you discover if you looked within?',
  ],
  manifestor: [
    'What did you visualize with full emotion today?',
    'Are your thoughts aligned with what you want to attract?',
    'What limiting belief are you ready to release?',
    'What would the highest version of you do right now?',
    'What are you assuming about your future — and is it empowering?',
    'What would change if you fully believed your dream was already done?',
  ],
  hustler: [
    'Did you do more than what was expected of you today?',
    'What excuse did you destroy today?',
    'Where did you take the easy way out — and how do you fix that?',
    'Are you working as hard as you tell people you are?',
    'What did you do today that nobody else was willing to do?',
    'If today was your last chance to prove yourself, did you leave it all on the table?',
  ],
}
