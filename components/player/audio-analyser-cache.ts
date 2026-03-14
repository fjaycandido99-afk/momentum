// Shared WeakMap caches for Web Audio API nodes
// Each HTMLAudioElement can only have ONE MediaElementSource, so all visualizers must share these
export const sourceCache = new WeakMap<HTMLAudioElement, MediaElementAudioSourceNode>()
export const contextCache = new WeakMap<HTMLAudioElement, AudioContext>()
export const analyserCache = new WeakMap<HTMLAudioElement, AnalyserNode>()
