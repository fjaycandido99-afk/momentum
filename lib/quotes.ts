export interface Quote {
  text: string
  author: string
  category?: string
}

export const QUOTES: Quote[] = [
  // Motivation & Success
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "motivation" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "motivation" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "motivation" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "motivation" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "motivation" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", category: "motivation" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins", category: "motivation" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar", category: "motivation" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs", category: "motivation" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb", category: "motivation" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis", category: "motivation" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "motivation" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "motivation" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", category: "motivation" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis", category: "motivation" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", category: "motivation" },
  { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau", category: "motivation" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James", category: "motivation" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson", category: "motivation" },
  { text: "The mind is everything. What you think you become.", author: "Buddha", category: "motivation" },
  // Growth & Learning
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein", category: "growth" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison", category: "growth" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein", category: "growth" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela", category: "growth" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon", category: "growth" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney", category: "growth" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey", category: "growth" },
  { text: "Life is really simple, but we insist on making it complicated.", author: "Confucius", category: "growth" },
  { text: "The purpose of our lives is to be happy.", author: "Dalai Lama", category: "growth" },
  { text: "Get busy living or get busy dying.", author: "Stephen King", category: "growth" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West", category: "growth" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu", category: "growth" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "growth" },
  { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein", category: "growth" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi", category: "growth" },
  // Persistence & Resilience
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle", category: "resilience" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt", category: "resilience" },
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt", category: "resilience" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin", category: "resilience" },
  { text: "The best and most beautiful things in the world cannot be seen or even touched — they must be felt with the heart.", author: "Helen Keller", category: "resilience" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot", category: "resilience" },
  { text: "Everything has beauty, but not everyone sees it.", author: "Confucius", category: "resilience" },
  { text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.", author: "Anne Frank", category: "resilience" },
  { text: "When one door of happiness closes, another opens.", author: "Helen Keller", category: "resilience" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington", category: "resilience" },
  // Wisdom & Philosophy
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle", category: "wisdom" },
  { text: "The unexamined life is not worth living.", author: "Socrates", category: "wisdom" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey", category: "wisdom" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates", category: "wisdom" },
  { text: "In three words I can sum up everything I've learned about life: it goes on.", author: "Robert Frost", category: "wisdom" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson", category: "wisdom" },
  { text: "Keep your face always toward the sunshine—and shadows will fall behind you.", author: "Walt Whitman", category: "wisdom" },
  { text: "Whoever is happy will make others happy too.", author: "Anne Frank", category: "wisdom" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus", category: "wisdom" },
  { text: "The only thing standing between you and your goal is the story you keep telling yourself.", author: "Jordan Belfort", category: "wisdom" },
  // Action & Courage
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi", category: "action" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra", category: "action" },
  { text: "I can't change the direction of the wind, but I can adjust my sails to always reach my destination.", author: "Jimmy Dean", category: "action" },
  { text: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.", author: "Christian D. Larson", category: "action" },
  { text: "What you do speaks so loudly that I cannot hear what you say.", author: "Ralph Waldo Emerson", category: "action" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", category: "action" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford", category: "action" },
  { text: "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.", author: "Winston Churchill", category: "action" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers", category: "action" },
  { text: "You learn more from failure than from success. Don't let it stop you. Failure builds character.", author: "Unknown", category: "action" },
  // Mindset & Attitude
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt", category: "mindset" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama", category: "mindset" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt", category: "mindset" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "mindset" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "mindset" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan", category: "mindset" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", category: "mindset" },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs", category: "mindset" },
  { text: "The harder I work, the luckier I get.", author: "Gary Player", category: "mindset" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller", category: "mindset" },
  // Purpose & Meaning
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain", category: "purpose" },
  { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs", category: "purpose" },
  { text: "The meaning of life is to find your gift. The purpose of life is to give it away.", author: "Pablo Picasso", category: "purpose" },
  { text: "Life isn't about finding yourself. Life is about creating yourself.", author: "George Bernard Shaw", category: "purpose" },
  { text: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson", category: "purpose" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker", category: "purpose" },
  { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll", category: "purpose" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown", category: "purpose" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown", category: "purpose" },
  { text: "Great things never come from comfort zones.", author: "Unknown", category: "purpose" },
  // Focus & Discipline
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee", category: "focus" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein", category: "focus" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn", category: "focus" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle", category: "focus" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson", category: "focus" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma", category: "focus" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss", category: "focus" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King", category: "focus" },
  { text: "The way to get things done is not to mind who gets the credit for doing them.", author: "Benjamin Jowett", category: "focus" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg", category: "focus" },
  // Happiness & Gratitude
  { text: "Happiness is not by chance, but by choice.", author: "Jim Rohn", category: "gratitude" },
  { text: "The greatest weapon against stress is our ability to choose one thought over another.", author: "William James", category: "gratitude" },
  { text: "For every minute you are angry you lose sixty seconds of happiness.", author: "Ralph Waldo Emerson", category: "gratitude" },
  { text: "Count your age by friends, not years. Count your life by smiles, not tears.", author: "John Lennon", category: "gratitude" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", category: "gratitude" },
  { text: "Gratitude turns what we have into enough.", author: "Aesop", category: "gratitude" },
  { text: "The happiest people don't have the best of everything, they make the best of everything.", author: "Unknown", category: "gratitude" },
  { text: "Enjoy the little things, for one day you may look back and realize they were the big things.", author: "Robert Brault", category: "gratitude" },
  { text: "When you arise in the morning think of what a privilege it is to be alive.", author: "Marcus Aurelius", category: "gratitude" },
  { text: "Today is a good day to have a good day.", author: "Unknown", category: "gratitude" },
  // Inner Strength
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", category: "strength" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi", category: "strength" },
  { text: "Courage is not the absence of fear, but rather the judgment that something else is more important than fear.", author: "Ambrose Redmoon", category: "strength" },
  { text: "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.", author: "Eleanor Roosevelt", category: "strength" },
  { text: "Rock bottom became the solid foundation on which I rebuilt my life.", author: "J.K. Rowling", category: "strength" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb", category: "strength" },
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller", category: "strength" },
  { text: "The comeback is always stronger than the setback.", author: "Unknown", category: "strength" },
  { text: "Storms make trees take deeper roots.", author: "Dolly Parton", category: "strength" },
  { text: "What doesn't kill you makes you stronger.", author: "Friedrich Nietzsche", category: "strength" },
]

// Get today's quote based on day of year (fallback)
export function getDayOfYearQuote(): Quote {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return QUOTES[dayOfYear % QUOTES.length]
}

// Get N random quotes from the pool
export function getRandomQuotes(count: number): Quote[] {
  const shuffled = [...QUOTES].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

// Mood/energy → preferred quote category mapping (shared by quote + spark routes)
export const MOOD_CATEGORY_MAP: Record<string, string[]> = {
  low: ['strength', 'resilience', 'gratitude'],
  okay: ['motivation', 'growth', 'wisdom'],
  medium: ['motivation', 'growth', 'wisdom'],
  good: ['motivation', 'growth', 'mindset'],
  great: ['action', 'purpose', 'focus'],
  high: ['action', 'purpose', 'focus'],
}

export const ENERGY_CATEGORY_MAP: Record<string, string[]> = {
  low: ['gratitude', 'wisdom', 'resilience'],
  normal: ['motivation', 'growth', 'mindset'],
  high: ['action', 'focus', 'purpose'],
}

/** Pick a quote matching mood/energy from a given pool (defaults to QUOTES) */
export function getHeuristicQuote(mood?: string, energy?: string, pool?: Quote[]): Quote {
  const quotePool = pool || QUOTES
  const moodCategories = mood ? MOOD_CATEGORY_MAP[mood] || [] : []
  const energyCategories = energy ? ENERGY_CATEGORY_MAP[energy] || [] : []
  const preferred = [...new Set([...moodCategories, ...energyCategories])]

  if (preferred.length === 0) {
    return pool ? pool[Math.floor(Math.random() * pool.length)] : getDayOfYearQuote()
  }

  const matching = quotePool.filter(q => q.category && preferred.includes(q.category))
  if (matching.length === 0) {
    return pool ? pool[Math.floor(Math.random() * pool.length)] : getDayOfYearQuote()
  }

  return matching[Math.floor(Math.random() * matching.length)]
}
