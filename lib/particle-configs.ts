export interface ParticleConfig {
  count: number
  color: [number, number, number]
  sizeMin: number
  sizeMax: number
  speedMin: number
  speedMax: number
  driftStrength: number
  oscillation: number
  glowRadius: number
  shape: 'circle' | 'diamond' | 'star'
}

export const MOOD_PARTICLES: Record<string, ParticleConfig> = {
  sleep: {
    count: 25,
    color: [200, 220, 255],
    sizeMin: 0.5,
    sizeMax: 2,
    speedMin: 0.05,
    speedMax: 0.15,
    driftStrength: 0.005,
    oscillation: 0.3,
    glowRadius: 8,
    shape: 'star',
  },
  focus: {
    count: 20,
    color: [255, 180, 80],
    sizeMin: 0.8,
    sizeMax: 2.5,
    speedMin: 0.1,
    speedMax: 0.3,
    driftStrength: 0.01,
    oscillation: 0.5,
    glowRadius: 10,
    shape: 'circle',
  },
  relax: {
    count: 30,
    color: [255, 200, 220],
    sizeMin: 1,
    sizeMax: 3,
    speedMin: 0.05,
    speedMax: 0.2,
    driftStrength: 0.008,
    oscillation: 0.6,
    glowRadius: 6,
    shape: 'circle',
  },
  energy: {
    count: 35,
    color: [255, 255, 200],
    sizeMin: 0.5,
    sizeMax: 1.5,
    speedMin: 0.15,
    speedMax: 0.4,
    driftStrength: 0.015,
    oscillation: 0.2,
    glowRadius: 12,
    shape: 'diamond',
  },
}
