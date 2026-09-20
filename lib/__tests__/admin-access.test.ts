import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isAdminEmail } from '../auth/admin'

/**
 * Who gets the owner's dashboard. Worth pinning down: the failure mode here
 * isn't a broken page, it's someone else reading everyone's numbers.
 */
describe('isAdminEmail', () => {
  const saved = { emails: process.env.ADMIN_EMAILS, owner: process.env.ADMIN_OWNER_EMAIL }

  beforeEach(() => {
    delete process.env.ADMIN_EMAILS
    delete process.env.ADMIN_OWNER_EMAIL
  })
  afterEach(() => {
    process.env.ADMIN_EMAILS = saved.emails
    process.env.ADMIN_OWNER_EMAIL = saved.owner
  })

  it('falls back to the owner when nothing is configured', () => {
    expect(isAdminEmail('fjaycandido99@gmail.com')).toBe(true)
    // Case and stray whitespace are how a real sign-in arrives.
    expect(isAdminEmail('  FJayCandido99@Gmail.com ')).toBe(true)
    expect(isAdminEmail('someone.else@gmail.com')).toBe(false)
  })

  it('lets nobody in without an email', () => {
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail('')).toBe(false)
    expect(isAdminEmail('   ')).toBe(false)
  })

  it('uses the configured list INSTEAD of the fallback, not as well as', () => {
    process.env.ADMIN_EMAILS = 'boss@voxu.app, second@voxu.app'
    expect(isAdminEmail('boss@voxu.app')).toBe(true)
    expect(isAdminEmail('second@voxu.app')).toBe(true)
    // Configuring the list must be able to REMOVE the built-in address.
    expect(isAdminEmail('fjaycandido99@gmail.com')).toBe(false)
  })

  it('also reads ADMIN_OWNER_EMAIL, which already existed for alert mail', () => {
    process.env.ADMIN_OWNER_EMAIL = 'owner@voxu.app'
    expect(isAdminEmail('owner@voxu.app')).toBe(true)
    expect(isAdminEmail('fjaycandido99@gmail.com')).toBe(false)
  })

  it('is not fooled by a lookalike address', () => {
    process.env.ADMIN_EMAILS = 'boss@voxu.app'
    for (const near of ['boss@voxu.app.evil.com', 'xboss@voxu.app', 'boss@voxu.co', 'boss@VOXU.app.']) {
      expect(isAdminEmail(near)).toBe(near === 'boss@voxu.app')
    }
  })
})
