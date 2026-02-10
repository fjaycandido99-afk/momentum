export interface UnlockableReward {
  id: string
  title: string
  description: string
  icon: string
  requiredLevel: number
  type: 'soundscape' | 'theme' | 'guided' | 'feature'
}

export const UNLOCKABLE_REWARDS: UnlockableReward[] = [
  { id: 'deep_ocean', title: 'Deep Ocean Sounds', description: 'Immersive ocean soundscape', icon: '🌊', requiredLevel: 2, type: 'soundscape' },
  { id: 'dark_theme', title: 'Midnight Theme', description: 'Ultra-dark visual theme', icon: '🌑', requiredLevel: 3, type: 'theme' },
  { id: 'forest_rain', title: 'Forest Rain', description: 'Rainforest ambient sounds', icon: '🌧️', requiredLevel: 3, type: 'soundscape' },
  { id: 'focus_guide', title: 'Deep Focus Guide', description: 'Extended focus session', icon: '🎯', requiredLevel: 4, type: 'guided' },
  { id: 'aurora_theme', title: 'Aurora Theme', description: 'Northern lights inspired theme', icon: '🌌', requiredLevel: 5, type: 'theme' },
  { id: 'tibetan_bowls', title: 'Tibetan Bowls', description: 'Singing bowl meditation', icon: '🔔', requiredLevel: 6, type: 'soundscape' },
  { id: 'sleep_guide', title: 'Sleep Mastery Guide', description: 'Advanced sleep session', icon: '💤', requiredLevel: 7, type: 'guided' },
  { id: 'cosmic_theme', title: 'Cosmic Theme', description: 'Space-inspired visuals', icon: '🪐', requiredLevel: 8, type: 'theme' },
  { id: 'zen_garden', title: 'Zen Garden Sounds', description: 'Japanese garden ambience', icon: '🎋', requiredLevel: 9, type: 'soundscape' },
  { id: 'master_badge', title: 'Master Badge', description: 'Ultimate profile badge', icon: '👑', requiredLevel: 10, type: 'feature' },
]

export function getUnlockedRewards(level: number): UnlockableReward[] {
  return UNLOCKABLE_REWARDS.filter(r => r.requiredLevel <= level)
}

export function getLockedRewards(level: number): UnlockableReward[] {
  return UNLOCKABLE_REWARDS.filter(r => r.requiredLevel > level)
}

export function getNextReward(level: number): UnlockableReward | null {
  return UNLOCKABLE_REWARDS.find(r => r.requiredLevel > level) || null
}
