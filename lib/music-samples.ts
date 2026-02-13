// Sample music videos for each genre - used for audio preview in theme selection
// Each sample is a ~20 second preview to help users choose their preferred genre

export interface MusicSample {
  youtubeId: string
  title: string
  channel: string
  previewDuration: number // seconds
}

export const MUSIC_SAMPLES: Record<string, MusicSample> = {
  lofi: {
    youtubeId: 'lTRiuFIWV54',
    title: 'Lofi Hip Hop Beats',
    channel: 'Yellow Brick Cinema',
    previewDuration: 20,
  },
  piano: {
    youtubeId: 'HSOtku1j600',
    title: 'Peaceful Piano',
    channel: 'Soothing Relaxation',
    previewDuration: 20,
  },
  jazz: {
    youtubeId: 'Dx5qFachd3A',
    title: 'Coffee Shop Jazz',
    channel: 'Cafe Music BGM',
    previewDuration: 20,
  },
  classical: {
    youtubeId: 'mIYzp5rcTvU',
    title: 'Classical Focus',
    channel: 'HALIDONMUSIC',
    previewDuration: 20,
  },
  ambient: {
    youtubeId: 'S_MOd40zlYU',
    title: 'Ambient Focus',
    channel: 'Greenred Productions',
    previewDuration: 20,
  },
  study: {
    youtubeId: 'sjkrrmBnpGE',
    title: 'Study Alpha Waves',
    channel: 'Greenred Productions',
    previewDuration: 20,
  },
  sleep: {
    youtubeId: '1ZYbU82GVz4',
    title: 'Deep Sleep Music',
    channel: 'Soothing Relaxation',
    previewDuration: 20,
  },
}

// Get all genre IDs
export const MUSIC_GENRE_IDS = Object.keys(MUSIC_SAMPLES) as Array<keyof typeof MUSIC_SAMPLES>

// Genre display info
export const MUSIC_GENRE_INFO: Record<string, { name: string; tagline: string }> = {
  lofi: { name: 'Lo-Fi', tagline: 'Chill beats to relax' },
  piano: { name: 'Piano', tagline: 'Peaceful keys' },
  jazz: { name: 'Jazz', tagline: 'Smooth vibes' },
  classical: { name: 'Classical', tagline: 'Timeless elegance' },
  ambient: { name: 'Ambient', tagline: 'Atmospheric soundscapes' },
  study: { name: 'Study', tagline: 'Focus music' },
  sleep: { name: 'Sleep', tagline: 'Drift into rest' },
}
