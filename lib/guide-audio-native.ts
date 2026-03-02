import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capacitor-community/native-audio'

export const isNativePlatform = Capacitor.isNativePlatform()
export const GUIDE_NATIVE_AUDIO_ID = 'home-guide-audio'

/** Stop and unload native guide audio. Clears the loaded ref. */
export async function stopGuideNative(loadedRef: { current: boolean }) {
  if (!isNativePlatform || !loadedRef.current) return
  await NativeAudio.stop({ assetId: GUIDE_NATIVE_AUDIO_ID }).catch(() => {})
  await NativeAudio.unload({ assetId: GUIDE_NATIVE_AUDIO_ID }).catch(() => {})
  loadedRef.current = false
}

/** Pause native guide audio (keeps it loaded for resume). */
export async function pauseGuideNative(loadedRef: { current: boolean }) {
  if (!isNativePlatform || !loadedRef.current) return
  await NativeAudio.pause({ assetId: GUIDE_NATIVE_AUDIO_ID }).catch(() => {})
}

/** Resume native guide audio. */
export async function resumeGuideNative(loadedRef: { current: boolean }) {
  if (!isNativePlatform || !loadedRef.current) return
  await NativeAudio.resume({ assetId: GUIDE_NATIVE_AUDIO_ID }).catch(() => {})
}

/** Preload + play base64 audio via NativeAudio. Returns true on success. */
export async function playGuideNative(
  audioBase64: string,
  loadedRef: { current: boolean },
): Promise<boolean> {
  if (!isNativePlatform) return false
  try {
    await NativeAudio.unload({ assetId: GUIDE_NATIVE_AUDIO_ID }).catch(() => {})
    await NativeAudio.preload({
      assetId: GUIDE_NATIVE_AUDIO_ID,
      assetPath: `data:audio/mpeg;base64,${audioBase64}`,
      audioChannelNum: 1,
      isUrl: true,
    })
    loadedRef.current = true
    await NativeAudio.play({ assetId: GUIDE_NATIVE_AUDIO_ID, time: 0 })
    return true
  } catch (error) {
    console.error('[Guide Native Audio] Play failed:', error)
    loadedRef.current = false
    return false
  }
}
