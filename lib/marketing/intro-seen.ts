// The app's intro story (/intro) plays once, on first launch.
export const INTRO_KEY = 'voxu-intro-seen'

export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return true // storage blocked: never trap anyone in the story
  }
}

export function markIntroSeen() {
  try {
    localStorage.setItem(INTRO_KEY, '1')
  } catch {
    /* ignore */
  }
}
