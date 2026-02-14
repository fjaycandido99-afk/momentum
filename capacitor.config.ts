import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.voxu.app',
  appName: 'Voxu',
  webDir: 'out',
  server: {
    // Production: use your deployed web app
    url: 'https://voxu.app',
    // For development, uncomment below and comment the above:
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#8B5CF6',
      sound: 'notification.wav',
    },
    NativeAudio: {
      preload: true,
      focus: true,
    },
    App: {},
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0a0f',
    // Background audio mode will be configured in Xcode:
    // 1. Enable "Audio, AirPlay, and Picture in Picture" in Background Modes
    // 2. Enable Push Notifications capability
    // 3. Add your APNs key to Apple Developer account
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: true,
    // Background audio handled via foreground service
  },
}

export default config
