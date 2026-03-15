import { registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

export interface AudioAnalyzerPlugin {
  loadBase64(options: { data: string }): Promise<{ duration: number }>
  play(): Promise<void>
  pause(): Promise<{ currentTime: number }>
  resume(): Promise<void>
  stop(): Promise<void>
  seek(options: { time: number }): Promise<{ currentTime: number }>
  getCurrentTime(): Promise<{ currentTime: number }>
  getDuration(): Promise<{ duration: number }>
  addListener(
    eventName: 'frequencyData',
    listenerFunc: (data: { bands: number[] }) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'playbackProgress',
    listenerFunc: (data: { currentTime: number; duration: number; isPlaying: boolean }) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'playbackComplete',
    listenerFunc: () => void,
  ): Promise<PluginListenerHandle>
}

export const AudioAnalyzer = registerPlugin<AudioAnalyzerPlugin>('AudioAnalyzer')

/**
 * Adapter that receives frequency band data from the native plugin
 * and exposes it via the same interface as Web Audio's AnalyserNode.
 * This lets CircularVisualizer work with both native and web data sources.
 */
export class NativeAnalyserAdapter {
  frequencyBinCount: number
  private bands: number[]

  constructor(bandCount: number = 64) {
    this.frequencyBinCount = bandCount
    this.bands = new Array(bandCount).fill(0)
  }

  /** Called by the frequencyData listener to update bands */
  updateBands(bands: number[]) {
    this.bands = bands
  }

  /** Compatible with AnalyserNode.getByteFrequencyData */
  getByteFrequencyData(array: Uint8Array) {
    for (let i = 0; i < array.length && i < this.bands.length; i++) {
      array[i] = Math.max(0, Math.min(255, Math.round(this.bands[i])))
    }
  }
}
