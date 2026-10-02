/**
 * One line per coin: what it MEANS, shown under its title when it's unlocked
 * (the description below it says what it took). Voxu's voice — plain, no
 * exclamation marks, no hype; a sentence about the person, not the app.
 * Every achievement has one (pinned in lib/__tests__/achievements.test.ts).
 */
export const ACHIEVEMENT_LINES: Record<string, string> = {
  // Era
  era_first_promise: 'A promise said out loud is one you can keep.',
  era_first_kept: 'You said it. Then you did it. That’s the whole thing.',
  era_custom: 'You wrote the month you wanted to live.',
  era_comeback: 'A miss isn’t the story. What you did next is.',
  era_kept_7: 'Seven times, your word held.',
  era_streak_7: 'Seven days, seven promises. No gaps.',
  era_kept_25: 'When you say it now, it means something.',
  era_complete: 'Thirty days. You stayed to the end.',
  era_second: 'Once could be luck. Twice is who you are.',
  era_reflection: 'The month, kept in a line only you could write.',
  era_carried: 'An era ended. The good part didn’t.',
  era_carried_3: 'Three eras, and something from each still stands.',
  era_return: 'You rested. Then you came back. Both count.',
  era_comeback_5: 'Five misses, five returns. You don’t stay down.',
  era_streak_30: 'A promise every day for a month, unbroken.',
  era_kept_50: 'Fifty kept. Your word is a habit now.',
  era_three: 'Three chapters finished. This is a pattern, not a phase.',
  era_kept_100: 'A hundred times, you did what you said.',
  era_five: 'Five eras. You keep becoming someone new.',
  era_flawless: 'Every promise you checked in on, kept.',

  // One coin per era
  era_done_locked_in: 'You stopped drifting and did the work that mattered.',
  era_done_discipline: 'Thirty days of doing it when you didn’t feel like it.',
  era_done_comeback: 'You rebuilt. The hard stretch is behind you.',
  era_done_gym_arc: 'Thirty days of showing up for your body.',
  era_done_stoic_mode: 'You controlled what you could and let go of the rest.',
  era_done_confidence: 'You spoke up and took up space.',
  era_done_study: 'Deep work, every day, for a month.',
  era_done_five_am: 'You owned the morning before the world woke up.',
  era_done_custom: 'An era you named, finished on your terms.',

  // Disciplines
  practice_first_kept: 'The first day is the hardest one to start.',
  practice_floor: 'You didn’t want to. You did the minimum. That counts.',
  practice_kept_10: 'Ten days in. It’s starting to be yours.',
  practice_back_on: 'Missed one. Didn’t miss two.',
  practice_run_7: 'Every day it was due, for a week.',
  practice_run_14: 'Two weeks without a gap.',
  practice_three: 'Three things you keep, all at once.',
  practice_kept_30: 'Thirty times. Habits are built out of these.',
  practice_floor_10: 'Ten hard days, and the floor held every time.',
  practice_back_5: 'You’ve come back five times. You’ll come back again.',
  practice_run_30: 'Thirty times running. Nothing broke the line.',
  practice_kept_100: 'A hundred days. This is just what you do now.',

  // Mindset exercises
  exercise_first: 'You stopped and sat with it. That’s the start.',
  exercise_10: 'Ten times you made room to slow down.',
  exercise_variety_5: 'Five different ways to steady yourself.',
  exercise_50: 'Fifty sessions. Calm is a skill you’re building.',
  exercise_days_30: 'Thirty separate days you made the time.',

  // Books
  book_first: 'Most books don’t get finished. This one did.',
  book_5: 'Five books, read to the last page.',
  book_12: 'Twelve books. A year’s worth of other minds.',

  // Right now
  reset_first: 'It got loud. You brought it back down.',
  reset_helped: 'By your own measure, you left calmer than you came.',
  reset_10: 'Ten times you steadied yourself instead of spiralling.',

  // Proof
  proof_7: 'Seven days with something to show for them.',
  proof_30: 'Thirty days you can point to.',
  proof_100: 'A hundred days that left a mark.',
  proof_365: 'A whole year of days that held something kept.',

  // Streaks
  streak_3: 'Three days. Something caught.',
  streak_7: 'A full week. The flame is steady.',
  streak_14: 'Two weeks. It’s carrying itself now.',
  streak_30: 'A month without breaking the chain.',
  streak_60: 'Sixty days. This is part of you now.',
  streak_100: 'A hundred days in the fire.',
  streak_365: 'A full year. Roots this deep don’t pull up.',

  // Explorer
  first_journal: 'The first page is the bravest one.',
  first_soundscape: 'You found a sound to think in.',
  first_routine: 'You built a shape for your day.',
  genre_explorer: 'Five kinds of sound, five kinds of focus.',
  all_modules: 'You tried every kind of session there is.',
  genre_explorer_audio: 'Five genres, each one a different room.',
  all_genres: 'Every genre. You know what each one does for you.',

  // Dedication
  early_bird: 'Done before most people were awake.',
  night_owl: 'Still showing up when the day was over.',
  full_day_5x: 'Five full days, every session done.',
  weekend_warrior: 'You kept going when nobody was asking.',
  modules_50: 'Fifty sessions finished. Steady work.',
  listener_1hr: 'Your first full hour of sound.',
  listener_5hr: 'Five hours of listening in.',
  listener_10hr: 'Ten hours. This is part of your days now.',
  listener_100hr: 'A hundred hours of quiet, made on purpose.',

  // Mastery
  xp_500: 'Five hundred points of showing up.',
  xp_2000: 'Two thousand points, earned one day at a time.',
  xp_5000: 'Five thousand. That’s a lot of days you chose to.',
  level_5: 'Level five. You’ve been at this a while.',
  flow_master: 'An hour without coming up for air.',
  deep_flow: 'Two hours, all the way under.',

  // Growth
  journal_7: 'Seven entries. You’re getting to know yourself.',
  journal_30: 'A month of your own mind, on paper.',
  mood_tracker: 'Ten times you stopped to notice how you were.',
  breathing_10: 'Ten times, you chose a breath over a reaction.',
  goal_complete: 'You set it. You hit it.',

  // Consistency (listening)
  listening_streak_7: 'Seven days in a row, you came back to listen.',
  listening_streak_30: 'A month of listening, every single day.',

  // Retired — still shown to the people who hold them
  path_first: 'You found the path and walked a full day of it.',
  path_7: 'Seven full days on the path.',
  path_21: 'Twenty-one days. The path knows your feet.',
  path_streak_7: 'A week on the path without a break.',
  path_streak_30: 'Thirty days on the path, unwavering.',
  virtue_tracker: 'A virtue, kept in view for a week.',

  // Secret
  midnight_owl: 'The rare hour, and you were here.',
  perfect_week: 'Seven days, every session. Nothing left out.',
  midnight_listener: 'The small hours, and something to keep you company.',
}

/** The line for an achievement, or null if it has none. */
export function achievementLine(id: string): string | null {
  return ACHIEVEMENT_LINES[id] ?? null
}
