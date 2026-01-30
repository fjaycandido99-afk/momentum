import { Quote, QUOTES } from './quotes'

export const DAILY_QUESTIONS: string[] = [
  // Forward-looking
  "What's one thing you could do today that your future self will thank you for?",
  "What would make today feel complete?",
  "What's a small win you can aim for today?",
  "What are you most looking forward to this week?",
  "If you could accomplish just one thing today, what would it be?",
  // Gratitude
  "What made you smile recently?",
  "What's one thing you're grateful for right now?",
  "What's a simple pleasure you enjoyed this week?",
  "Who in your life are you thankful for today?",
  "What's something beautiful you noticed recently?",
  // Self-awareness
  "How are you really feeling today?",
  "What's something you've been overthinking that just needs action?",
  "What emotion do you want to carry with you today?",
  "What's one thing you need to let go of?",
  "If your body could talk, what would it ask for right now?",
  // Connection
  "Who could you reach out to today to brighten their day?",
  "What's one kind thing you could do for someone today?",
  "Who has made a positive impact on your life recently?",
  "What's a conversation you've been meaning to have?",
  // Growth
  "What's one habit you're proud of building?",
  "If you could learn one new skill starting today, what would it be?",
  "What's one lesson you've learned this week?",
  "What challenge are you currently growing through?",
  "What would you attempt if you knew you couldn't fail?",
  // Playful
  "If today had a theme, what would it be?",
  "If today were a movie, what genre would it be?",
  "What song best describes your mood right now?",
  "If you could have any superpower just for today, what would it be?",
  "What's one fun thing you can do for yourself today?",
  "What would your 10-year-old self think of your life right now?",
]

export interface Spark {
  type: 'question' | 'quote' | 'affirmation'
  text: string
  author?: string
}

// Alternate between questions and quotes, picking randomly within each
let showQuestion = true

export function getNextSpark(quotes: Quote[]): Spark {
  if (showQuestion) {
    const q = DAILY_QUESTIONS[Math.floor(Math.random() * DAILY_QUESTIONS.length)]
    showQuestion = false
    return { type: 'question', text: q }
  } else {
    const quote = quotes[Math.floor(Math.random() * quotes.length)]
    showQuestion = true
    return { type: 'quote', text: quote.text, author: quote.author }
  }
}
