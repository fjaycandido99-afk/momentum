// Service Worker for Push Notifications

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installed')
  self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated')
  event.waitUntil(clients.claim())
})

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
