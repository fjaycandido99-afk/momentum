import { describe, it, expect } from 'vitest'
import { reminderAsk, type AskInput } from '@/lib/notifications/ask'

/** A web user on Chrome who has just made a promise and never been asked. */
const base: AskInput = {
  permission: 'default',
  supported: true,
  platform: 'web',
  isInstalled: false,
  isNative: false,
  alreadyAsked: false,
  hasPromise: true,
}

describe('when to ask for notifications', () => {
  it('asks right after a promise', () => {
    expect(reminderAsk(base)).toBe('enable')
  })

  it('says nothing until they have promised something', () => {
    // A reminder is a service to a promise. Asked on launch, before there is
    // anything to be reminded of, it is a toll booth on the way in.
    expect(reminderAsk({ ...base, hasPromise: false })).toBe('none')
  })

  it('only ever asks once', () => {
    expect(reminderAsk({ ...base, alreadyAsked: true })).toBe('none')
  })

  it('does not ask someone who already said yes', () => {
    expect(reminderAsk({ ...base, permission: 'granted' })).toBe('none')
  })

  it('does not ask someone who said no', () => {
    // That is a decision, not a gap — and the browser will not re-prompt
    // after a denial, so the button could not work even if we showed it.
    expect(reminderAsk({ ...base, permission: 'denied' })).toBe('none')
  })
})

describe('iOS Safari, where the ask is a different ask', () => {
  const iosSafari: AskInput = {
    ...base,
    platform: 'ios',
    supported: false,
    isInstalled: false,
    isNative: false,
  }

  it('asks them to install first, because push does not exist yet', () => {
    // Web push on iOS requires an installed PWA. "Turn on notifications"
    // here produces nothing and teaches the person the button is broken.
    expect(reminderAsk(iosSafari)).toBe('install-first')
  })

  it('asks normally once it is installed', () => {
    expect(reminderAsk({ ...iosSafari, isInstalled: true, supported: true })).toBe('enable')
  })

  it('asks normally inside the native app', () => {
    expect(reminderAsk({ ...iosSafari, isNative: true, supported: true })).toBe('enable')
  })

  it('still respects a previous no on iOS', () => {
    expect(reminderAsk({ ...iosSafari, alreadyAsked: true })).toBe('none')
    expect(reminderAsk({ ...iosSafari, permission: 'granted' })).toBe('none')
  })
})

describe('when nothing can be done about it', () => {
  it('stays quiet on a browser that cannot do push at all', () => {
    // An old browser, or a webview with no PushManager. Offering a button
    // that cannot work is worse than offering nothing.
    expect(reminderAsk({ ...base, supported: false, platform: 'web' })).toBe('none')
    expect(reminderAsk({ ...base, supported: false, platform: 'android' })).toBe('none')
  })

  it('stays quiet when support could not be determined', () => {
    expect(reminderAsk({ ...base, permission: 'unsupported', supported: false })).toBe('none')
  })

  it('trusts `supported` over the platform guess', () => {
    // An installed iOS PWA on 16.4+ reports supported; the platform alone
    // must not send it down the install-first path.
    expect(
      reminderAsk({ ...base, platform: 'ios', supported: true, isInstalled: true }),
    ).toBe('enable')
  })
})
