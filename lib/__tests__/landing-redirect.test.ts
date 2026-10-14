import { describe, expect, it } from 'vitest'
import { isRealBrowser, shouldSendToLanding } from '@/lib/marketing/landing-redirect'

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0 Mobile/15E148 Safari/604.1'
const IOS_APP = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID_APP = 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36'
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36'
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'

const visitor = (over: Partial<Parameters<typeof shouldSendToLanding>[0]> = {}) =>
  shouldSendToLanding({ path: '/', signedIn: false, userAgent: IOS_SAFARI, cookies: {}, webParam: false, ...over })

describe('landing redirect', () => {
  it('sends a signed-out browser visitor on / to the landing page', () => {
    expect(visitor()).toBe(true)
    expect(visitor({ userAgent: IOS_CHROME })).toBe(true)
    expect(visitor({ userAgent: ANDROID_CHROME })).toBe(true)
    expect(visitor({ userAgent: DESKTOP })).toBe(true)
  })

  it('never redirects the iOS or Android app', () => {
    expect(isRealBrowser(IOS_APP)).toBe(false)
    expect(isRealBrowser(ANDROID_APP)).toBe(false)
    expect(visitor({ userAgent: IOS_APP })).toBe(false)
    expect(visitor({ userAgent: ANDROID_APP })).toBe(false)
    // The app marks itself with a cookie as a second guard.
    expect(visitor({ cookies: { app: true } })).toBe(false)
  })

  it('keeps signed-in people and anyone who chose the browser in the app', () => {
    expect(visitor({ signedIn: true })).toBe(false)
    expect(visitor({ webParam: true })).toBe(false)
    expect(visitor({ cookies: { web: true } })).toBe(false)
  })

  it('only applies to / exactly, and an unknown agent keeps the app', () => {
    expect(visitor({ path: '/era' })).toBe(false)
    expect(visitor({ path: '/download' })).toBe(false)
    expect(visitor({ userAgent: '' })).toBe(false)
  })
})
