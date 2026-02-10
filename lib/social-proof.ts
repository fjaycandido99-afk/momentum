interface SocialNudge {
  message: string
  icon: string
}

const STATIC_NUDGES: SocialNudge[] = [
  { message: 'Users who journal daily report 40% better mood', icon: '✨' },
  { message: 'Consistent users see results in just 2 weeks', icon: '📈' },
  { message: 'Morning routines boost productivity by 25%', icon: '🌅' },
  { message: 'Breathing exercises reduce stress in 60 seconds', icon: '🌬️' },
  { message: 'Streaks build habits — keep yours going!', icon: '🔥' },
]

export function computeSocialNudges(stats: {
  streak: number
  totalXP: number
  modulesCompleted: number
  journalCount: number
  level: number
}): SocialNudge[] {
  const nudges: SocialNudge[] = []

  // Stat-based nudges
  if (stats.streak >= 7) {
    nudges.push({ message: `${stats.streak}-day streak! You're in the top tier of consistent users`, icon: '🔥' })
  }
  if (stats.totalXP >= 1000) {
    nudges.push({ message: `${stats.totalXP.toLocaleString()} XP earned — you're building something great`, icon: '⚡' })
  }
  if (stats.modulesCompleted >= 20) {
    nudges.push({ message: `${stats.modulesCompleted} modules completed — dedication pays off`, icon: '💪' })
  }
  if (stats.journalCount >= 10) {
    nudges.push({ message: `${stats.journalCount} journal entries — self-reflection is a superpower`, icon: '📝' })
  }
  if (stats.level >= 3) {
    nudges.push({ message: `Level ${stats.level} — you're growing every day`, icon: '🌟' })
  }

  // If we have stat-based nudges, pick 1. Otherwise pick 1 static.
  if (nudges.length > 0) {
    const idx = (stats.totalXP + stats.streak) % nudges.length
    return [nudges[idx]]
  }

  const staticIdx = (new Date().getDay() + stats.totalXP) % STATIC_NUDGES.length
  return [STATIC_NUDGES[staticIdx]]
}
