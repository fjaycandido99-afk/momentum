// Shared WeakMap caches for Web Audio API nodes (used by AudioVisualizer)
// Each HTMLAudioElement can only have ONE MediaElementSource, so all visualizers must share these
export const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()
export const contextCache = new WeakMap<HTMLAudioElement, AudioContext>()
export const analyserCache = new WeakMap<HTMLAudioElement, AnalyserNode>()

/**
 * AudioAnalyserLike — interface for anything that can provide frequency data.
 * Used by CircularVisualizer so it can accept both a real AnalyserNode
 * and our BufferAnalyser fallback for iOS WKWebView.
 */
export interface AudioAnalyserLike {
  frequencyBinCount: number
  getByteFrequencyData(array: Uint8Array): void
}

/**
 * BufferAnalyser — reads amplitude data directly from a decoded AudioBuffer
 * at the HTMLAudioElement's current playback position.
 *
 * This works on ALL platforms including iOS WKWebView where
 * createMediaElementSource silently fails. The data won't be true FFT
 * frequency bins, but it responds to the actual audio content in sync
 * with playback — loud sections pulse, silence is flat.
 */
export class BufferAnalyser implements AudioAnalyserLike {
  frequencyBinCount: number
  private channelData: Float32Array
  private sampleRate: number
  private audioElement: HTMLAudioElement

  constructor(buffer: AudioBuffer, audioElement: HTMLAudioElement, binCount = 64) {
    this.frequencyBinCount = binCount
    this.channelData = buffer.getChannelData(0)
    this.sampleRate = buffer.sampleRate
    this.audioElement = audioElement
  }

  getByteFrequencyData(array: Uint8Array): void {
    const currentTime = this.audioElement.currentTime
    const currentSample = Math.floor(currentTime * this.sampleRate)

    // Analysis window: ~46ms at 44.1kHz — captures speech detail
    const windowSize = 2048
    const start = Math.max(0, currentSample)
    const end = Math.min(this.channelData.length, start + windowSize)
    const actualSize = end - start

    if (actualSize <= 0) {
      array.fill(0)
      return
    }

    const binSize = Math.max(1, Math.floor(actualSize / this.frequencyBinCount))

    for (let i = 0; i < this.frequencyBinCount; i++) {
      const binStart = start + i * binSize
      let sum = 0
      let count = 0
      for (let j = 0; j < binSize && (binStart + j) < this.channelData.length; j++) {
        sum += Math.abs(this.channelData[binStart + j])
        count++
      }
      if (count === 0) {
        array[i] = 0
        continue
      }
      const avg = sum / count
      // Scale to 0-255, boost for visibility (speech is typically quiet)
      array[i] = Math.min(255, Math.floor(avg * 650))
    }
  }
}
