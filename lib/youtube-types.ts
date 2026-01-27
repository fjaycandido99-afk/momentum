// YouTube IFrame API Types
// Shared across all components that use YouTube Player

export interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  stopVideo: () => void
  setVolume: (volume: number) => void
  getVolume: () => number
  mute: () => void
  unMute: () => void
  isMuted: () => boolean
  destroy: () => void
  getPlayerState: () => number
  getDuration: () => number
  getCurrentTime: () => number
  seekTo: (seconds: number, allowSeekAhead: boolean) => void
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          height?: string | number
          width?: string | number
          videoId: string
          playerVars?: Record<string, string | number>
          events?: {
            onReady?: (event: { target: YTPlayer }) => void
            onStateChange?: (event: { data: number; target: YTPlayer }) => void
            onError?: (event: { data: number; target: YTPlayer }) => void
          }
        }
      ) => YTPlayer
      PlayerState: {
        PLAYING: number
        PAUSED: number
        ENDED: number
        BUFFERING: number
        CUED: number
      }
    }
    onYouTubeIframeAPIReady: () => void
  }
}
