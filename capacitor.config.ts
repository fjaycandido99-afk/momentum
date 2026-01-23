import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.momentum.app',
  appName: 'Momentum',
  webDir: 'out',
  server: {
    // For development, use your local server
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      // iOS specific settings
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#8B5CF6',
      sound: 'notification.wav',
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#0a0a0f',
    // For push notifications, you'll need to:
    // 1. Enable Push Notifications capability in Xcode
    // 2. Add your APNs key to your Apple Developer account
    // 3. Configure the key in your notification service
  },
  android: {
    backgroundColor: '#0a0a0f',
    allowMixedContent: true,
  },
}

export default config
