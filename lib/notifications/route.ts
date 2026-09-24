/**
 * Where a tapped notification goes.
 *
 * This was the last hop in the routine work with nothing behind it: a
 * notification carries a route, the tap handler pushes it, and whether that
 * path is a page nobody could say without a phone in their hand. It was also
 * two different implementations — the local handler pushed whatever the
 * payload said, while the push handler checked it was a same-app path first —
 * so one of them would have followed a route the other refused.
 *
 * One function now, pure, and a gate test that walks every route a routine
 * can emit and asserts the page exists on disk. The only part that still
 * needs a device is whether the OS delivers the notification at all.
 *
 * It always returns a path. A tap that resolved to nothing would leave
 * somebody staring at the screen they were already on, which reads as the
 * notification being broken.
 */

/**
 * Routes that moved, and where they moved to.
 *
 * Kept because notifications OUTLIVE deploys: one scheduled last month is
 * still on somebody's phone carrying last month's path, and a local
 * notification can be months old. Deleting a row here breaks every
 * notification already sitting on a device.
 */
export const NOTIFICATION_ROUTE_MAP: Record<string, string> = {
  // The Daily Guide page is retired; home runs the session flow.
  '/guide': '/',
  '/journal': '/journal',
  '/coach': '/coach',
  '/progress': '/progress',
}

/** Where a tap lands when the payload says nothing usable. */
export const NOTIFICATION_FALLBACK_ROUTE = '/'

/**
 * A route, or home.
 *
 * Same-app paths only. `//evil.com` is a protocol-relative URL that a router
 * would happily treat as external, and a notification is exactly where a
 * payload arrives from further away than anybody checks.
 */
export function resolveNotificationRoute(target: unknown): string {
  if (typeof target !== 'string') return NOTIFICATION_FALLBACK_ROUTE

  const path = target.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return NOTIFICATION_FALLBACK_ROUTE

  return NOTIFICATION_ROUTE_MAP[path] ?? path
}
