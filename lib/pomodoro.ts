export interface PomodoroConfig {
  id: string
  name: string
  tagline: string
  focusMinutes: number
  breakMinutes: number
  longBreakMinutes: number
  sessionsBeforeLongBreak: number
}

export const POMODORO_PRESETS: PomodoroConfig[] = [
  {
    id: 'quick',
    name: 'Quick Focus',
    tagline: '15 min sprint',
    focusMinutes: 15,
    breakMinutes: 3,
    longBreakMinutes: 10,
    sessionsBeforeLongBreak: 4,
  },
  {
    id: 'classic',
    name: 'Classic',
    tagline: '25/5 Pomodoro',
    focusMinutes: 25,
    breakMinutes: 5,
    longBreakMinutes: 15,
    sessionsBeforeLongBreak: 4,
  },
  {
    id: 'deep',
    name: 'Deep Work',
    tagline: '50 min block',
    focusMinutes: 50,
    breakMinutes: 10,
    longBreakMinutes: 20,
    sessionsBeforeLongBreak: 3,
  },
]

export function formatTimerDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
