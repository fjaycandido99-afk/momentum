import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  NOTIFICATION_FALLBACK_ROUTE,
  NOTIFICATION_ROUTE_MAP,
  resolveNotificationRoute,
} from '@/lib/notifications/route'
import { planRoutine, type RoutineForSchedule } from '@/lib/routines/schedule'
import { ROUTINE_STEP_KINDS, STEP_KINDS } from '@/lib/routines/steps'
import { DEFAULT_URL_BY_TYPE } from '@/lib/push-service'

/**
 * Does a route have a page?
 *
 * Checked against the filesystem, which is the only thing that can answer
 * it: every other layer would happily push a path that renders a 404. This
 * is the test that replaces holding a phone — the one thing a device still
 * has to prove is whether the OS delivers the notification at all.
 */
function pageExists(route: string): boolean {
  const segments = route.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')
  const candidates = segments
    ? [
        join(process.cwd(), 'app', segments, 'page.tsx'),
        join(process.cwd(), 'app', '(dashboard)', segments, 'page.tsx'),
        join(process.cwd(), 'app', '(marketing)', segments, 'page.tsx'),
      ]
    : [
        join(process.cwd(), 'app', 'page.tsx'),
        join(process.cwd(), 'app', '(dashboard)', 'page.tsx'),
      ]

  return candidates.some(existsSync)
}

describe('where a tapped notification goes', () => {
  it('follows a same-app path', () => {
    expect(resolveNotificationRoute('/training')).toBe('/training')
    expect(resolveNotificationRoute('/reset')).toBe('/reset')
  })

  it('redirects a route that moved', () => {
    // A notification scheduled last month is still on somebody's phone
    // carrying last month's path.
    expect(resolveNotificationRoute('/guide')).toBe('/')
  })

  it('refuses to leave the app', () => {
    // `//evil.com` is a protocol-relative URL a router would treat as
    // external, and a notification payload arrives from further away than
    // anybody checks.
    expect(resolveNotificationRoute('//evil.com')).toBe(NOTIFICATION_FALLBACK_ROUTE)
    expect(resolveNotificationRoute('https://evil.com')).toBe(NOTIFICATION_FALLBACK_ROUTE)
    expect(resolveNotificationRoute('evil.com')).toBe(NOTIFICATION_FALLBACK_ROUTE)
  })

  it('always lands somewhere', () => {
    // A tap that resolved to nothing leaves somebody on the screen they
    // were already on, which reads as the notification being broken.
    for (const junk of [undefined, null, '', '   ', 42, {}, []]) {
      expect(resolveNotificationRoute(junk)).toBe(NOTIFICATION_FALLBACK_ROUTE)
    }
  })
})

describe('and whether that page exists', () => {
  it('the fallback does', () => {
    expect(pageExists(NOTIFICATION_FALLBACK_ROUTE)).toBe(true)
  })

  it('every route in the map does', () => {
    for (const [from, to] of Object.entries(NOTIFICATION_ROUTE_MAP)) {
      expect(pageExists(to), `${from} → ${to}`).toBe(true)
    }
  })

  /**
   * The hop the whole file is for.
   *
   * A routine notification is scheduled on the device and fires weeks later.
   * If its route is wrong, the tap opens a 404 and there is no screen
   * anywhere in the app that would ever say so.
   */
  it('every route a ROUTINE notification can carry does', () => {
    const routine: RoutineForSchedule = {
      label: 'Every kind',
      mode: 'timed',
      start_time: null,
      days: [],
      enabled: true,
      steps: ROUTINE_STEP_KINDS.map((kind, i) => ({
        kind,
        // Kinds needing a ref still produce a route; the ref only decides
        // what the notification is CALLED.
        ref: STEP_KINDS[kind].needsRef ? 'p-1' : null,
        label: kind === 'own' ? 'Something of mine' : null,
        time: `${String(6 + i).padStart(2, '0')}:00`,
        position: i,
      })),
    }

    const plan = planRoutine(routine)
    // Every kind, or this test is quietly checking fewer than it claims.
    expect(plan).toHaveLength(ROUTINE_STEP_KINDS.length)

    for (const notification of plan) {
      const resolved = resolveNotificationRoute(notification.route)
      expect(pageExists(resolved), `${notification.title} → ${notification.route} → ${resolved}`).toBe(true)
    }
  })

  it('and the one a sequence routine carries', () => {
    const plan = planRoutine({
      label: 'My mornings',
      mode: 'sequence',
      start_time: '07:00',
      days: [],
      enabled: true,
      steps: [{ kind: 'promise', time: null, position: 0 }],
    })
    expect(plan).toHaveLength(1)
    expect(pageExists(resolveNotificationRoute(plan[0].route))).toBe(true)
  })

  it('every route the SERVER sends a push to does', () => {
    // Same class of bug, one layer over: lib/push-service picks these, and
    // nothing else checks they are pages.
    for (const [type, url] of Object.entries(DEFAULT_URL_BY_TYPE)) {
      if (typeof url !== 'string') continue
      expect(pageExists(resolveNotificationRoute(url)), `${type} → ${url}`).toBe(true)
    }
  })
})
