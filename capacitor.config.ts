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
      smallIcon: 'ic_launcher',
      iconColor: '#8B5CF6',
      sound: 'notification.wav',
    },
    NativeAudio: {
      preload: true,
      focus: false, // Don't request exclusive audio focus — allows simultaneous playback
    },
    App: {},
  },
  ios: {
    contentInset: 'automatic',
    // Pure black to match the web UI's bg-black. The previous #0a0a0f was a
    // cooler near-black that the iPhone's rounded screen corners revealed
    // behind the WebView — reading as teal-tinted corners against the header.
    backgroundColor: '#000000',
    // Background audio mode will be configured in Xcode:
    // 1. Enable "Audio, AirPlay, and Picture in Picture" in Background Modes
    // 2. Enable Push Notifications capability
    // 3. Add your APNs key to Apple Developer account
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: true,
    // Background audio handled via foreground service
  },
}

export default config
