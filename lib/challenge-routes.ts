/**
 * Where to go to do a challenge or mission. Tapping one on Progress used to
 * do nothing; now it opens the screen where it can be done.
 *
 * `/?play=guide:<id>` and `/?play=soundscape:<id>` are handled by home
 * (ImmersiveHome), which opens that player directly.
 */
const ROUTES: Record<string, string> = {
  // Daily challenges
  morning_module: '/daily-guide?session=morning_prime',
  evening_module: '/daily-guide?session=wind_down',
  all_modules: '/daily-guide',
  modules_complete: '/daily-guide',
  journal_entry: '/journal',
  gratitude_entry: '/journal',
  journal_words: '/journal',
  mood_log: '/journal',
  coach_chat: '/journal?mode=chat',
  breathing_session: '/?play=guide:breathing',
  soundscape_listen: '/?play=soundscape:focus',
  music_listen: '/',
  goal_progress: '/progress#goals',
  xp_earned: '/',
  // Weekly missions
  journal_days: '/journal',
  modules_total: '/daily-guide',
  breathing_sessions: '/?play=guide:breathing',
  mood_logs: '/journal',
  streak_maintain: '/',
  active_days: '/',
}

export function routeForCondition(type: string | undefined | null): string | null {
  return (type && ROUTES[type]) || null
}
