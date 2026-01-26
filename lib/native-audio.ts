import { Capacitor } from '@capacitor/core'
import { NativeAudio } from '@capacitor-community/native-audio'
import { LocalNotifications } from '@capacitor/local-notifications'

// Check if running in native app
export const isNative = Capacitor.isNativePlatform()

interface AudioOptions {
  assetId: string
  assetPath: string
  volume?: number
  isUrl?: boolean
}

// Initialize native audio for background playback
export async function initNativeAudio() {
  if (!isNative) return

  try {
    // Request notification permissions for scheduled reminders
    const permStatus = await LocalNotifications.requestPermissions()
    console.log('[NativeAudio] Notification permission:', permStatus.display)
  } catch (error) {
    console.error('[NativeAudio] Init error:', error)
  }
}

// Preload an audio file for faster playback
export async function preloadAudio(options: AudioOptions) {
  if (!isNative) return

  try {
    await NativeAudio.preload({
      assetId: options.assetId,
      assetPath: options.assetPath,
      audioChannelNum: 1,
      isUrl: options.isUrl ?? false,
    })
    console.log(`[NativeAudio] Preloaded: ${options.assetId}`)
  } catch (error) {
    console.error(`[NativeAudio] Preload error for ${options.assetId}:`, error)
  }
}

// Play audio (works in background on native)
export async function playNativeAudio(assetId: string, volume = 1.0) {
  if (!isNative) return false

  try {
    await NativeAudio.play({
      assetId,
      time: 0,
    })
    await NativeAudio.setVolume({ assetId, volume })
    console.log(`[NativeAudio] Playing: ${assetId}`)
    return true
  } catch (error) {
    console.error(`[NativeAudio] Play error for ${assetId}:`, error)
    return false
  }
}

// Play audio from URL (for dynamic content like TTS)
export async function playFromUrl(url: string, assetId: string) {
  if (!isNative) return false

  try {
    // Preload from URL
    await NativeAudio.preload({
      assetId,
      assetPath: url,
      audioChannelNum: 1,
      isUrl: true,
    })

    // Play it
    await NativeAudio.play({
      assetId,
      time: 0,
    })

    console.log(`[NativeAudio] Playing from URL: ${assetId}`)
    return true
  } catch (error) {
    console.error(`[NativeAudio] URL play error:`, error)
    return false
  }
}

// Pause audio
export async function pauseNativeAudio(assetId: string) {
  if (!isNative) return

  try {
    await NativeAudio.pause({ assetId })
  } catch (error) {
    console.error(`[NativeAudio] Pause error for ${assetId}:`, error)
  }
}

// Resume audio
export async function resumeNativeAudio(assetId: string) {
  if (!isNative) return

  try {
    await NativeAudio.resume({ assetId })
  } catch (error) {
    console.error(`[NativeAudio] Resume error for ${assetId}:`, error)
  }
}

// Stop audio
export async function stopNativeAudio(assetId: string) {
  if (!isNative) return

  try {
    await NativeAudio.stop({ assetId })
  } catch (error) {
    console.error(`[NativeAudio] Stop error for ${assetId}:`, error)
  }
}

// Unload audio to free memory
export async function unloadAudio(assetId: string) {
  if (!isNative) return

  try {
    await NativeAudio.unload({ assetId })
  } catch (error) {
    console.error(`[NativeAudio] Unload error for ${assetId}:`, error)
  }
}

// Set volume (0.0 to 1.0)
export async function setNativeVolume(assetId: string, volume: number) {
  if (!isNative) return

  try {
    await NativeAudio.setVolume({ assetId, volume })
  } catch (error) {
    console.error(`[NativeAudio] Volume error for ${assetId}:`, error)
  }
}

// Schedule a local notification (for daily reminders)
export async function scheduleReminder(options: {
  id: number
  title: string
  body: string
  hour: number
  minute: number
}) {
  if (!isNative) return

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: options.id,
          title: options.title,
          body: options.body,
          schedule: {
            on: {
              hour: options.hour,
              minute: options.minute,
            },
            repeats: true,
          },
          sound: 'notification.wav',
          actionTypeId: 'DAILY_REMINDER',
        },
      ],
    })
    console.log(`[NativeAudio] Scheduled reminder: ${options.id}`)
  } catch (error) {
    console.error('[NativeAudio] Schedule error:', error)
  }
}

// Cancel a scheduled notification
export async function cancelReminder(id: number) {
  if (!isNative) return

  try {
    await LocalNotifications.cancel({ notifications: [{ id }] })
  } catch (error) {
    console.error('[NativeAudio] Cancel error:', error)
  }
}

// Cancel all scheduled notifications
export async function cancelAllReminders() {
  if (!isNative) return

  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
    }
  } catch (error) {
    console.error('[NativeAudio] Cancel all error:', error)
  }
}

// Listen for notification actions
export function addNotificationListener(
  callback: (notification: { id: number; actionId: string }) => void
) {
  if (!isNative) return () => {}

  const listener = LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (notification) => {
      callback({
        id: notification.notification.id,
        actionId: notification.actionId,
      })
    }
  )

  return () => listener.remove()
}
