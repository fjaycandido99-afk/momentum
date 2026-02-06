// Service Worker for Push Notifications + Offline Caching

// --- Cache configuration ---
const CACHE_VERSION = 'v1'
const SHELL_CACHE = `${CACHE_VERSION}-shell`
const IMAGE_CACHE = `${CACHE_VERSION}-images`
const AUDIO_CACHE = `${CACHE_VERSION}-audio`
const API_CACHE = `${CACHE_VERSION}-api`

const ALL_CACHES = [SHELL_CACHE, IMAGE_CACHE, AUDIO_CACHE, API_CACHE]

// Precache these on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/apple-touch-icon.png',
]

const IMAGE_MAX_ENTRIES = 100
const AUDIO_MAX_ENTRIES = 20
const API_MAX_ENTRIES = 50

// --- Install event: precache shell ---
self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('Precache failed for some URLs:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// --- Activate event: clean old caches ---
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => !ALL_CACHES.includes(key))
          .map((key) => {
            console.log('Deleting old cache:', key)
            return caches.delete(key)
          })
      )
    }).then(() => clients.claim())
  )
})

// --- Fetch interception ---
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Skip cross-origin requests (YouTube, external CDNs, etc.)
  if (url.origin !== self.location.origin) return

  // Skip Next.js internal paths — Next.js handles its own caching
  // via content-hashed filenames in production, and these change
  // constantly in dev mode (HMR/hot reload chunks)
  if (url.pathname.startsWith('/_next/')) return

  // Route to appropriate caching strategy
  if (url.pathname.startsWith('/backgrounds/')) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, IMAGE_MAX_ENTRIES))
  } else if (url.pathname === '/api/daily-guide/audio' || url.pathname === '/api/tts') {
    event.respondWith(networkFirst(request, AUDIO_CACHE, AUDIO_MAX_ENTRIES))
  } else if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, API_MAX_ENTRIES))
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE))
  } else if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(request, SHELL_CACHE))
  }
  // Everything else: passthrough (browser default)
})

function isStaticAsset(pathname) {
  return /\.(js|css|svg|png|jpg|jpeg|webp|gif|ico|woff|woff2|ttf|eot)$/.test(pathname)
}

// --- Cache-first strategy ---
async function cacheFirst(request, cacheName, maxEntries) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
      if (maxEntries) trimCache(cacheName, maxEntries)
    }
    return response
  } catch {
    // Offline and not cached — return a basic offline response
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// --- Network-first strategy ---
async function networkFirst(request, cacheName, maxEntries) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, response.clone())
      if (maxEntries) trimCache(cacheName, maxEntries)
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// --- Trim cache to max entries (LRU) ---
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length > maxEntries) {
    // Delete oldest entries first
    const toDelete = keys.length - maxEntries
    for (let i = 0; i < toDelete; i++) {
      await cache.delete(keys[i])
    }
  }
}

// ==========================================
// Push Notifications (preserved from original)
// ==========================================

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received')

  let data = {
    title: 'Daily Guide',
    body: 'Time for your daily check-in!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    tag: 'daily-guide',
    data: {
      url: '/',
    },
  }

  // Try to parse the push data
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      console.error('Error parsing push data:', e)
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.svg',
    badge: data.badge || '/icon-192.svg',
    tag: data.tag || 'daily-guide',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: data.actions || [
      { action: 'open', title: 'Open App' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
    requireInteraction: data.requireInteraction || false,
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen)
          return client.focus()
        }
      }
      // No window open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Background sync (optional - for offline support)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-checkins') {
    console.log('Background sync: syncing checkins')
    // Could sync offline data here
  }
})

// ==========================================
// Widget support (preserved from original)
// ==========================================

// Widget support - handle widget installation
self.addEventListener('widgetinstall', (event) => {
  console.log('Widget installed:', event.widget.definition.tag)

  // Update the widget with initial data
  event.waitUntil(updateWidget(event.widget))
})

// Widget click handling
self.addEventListener('widgetclick', (event) => {
  console.log('Widget clicked:', event.action)

  if (event.action === 'openApp') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Widget resume - update data when widget becomes visible
self.addEventListener('widgetresume', (event) => {
  event.waitUntil(updateWidget(event.widget))
})

// Periodic widget update
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'widget-update') {
    event.waitUntil(updateAllWidgets())
  }
})

// Helper function to update a widget
async function updateWidget(widget) {
  const tag = widget.definition.tag

  try {
    // Get widget data from the app
    const data = await getWidgetData(tag)

    // Update the widget
    await widget.updateByTag(tag, { data })
  } catch (error) {
    console.error('Error updating widget:', error)
  }
}

// Update all installed widgets
async function updateAllWidgets() {
  const widgets = await self.widgets.getByTag('*')

  for (const widget of widgets) {
    await updateWidget(widget)
  }
}

// Get widget data based on tag
async function getWidgetData(tag) {
  const hour = new Date().getHours()
  let greeting = 'Good morning'
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon'
  else if (hour >= 17) greeting = 'Good evening'

  // Default data - in production this would fetch from the API
  if (tag === 'daily-progress') {
    return {
      greeting: greeting,
      completedModules: 0,
      totalModules: 4,
      streak: 0,
    }
  }

  if (tag === 'streak-counter') {
    return {
      streak: 0,
      message: 'Start your streak today!',
    }
  }

  return {}
}
