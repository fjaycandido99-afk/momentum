import type { LucideIcon } from 'lucide-react'
import { Book, BarChart3, Crown, Headphones, MessageCircle, Mic, Sparkles, Zap } from 'lucide-react'

/**
 * What Voxu Premium is, in one place — the upgrade screen and the pricing
 * page both read this, so they can't drift apart. Every line is a real gate
 * (lib/subscription-constants, the lesson/experiment/widget gates); history
 * is free and is never listed here.
 */
export const SERIF = { fontFamily: 'var(--font-cormorant), Georgia, serif' } as const
/** The Premium gold (Francis's 'Golden Mountain Night' design). Premium moments only. */
export const GOLD = '#E9C9A0'
export const GOLD_GRADIENT = `linear-gradient(180deg, #F2D9B3, ${GOLD} 55%, #C9A574)`
export const PREMIUM_BENEFITS: { key: string; icon: LucideIcon; title: string; line: string }[] = [
  { key: 'talk', icon: MessageCircle, title: 'Unlimited conversations', line: 'Talk with Voxu as much as you like — free has 20 a week.' },
  { key: 'voice', icon: Mic, title: 'Voxu’s voice', line: '30 spoken replies a day — free has 7 a week.' },
  { key: 'experiments', icon: BarChart3, title: 'Your laws, tested', line: '7-day experiments, and the charts behind your patterns.' },
  { key: 'lesson', icon: Book, title: 'The full psychology library', line: 'All 15 lessons — free has 4.' },
  { key: 'audio', icon: Headphones, title: 'Every guided session', line: 'The whole library — free has a starter four.' },
  { key: 'memory', icon: Sparkles, title: 'A coach that remembers', line: 'Voxu reads your last 30 days — and day one.' },
  { key: 'recap', icon: Crown, title: 'The Era Recap', line: 'A letter at day 30, and a year of progress.' },
  { key: 'widget', icon: Zap, title: 'Premium widgets', line: 'Guided and Voxu-noticed, on your home screen.' },
]

