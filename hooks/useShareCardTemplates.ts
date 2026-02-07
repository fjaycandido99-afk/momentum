'use client'

type ShareFormat = 'square' | 'story'

const SIZES: Record<ShareFormat, { width: number; height: number }> = {
  square: { width: 540, height: 540 },
  story: { width: 540, height: 960 },
}

function createCardHTML(
  content: string,
  gradient: string,
  accent: string,
  label: string,
  subtitle?: string,
  format: ShareFormat = 'square'
): string {
  const { width, height } = SIZES[format]
  return `
    <div style="position:fixed;top:-9999px;left:-9999px;width:${width}px;height:${height}px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:48px;background:${gradient};">
      <div style="position:absolute;inset:16px;border:1px solid ${accent}33;border-radius:16px;"></div>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:24px;">${label}</div>
      <div style="font-size:20px;line-height:1.6;color:rgba(255,255,255,0.95);text-align:center;max-width:420px;">${content}</div>
      ${subtitle ? `<div style="font-size:13px;color:rgba(255,255,255,0.6);margin-top:16px;">${subtitle}</div>` : ''}
      <div style="position:absolute;bottom:24px;font-size:12px;color:rgba(255,255,255,0.3);letter-spacing:1px;">VOXU</div>
    </div>
  `
}

export function generateStreakCard(streak: number, format: ShareFormat = 'square'): string {
  const emoji = streak >= 100 ? '&#128081;' : streak >= 30 ? '&#127942;' : '&#128293;'
  return createCardHTML(
    `${emoji} ${streak} Day Streak`,
    'linear-gradient(135deg, #1a0a0a 0%, #3d1414 50%, #1a0a2e 100%)',
    '#f59e0b',
    'Streak Achievement',
    `Consistency is everything`,
    format
  )
}

export function generateListeningCard(label: string, minutesListened: number, format: ShareFormat = 'square'): string {
  return createCardHTML(
    `&#127911; Listening to ${label}`,
    'linear-gradient(135deg, #0a1a2e 0%, #14143d 50%, #0a1a2e 100%)',
    '#8b5cf6',
    'Currently Vibing',
    `${minutesListened > 0 ? `${minutesListened} min today` : 'Live now'}`,
    format
  )
}

export function generateMoodCard(mood: string, format: ShareFormat = 'square'): string {
  const moodEmojis: Record<string, string> = {
    Stressed: '&#128556;', Tired: '&#128564;', Anxious: '&#128543;',
    Energized: '&#9889;', Happy: '&#128516;', Neutral: '&#128528;',
  }
  return createCardHTML(
    `Feeling ${mood} ${moodEmojis[mood] || ''}`,
    'linear-gradient(135deg, #1a1a0a 0%, #2e2e14 50%, #0a1a2e 100%)',
    '#06b6d4',
    'My Mood Today',
    undefined,
    format
  )
}

export function generateRoutineCard(routineName: string, timesCompleted: number, format: ShareFormat = 'square'): string {
  return createCardHTML(
    `Completed "${routineName}" &#10003;`,
    'linear-gradient(135deg, #0a2e1a 0%, #143d2e 50%, #0a2e1a 100%)',
    '#10b981',
    'Routine Complete',
    `Done ${timesCompleted} time${timesCompleted !== 1 ? 's' : ''}`,
    format
  )
}
