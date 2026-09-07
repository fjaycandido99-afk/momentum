import type { CapacitorConfig } from '@capacitor/cli'
import { KeyboardResize } from '@capacitor/keyboard'

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
    // The keyboard was on the default 'native' resize, which resizes the
    // WebView frame when it opens — and a resize is exactly when the double
    // inset above gets re-applied. 'body' keeps the layout stable and lets
    // the page scroll its own content instead of the native layer moving
    // underneath it.
    Keyboard: {
      resize: KeyboardResize.Body,
      resizeOnFullScreen: true,
    },
  },
  ios: {
    // 'never', not 'automatic'.
    //
    // 'automatic' lets WKWebView add its own top content inset for the safe
    // area — but this app already handles the safe area in CSS
    // (viewport-fit=cover plus .safe-area-pt). So the inset gets counted
    // twice, and the page sits ~59px too low. That is the shift Francis has
    // reported repeatedly: once when the Daily Spark modal opened, and again
    // when the keyboard opens on the reflection input. Both are moments when
    // WKWebView re-evaluates its insets.
    //
    // Only the app owning the safe area produces one consistent answer.
    contentInset: 'never',
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
