export interface JournalPrompt {
  text: string
  category: 'self-reflection' | 'gratitude' | 'growth' | 'relationships' | 'creativity'
}

export const JOURNAL_PROMPTS: JournalPrompt[] = [
  // Self-reflection
  { text: "What's something you've been avoiding, and why?", category: 'self-reflection' },
  { text: "What would your ideal day look like in 5 years?", category: 'self-reflection' },
  { text: "What belief about yourself would you like to let go of?", category: 'self-reflection' },
  { text: "When did you last feel completely at peace? What were you doing?", category: 'self-reflection' },

  // Gratitude
  { text: "Name a small moment today that made you smile.", category: 'gratitude' },
  { text: "Who has positively impacted your life recently? How?", category: 'gratitude' },
  { text: "What's a skill or ability you're grateful to have?", category: 'gratitude' },
  { text: "What's something in your daily routine you'd miss if it were gone?", category: 'gratitude' },

  // Growth
  { text: "What's a mistake that taught you something valuable?", category: 'growth' },
  { text: "What's one habit you'd like to build, and what's the smallest step toward it?", category: 'growth' },
  { text: "What challenge are you currently facing, and what can it teach you?", category: 'growth' },
  { text: "What's something you're better at now than a year ago?", category: 'growth' },

  // Relationships
  { text: "Who do you need to thank or appreciate more?", category: 'relationships' },
  { text: "What's a conversation you've been meaning to have?", category: 'relationships' },
  { text: "How did you show up for someone today?", category: 'relationships' },
  { text: "What quality do you admire most in someone close to you?", category: 'relationships' },

  // Creativity
  { text: "If you could create anything without limits, what would it be?", category: 'creativity' },
  { text: "What's an idea that keeps coming back to you?", category: 'creativity' },
  { text: "Describe your current mood as a weather pattern.", category: 'creativity' },
  { text: "Write a letter to your future self about today.", category: 'creativity' },
]

/** Deterministic prompt for a given date */
export function getPromptForDate(date: Date): { prompt: JournalPrompt; index: number } {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const index = seed % JOURNAL_PROMPTS.length
  return { prompt: JOURNAL_PROMPTS[index], index }
}

/** Pick a different prompt (shuffle) */
export function getShuffledPrompt(date: Date, excludeIndex: number): { prompt: JournalPrompt; index: number } {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  let index = (seed + excludeIndex + 1) % JOURNAL_PROMPTS.length
  if (index === excludeIndex) {
    index = (index + 1) % JOURNAL_PROMPTS.length
  }
  return { prompt: JOURNAL_PROMPTS[index], index }
}
