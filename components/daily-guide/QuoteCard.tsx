'use client'

import { useState, useEffect } from 'react'
import { Quote, Check, Sparkles } from 'lucide-react'

// Daily quotes collection - rotates based on day of year (100+ quotes)
const QUOTES = [
  // Motivation & Success
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "What you get by achieving your goals is not as important as what you become by achieving your goals.", author: "Zig Ziglar" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Hardships often prepare ordinary people for an extraordinary destiny.", author: "C.S. Lewis" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson" },
  { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson" },
  { text: "The mind is everything. What you think you become.", author: "Buddha" },
  // Growth & Learning
  { text: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "If you look at what you have in life, you'll always have more.", author: "Oprah Winfrey" },
  { text: "Life is really simple, but we insist on making it complicated.", author: "Confucius" },
  { text: "The purpose of our lives is to be happy.", author: "Dalai Lama" },
  { text: "Get busy living or get busy dying.", author: "Stephen King" },
  { text: "You only live once, but if you do it right, once is enough.", author: "Mae West" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde" },
  { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein" },
  { text: "Be the change that you wish to see in the world.", author: "Mahatma Gandhi" },
  // Persistence & Resilience
  { text: "It is during our darkest moments that we must focus to see the light.", author: "Aristotle" },
  { text: "The only thing we have to fear is fear itself.", author: "Franklin D. Roosevelt" },
  { text: "Do one thing every day that scares you.", author: "Eleanor Roosevelt" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "The best and most beautiful things in the world cannot be seen or even touched — they must be felt with the heart.", author: "Helen Keller" },
  { text: "It is never too late to be what you might have been.", author: "George Eliot" },
  { text: "Everything has beauty, but not everyone sees it.", author: "Confucius" },
  { text: "How wonderful it is that nobody need wait a single moment before starting to improve the world.", author: "Anne Frank" },
  { text: "When one door of happiness closes, another opens.", author: "Helen Keller" },
  { text: "If you want to lift yourself up, lift up someone else.", author: "Booker T. Washington" },
  // Wisdom & Philosophy
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "The unexamined life is not worth living.", author: "Socrates" },
  { text: "Turn your wounds into wisdom.", author: "Oprah Winfrey" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },
  { text: "In three words I can sum up everything I've learned about life: it goes on.", author: "Robert Frost" },
  { text: "To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.", author: "Ralph Waldo Emerson" },
  { text: "Keep your face always toward the sunshine—and shadows will fall behind you.", author: "Walt Whitman" },
  { text: "Whoever is happy will make others happy too.", author: "Anne Frank" },
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus" },
  { text: "The only thing standing between you and your goal is the story you keep telling yourself.", author: "Jordan Belfort" },
  // Action & Courage
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi" },
  { text: "The best revenge is massive success.", author: "Frank Sinatra" },
  { text: "I can't change the direction of the wind, but I can adjust my sails to always reach my destination.", author: "Jimmy Dean" },
  { text: "Believe in yourself and all that you are. Know that there is something inside you that is greater than any obstacle.", author: "Christian D. Larson" },
  { text: "What you do speaks so loudly that I cannot hear what you say.", author: "Ralph Waldo Emerson" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "The pessimist sees difficulty in every opportunity. The optimist sees opportunity in every difficulty.", author: "Winston Churchill" },
  { text: "Don't let yesterday take up too much of today.", author: "Will Rogers" },
  { text: "You learn more from failure than from success. Don't let it stop you. Failure builds character.", author: "Unknown" },
  // Mindset & Attitude
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Happiness is not something ready made. It comes from your own actions.", author: "Dalai Lama" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { text: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
  { text: "The harder I work, the luckier I get.", author: "Gary Player" },
  { text: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  // Purpose & Meaning
  { text: "The two most important days in your life are the day you are born and the day you find out why.", author: "Mark Twain" },
  { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs" },
  { text: "The meaning of life is to find your gift. The purpose of life is to give it away.", author: "Pablo Picasso" },
  { text: "Life isn't about finding yourself. Life is about creating yourself.", author: "George Bernard Shaw" },
  { text: "Don't judge each day by the harvest you reap but by the seeds that you plant.", author: "Robert Louis Stevenson" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  // Focus & Discipline
  { text: "The successful warrior is the average man, with laser-like focus.", author: "Bruce Lee" },
  { text: "It's not that I'm so smart, it's just that I stay with problems longer.", author: "Albert Einstein" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "The difference between ordinary and extraordinary is that little extra.", author: "Jimmy Johnson" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "The way to get things done is not to mind who gets the credit for doing them.", author: "Benjamin Jowett" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  // Happiness & Gratitude
  { text: "Happiness is not by chance, but by choice.", author: "Jim Rohn" },
  { text: "The greatest weapon against stress is our ability to choose one thought over another.", author: "William James" },
  { text: "For every minute you are angry you lose sixty seconds of happiness.", author: "Ralph Waldo Emerson" },
  { text: "Count your age by friends, not years. Count your life by smiles, not tears.", author: "John Lennon" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "Gratitude turns what we have into enough.", author: "Aesop" },
  { text: "The happiest people don't have the best of everything, they make the best of everything.", author: "Unknown" },
  { text: "Enjoy the little things, for one day you may look back and realize they were the big things.", author: "Robert Brault" },
  { text: "When you arise in the morning think of what a privilege it is to be alive.", author: "Marcus Aurelius" },
  { text: "Today is a good day to have a good day.", author: "Unknown" },
  // Inner Strength
  { text: "You have power over your mind — not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
  { text: "Courage is not the absence of fear, but rather the judgment that something else is more important than fear.", author: "Ambrose Redmoon" },
  { text: "You gain strength, courage, and confidence by every experience in which you really stop to look fear in the face.", author: "Eleanor Roosevelt" },
  { text: "Rock bottom became the solid foundation on which I rebuilt my life.", author: "J.K. Rowling" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
  { text: "The comeback is always stronger than the setback.", author: "Unknown" },
  { text: "Storms make trees take deeper roots.", author: "Dolly Parton" },
  { text: "What doesn't kill you makes you stronger.", author: "Friedrich Nietzsche" },
]

// Get today's quote based on day of year
function getTodaysQuote() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - startOfYear.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return QUOTES[dayOfYear % QUOTES.length]
}

interface QuoteCardProps {
  isCompleted: boolean
  onComplete: () => void
}

// Get today's date key for localStorage
function getTodayKey() {
  const now = new Date()
  return `quote_revealed_${now.getFullYear()}_${now.getMonth()}_${now.getDate()}`
}

export function QuoteCard({ isCompleted, onComplete }: QuoteCardProps) {
  const [quote, setQuote] = useState<{ text: string; author: string } | null>(null)
  const [isRevealed, setIsRevealed] = useState(false)

  // Load quote and check if already revealed today
  useEffect(() => {
    setQuote(getTodaysQuote())

    // Check localStorage for today's revealed state
    const todayKey = getTodayKey()
    const wasRevealed = localStorage.getItem(todayKey) === 'true'
    if (wasRevealed) {
      setIsRevealed(true)
    }

    // Clean up old keys (keep only today's)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('quote_revealed_') && key !== todayKey) {
        localStorage.removeItem(key)
      }
    })
  }, [])

  // Also set revealed if completed from server
  useEffect(() => {
    if (isCompleted) {
      setIsRevealed(true)
    }
  }, [isCompleted])

  const handleReveal = () => {
    setIsRevealed(true)
    // Save to localStorage
    localStorage.setItem(getTodayKey(), 'true')
    // Complete after revealing
    setTimeout(() => {
      onComplete()
    }, 1500)
  }

  if (!quote) return null

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all duration-500 ${
        isCompleted
          ? 'bg-white/[0.03] border border-white/10'
          : 'bg-gradient-to-br from-white/[0.08] to-white/[0.03] border border-white/10'
      }`}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium tracking-widest text-white/40 uppercase">
            Wisdom
          </span>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-1.5 text-emerald-400/80">
            <Check className="w-3.5 h-3.5" />
            <span className="text-xs">Done</span>
          </div>
        )}
      </div>

      {/* Quote Content */}
      <div className="px-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-xl shrink-0 ${
            isCompleted ? 'bg-white/5' : 'bg-white/10'
          }`}>
            <Sparkles className={`w-5 h-5 ${isCompleted ? 'text-white/40' : 'text-amber-300'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className={`font-medium mb-1 ${isCompleted ? 'text-white/50' : 'text-white'}`}>
              Quote of the Day
            </h3>

            {isRevealed || isCompleted ? (
              <div className="mt-3">
                <div className="relative">
                  <Quote className="absolute -left-1 -top-1 w-4 h-4 text-white/20" />
                  <p className={`text-sm leading-relaxed pl-4 italic ${
                    isCompleted ? 'text-white/50' : 'text-white/90'
                  }`}>
                    "{quote.text}"
                  </p>
                </div>
                <p className={`text-xs mt-2 pl-4 ${isCompleted ? 'text-white/30' : 'text-white/50'}`}>
                  — {quote.author}
                </p>
              </div>
            ) : (
              <button
                onClick={handleReveal}
                className="mt-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-all text-sm text-white/90 flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Reveal Today's Quote
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
