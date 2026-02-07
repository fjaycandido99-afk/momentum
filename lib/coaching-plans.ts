export interface DayPlan {
  day: number
  title: string
  morning: string
  afternoon: string
  evening: string
  reflection: string
}

export interface CoachingPlan {
  id: string
  title: string
  description: string
  icon: string
  color: string
  days: DayPlan[]
}

export const COACHING_PLANS: CoachingPlan[] = [
  {
    id: 'confidence',
    title: 'Build Confidence',
    description: 'Develop unshakable self-belief through daily practices and mindset shifts.',
    icon: 'shield',
    color: 'from-amber-500/20 to-orange-500/20',
    days: [
      { day: 1, title: 'Know Your Strengths', morning: 'Write down 5 things you are genuinely good at. Read them aloud.', afternoon: 'When self-doubt appears, pause and recall one strength from your list.', evening: 'Journal about one moment today where you felt capable.', reflection: 'What did I learn about my abilities today?' },
      { day: 2, title: 'Power Posture', morning: 'Stand tall for 2 minutes. Shoulders back, chin up. Feel the shift.', afternoon: 'Notice your posture throughout the day. Correct it when you slouch.', evening: 'Practice your power pose again before bed.', reflection: 'How did my body language affect my confidence?' },
      { day: 3, title: 'Positive Self-Talk', morning: 'Replace "I can\'t" with "I\'m learning to" for every challenge today.', afternoon: 'Catch one negative thought and reframe it into something constructive.', evening: 'Write 3 affirmations about yourself. Say them in the mirror.', reflection: 'What negative thought did I successfully reframe?' },
      { day: 4, title: 'Comfort Zone Push', morning: 'Choose one small thing outside your comfort zone to do today.', afternoon: 'Do that one thing. It doesn\'t have to be perfect, just done.', evening: 'Celebrate that you did it, regardless of the outcome.', reflection: 'What was the hardest part about stepping out of my comfort zone?' },
      { day: 5, title: 'Celebrate Wins', morning: 'List 3 recent accomplishments, no matter how small.', afternoon: 'Share one accomplishment with someone you trust.', evening: 'Create a "win journal" entry for today.', reflection: 'Why is it important to acknowledge my wins?' },
      { day: 6, title: 'Handle Criticism', morning: 'Think of recent feedback. Separate useful insight from noise.', afternoon: 'Practice receiving a compliment by simply saying "Thank you."', evening: 'Write about a time criticism actually helped you grow.', reflection: 'How can I use feedback as fuel instead of fear?' },
      { day: 7, title: 'Own Your Story', morning: 'Write your personal highlight reel — 5 moments you\'re proud of.', afternoon: 'When doubt creeps in, mentally replay one highlight.', evening: 'Read through all 7 days of reflections. See how far you\'ve come.', reflection: 'What has this week taught me about confidence?' },
    ],
  },
  {
    id: 'stress',
    title: 'Stress Relief',
    description: 'Learn to manage stress with proven techniques for calm and clarity.',
    icon: 'heart',
    color: 'from-emerald-500/20 to-teal-500/20',
    days: [
      { day: 1, title: 'Identify Your Triggers', morning: 'Write down the top 3 situations that stress you the most.', afternoon: 'When stress hits, pause and name it: "I notice I\'m feeling stressed about..."', evening: 'Rate your stress level today from 1-10. No judgment.', reflection: 'What patterns do I notice in my stress triggers?' },
      { day: 2, title: 'The Breath Reset', morning: 'Practice 5 minutes of box breathing (4-4-4-4 pattern).', afternoon: 'Use one conscious breath before responding to any stressful situation.', evening: 'Do a full body scan. Notice where you hold tension.', reflection: 'How did breathing change my stress response?' },
      { day: 3, title: 'Boundaries', morning: 'Identify one boundary you need to set (saying no, limiting screen time, etc).', afternoon: 'Practice that boundary once today.', evening: 'Reflect on how it felt to protect your energy.', reflection: 'What did I learn about boundaries and stress?' },
      { day: 4, title: 'Nature & Movement', morning: 'Spend 10 minutes outside. Notice 5 things you can see, hear, and feel.', afternoon: 'Take a 15-minute walk — no phone, no music. Just walk.', evening: 'Gentle stretching for 5 minutes before bed.', reflection: 'How did movement and nature affect my stress?' },
      { day: 5, title: 'Digital Detox', morning: 'No phone for the first 30 minutes after waking.', afternoon: 'Turn off non-essential notifications for 2 hours.', evening: 'Put your phone in another room 1 hour before bed.', reflection: 'What did I notice without constant digital input?' },
      { day: 6, title: 'Gratitude Reframe', morning: 'Write 3 things you\'re grateful for right now.', afternoon: 'When stress arises, ask: "What can I appreciate about this moment?"', evening: 'Text or tell someone why you appreciate them.', reflection: 'How does gratitude shift my relationship with stress?' },
      { day: 7, title: 'Your Calm Toolkit', morning: 'Create your personal stress-relief toolkit: 5 go-to strategies.', afternoon: 'Use one tool from your toolkit when you feel tension.', evening: 'Review all 7 days. Choose 3 practices to continue.', reflection: 'What tools will I carry forward?' },
    ],
  },
  {
    id: 'productivity',
    title: 'Peak Productivity',
    description: 'Build systems and habits for deep focus and meaningful output.',
    icon: 'target',
    color: 'from-blue-500/20 to-indigo-500/20',
    days: [
      { day: 1, title: 'Clarity First', morning: 'Write your top 3 priorities for today. Circle the most important one.', afternoon: 'Work on your #1 priority for 25 uninterrupted minutes.', evening: 'Did you complete your #1 priority? Celebrate or plan for tomorrow.', reflection: 'How did having clarity change my day?' },
      { day: 2, title: 'Energy Mapping', morning: 'Note when you feel most energized (morning, midday, evening).', afternoon: 'Schedule your hardest task during your peak energy window.', evening: 'Plan tomorrow based on your energy map.', reflection: 'When am I at my best, and am I using that time wisely?' },
      { day: 3, title: 'Elimination Day', morning: 'List everything on your plate. Cross off 3 things that don\'t truly matter.', afternoon: 'Say "no" or "not now" to one request that doesn\'t align with your goals.', evening: 'Notice how much lighter you feel with less on your plate.', reflection: 'What did I remove, and do I miss it?' },
      { day: 4, title: 'Deep Work Block', morning: 'Block 90 minutes for deep, focused work. No distractions.', afternoon: 'Reflect on what you accomplished in your deep work block.', evening: 'Plan tomorrow\'s deep work block in your calendar.', reflection: 'What conditions helped me focus best?' },
      { day: 5, title: 'Batch & Batch', morning: 'Group similar tasks together: all emails at once, all calls at once.', afternoon: 'Batch process one category of tasks and notice the efficiency gain.', evening: 'Identify which tasks you can batch regularly.', reflection: 'How did batching affect my productivity and energy?' },
      { day: 6, title: 'Rest as Strategy', morning: 'Schedule 2 intentional 10-minute breaks today.', afternoon: 'During your break, do nothing productive. Rest fully.', evening: 'Compare your output on days with and without breaks.', reflection: 'How does strategic rest fuel my productivity?' },
      { day: 7, title: 'Your System', morning: 'Design your ideal productive day: wake time, deep work, breaks, wind down.', afternoon: 'Write your top 3 productivity rules based on this week.', evening: 'Review all 7 days. Commit to your system for next week.', reflection: 'What system will I follow going forward?' },
    ],
  },
  {
    id: 'sleep',
    title: 'Better Sleep',
    description: 'Transform your nights with evidence-based sleep hygiene practices.',
    icon: 'moon',
    color: 'from-purple-500/20 to-violet-500/20',
    days: [
      { day: 1, title: 'Sleep Audit', morning: 'Rate last night\'s sleep from 1-10. Note what time you went to bed and woke up.', afternoon: 'Limit caffeine after 2 PM today.', evening: 'Set a consistent bedtime alarm. Get in bed at that time.', reflection: 'What is my current sleep like, honestly?' },
      { day: 2, title: 'Wind-Down Ritual', morning: 'Plan a 30-minute wind-down routine for tonight.', afternoon: 'Dim lights in your home 1 hour before bed.', evening: 'Follow your wind-down routine: no screens, gentle activity.', reflection: 'How did a wind-down routine change how I fell asleep?' },
      { day: 3, title: 'Screen Sunset', morning: 'Set a "screens off" time for 1 hour before bed tonight.', afternoon: 'Put your phone on Do Not Disturb mode by your screens-off time.', evening: 'Replace screen time with reading, journaling, or breathing.', reflection: 'What did I do instead of screens, and how did it feel?' },
      { day: 4, title: 'Optimize Your Room', morning: 'Make your room cooler (65-68F / 18-20C is ideal for sleep).', afternoon: 'Check for light leaks. Get blackout curtains or an eye mask.', evening: 'Sleep in your optimized environment. Notice the difference.', reflection: 'What environmental change had the biggest impact?' },
      { day: 5, title: 'Movement for Sleep', morning: 'Get sunlight exposure within 30 minutes of waking.', afternoon: 'Exercise or move your body for 20+ minutes (not too close to bedtime).', evening: 'Do gentle stretching or yoga before your wind-down.', reflection: 'How did daytime activity affect my sleep quality?' },
      { day: 6, title: 'Quiet the Mind', morning: 'Write down anything worrying you. Get it out of your head onto paper.', afternoon: 'Practice the 4-7-8 breathing technique once today.', evening: 'If thoughts race at bedtime, do a brain dump: write everything down.', reflection: 'How did externalizing my thoughts help me relax?' },
      { day: 7, title: 'Your Sleep Protocol', morning: 'Review your sleep ratings from this week. Notice the trend.', afternoon: 'Write your personal sleep protocol: 5 non-negotiable habits.', evening: 'Follow your full sleep protocol tonight.', reflection: 'What 3 sleep habits will I keep for life?' },
    ],
  },
]

const PLAN_PROGRESS_KEY = 'voxu_coaching_progress'
const ACTIVE_PLAN_KEY = 'voxu_active_plan'

interface PlanProgress {
  planId: string
  completedDays: number[]
  startedAt: number
}

function getProgressMap(): Record<string, PlanProgress> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(PLAN_PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgressMap(map: Record<string, PlanProgress>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(PLAN_PROGRESS_KEY, JSON.stringify(map))
  } catch {}
}

export function getActivePlan(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_PLAN_KEY)
}

export function setActivePlan(planId: string | null) {
  if (typeof window === 'undefined') return
  if (planId) {
    localStorage.setItem(ACTIVE_PLAN_KEY, planId)
    const map = getProgressMap()
    if (!map[planId]) {
      map[planId] = { planId, completedDays: [], startedAt: Date.now() }
      saveProgressMap(map)
    }
  } else {
    localStorage.removeItem(ACTIVE_PLAN_KEY)
  }
}

export function getPlanProgress(planId: string): PlanProgress | null {
  const map = getProgressMap()
  return map[planId] || null
}

export function markDayComplete(planId: string, day: number) {
  const map = getProgressMap()
  if (!map[planId]) {
    map[planId] = { planId, completedDays: [], startedAt: Date.now() }
  }
  if (!map[planId].completedDays.includes(day)) {
    map[planId].completedDays.push(day)
  }
  saveProgressMap(map)
}
