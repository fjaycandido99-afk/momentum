// Push Notification Utilities
// Supports: Web Push (PWA), iOS PWA (16.4+), and Native App wrappers (Capacitor)

// Detect platform
export function getPlatform(): 'ios' | 'android' | 'web' {
  if (typeof window === 'undefined') return 'web'

  const userAgent = window.navigator.userAgent.toLowerCase()

  // Check for iOS
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios'
  }

  // Check for Android
  if (/android/.test(userAgent)) {
    return 'android'
  }

  return 'web'
}

// Check if running as installed PWA
export function isInstalledPWA(): boolean {
  if (typeof window === 'undefined') return false

  // Check display-mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches

  // iOS specific check
  const isIOSStandalone = (window.navigator as any).standalone === true

  return isStandalone || isIOSStandalone
}

// Check if running in native app wrapper (Capacitor/Cordova)
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Capacitor
  if ((window as any).Capacitor?.isNativePlatform?.()) {
    return true
  }

  // Check for Cordova
  if ((window as any).cordova) {
    return true
  }

  return false
}

// Check if push notifications are supported
export function isPushSupported(): boolean {
  if (typeof window === 'undefined') return false

  // Native app - assume supported (will use native plugins)
  if (isNativeApp()) {
    return true
  }

  // Web/PWA check
  const hasServiceWorker = 'serviceWorker' in navigator
  const hasPushManager = 'PushManager' in window
  const hasNotification = 'Notification' in window

  // iOS PWA requires iOS 16.4+ and must be installed
  const platform = getPlatform()
  if (platform === 'ios') {
    // Check iOS version (rough check)
    const match = navigator.userAgent.match(/OS (\d+)_/)
    const iosVersion = match ? parseInt(match[1], 10) : 0

    if (iosVersion < 16) {
      console.log('iOS push requires iOS 16.4+')
      return false
    }

    // Must be installed PWA on iOS
    if (!isInstalledPWA()) {
      console.log('iOS push requires app to be added to home screen')
      return false
    }
  }

  return hasServiceWorker && hasPushManager && hasNotification
}

// Get detailed support info for UI
export function getPushSupportInfo(): {
  supported: boolean
  platform: 'ios' | 'android' | 'web'
  isInstalled: boolean
  isNative: boolean
  reason?: string
} {
  const platform = getPlatform()
  const isInstalled = isInstalledPWA()
  const isNative = isNativeApp()
  const supported = isPushSupported()

  let reason: string | undefined

  if (!supported) {
    if (platform === 'ios' && !isInstalled && !isNative) {
      reason = 'Add this app to your home screen to enable notifications'
    } else if (platform === 'ios') {
      reason = 'Notifications require iOS 16.4 or later'
    } else {
      reason = 'Your browser does not support push notifications'
    }
  }

  return { supported, platform, isInstalled, isNative, reason }
}

// Get the current notification permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) {
    return 'unsupported'
  }

  // Native app - check via Capacitor plugin if available
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.PushNotifications) {
    // Capacitor handles this differently, return 'default' to prompt check
    return 'default'
  }

  return Notification.permission
}

// Register the service worker
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.log('Service workers not supported')
    return null
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    })
    console.log('Service Worker registered:', registration.scope)

    // Wait for the service worker to be active
    if (registration.installing) {
      await new Promise<void>((resolve) => {
        registration.installing!.addEventListener('statechange', (e) => {
          if ((e.target as ServiceWorker).state === 'activated') {
            resolve()
          }
        })
      })
    }

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    return null
  }
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported')
  }

  // Native app - use Capacitor plugin
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.PushNotifications) {
    try {
      const { PushNotifications } = (window as any).Capacitor.Plugins
      const result = await PushNotifications.requestPermissions()
      return result.receive === 'granted' ? 'granted' : 'denied'
    } catch (error) {
      console.error('Native permission request failed:', error)
      throw error
    }
  }

  const permission = await Notification.requestPermission()
  return permission
}

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported')
  }

  // Native app - use Capacitor plugin for APNs/FCM
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.PushNotifications) {
    try {
      const { PushNotifications } = (window as any).Capacitor.Plugins

      // Request permission
      const permResult = await PushNotifications.requestPermissions()
      if (permResult.receive !== 'granted') {
        throw new Error('Notification permission denied')
      }

      // Register for push
      await PushNotifications.register()

      // Listen for registration token
      return new Promise((resolve, reject) => {
        PushNotifications.addListener('registration', async (token: { value: string }) => {
          console.log('Native push token:', token.value)

          // Save native token to server
          try {
            await fetch('/api/notifications/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                nativeToken: token.value,
                platform: getPlatform(),
              }),
            })
            resolve(null) // Native doesn't return PushSubscription
          } catch (error) {
            reject(error)
          }
        })

        PushNotifications.addListener('registrationError', (error: any) => {
          reject(new Error(error.error))
        })
      })
    } catch (error) {
      console.error('Native push subscription failed:', error)
      throw error
    }
  }

  // Web Push
  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission denied')
  }

  const registration = await registerServiceWorker()
  if (!registration) {
    throw new Error('Service worker registration failed')
  }

  // Wait for the service worker to be ready
  await navigator.serviceWorker.ready

  try {
    // Get VAPID public key from environment or API
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured - using local notifications only')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    // Send subscription to server
    await saveSubscription(subscription)

    return subscription
  } catch (error) {
    console.error('Push subscription failed:', error)
    throw error
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  // Native app
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.PushNotifications) {
    try {
      const { PushNotifications } = (window as any).Capacitor.Plugins
      await PushNotifications.removeAllListeners()

      // Remove from server
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: getPlatform() }),
      })

      return true
    } catch (error) {
      console.error('Native unsubscribe failed:', error)
      return false
    }
  }

  // Web Push
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (subscription) {
    // Remove from server
    await removeSubscription(subscription)
    // Unsubscribe locally
    return subscription.unsubscribe()
  }

  return false
}

// Get current push subscription
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null
  }

  // Native app - can't get subscription object, check server
  if (isNativeApp()) {
    return null
  }

  try {
    const registration = await navigator.serviceWorker.ready
    return registration.pushManager.getSubscription()
  } catch (error) {
    console.error('Error getting subscription:', error)
    return null
  }
}

// Save subscription to server
async function saveSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        platform: getPlatform(),
      }),
    })
  } catch (error) {
    console.error('Error saving subscription:', error)
  }
}

// Remove subscription from server
async function removeSubscription(subscription: PushSubscription): Promise<void> {
  try {
    await fetch('/api/notifications/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint }),
    })
  } catch (error) {
    console.error('Error removing subscription:', error)
  }
}

// Show a local notification (no server push needed)
export async function showLocalNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  // Native app - use Capacitor local notifications
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.LocalNotifications) {
    try {
      const { LocalNotifications } = (window as any).Capacitor.Plugins
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body: options?.body || '',
          schedule: { at: new Date() },
        }],
      })
      return
    } catch (error) {
      console.error('Native local notification failed:', error)
    }
  }

  // Web notification
  const permission = getNotificationPermission()

  if (permission !== 'granted') {
    console.warn('Notification permission not granted')
    return
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    ...options,
  })
}

// Schedule a local notification
export function scheduleLocalNotification(
  title: string,
  delayMs: number,
  options?: NotificationOptions
): NodeJS.Timeout | number {
  // Native app - use scheduled notifications
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.LocalNotifications) {
    const { LocalNotifications } = (window as any).Capacitor.Plugins
    const notificationId = Date.now()

    LocalNotifications.schedule({
      notifications: [{
        id: notificationId,
        title,
        body: options?.body || '',
        schedule: { at: new Date(Date.now() + delayMs) },
      }],
    })

    return notificationId
  }

  // Web - use setTimeout
  return setTimeout(() => {
    showLocalNotification(title, options)
  }, delayMs)
}

// Cancel a scheduled notification (native only)
export async function cancelScheduledNotification(id: number): Promise<void> {
  if (isNativeApp() && (window as any).Capacitor?.Plugins?.LocalNotifications) {
    const { LocalNotifications } = (window as any).Capacitor.Plugins
    await LocalNotifications.cancel({ notifications: [{ id }] })
  }
}

// Setup native notification listeners
export function setupNativeNotificationListeners(
  onNotificationReceived?: (notification: any) => void,
  onNotificationTapped?: (notification: any) => void
): void {
  if (!isNativeApp()) return

  const Capacitor = (window as any).Capacitor
  if (!Capacitor?.Plugins?.PushNotifications) return

  const { PushNotifications } = Capacitor.Plugins

  // Notification received while app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification: any) => {
    console.log('Push notification received:', notification)
    onNotificationReceived?.(notification)
  })

  // User tapped on notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action: any) => {
    console.log('Push notification action:', action)
    onNotificationTapped?.(action.notification)
  })
}

// Notification types for the app
export type NotificationType =
  | 'morning_reminder'
  | 'checkpoint'
  | 'evening_reminder'
  | 'streak_at_risk'
  | 'weekly_review'

// Default notification content by type
export const NOTIFICATION_CONTENT: Record<NotificationType, { title: string; body: string }> = {
  morning_reminder: {
    title: 'Good Morning!',
    body: 'Start your day with your morning flow.',
  },
  checkpoint: {
    title: 'Check-in Time',
    body: 'Take a moment to breathe and refocus.',
  },
  evening_reminder: {
    title: 'Evening Wind-Down',
    body: 'Time for your day close reflection.',
  },
  streak_at_risk: {
    title: 'Keep Your Streak!',
    body: "Don't forget to complete today's guide.",
  },
  weekly_review: {
    title: 'Weekly Review',
    body: 'Reflect on your week and set intentions.',
  },
}
