import { describe, it, expect } from 'vitest'
import { parseInviteLink } from '@/lib/referral/invite-link'

describe('parseInviteLink', () => {
  it('reads a friend’s join link', () => {
    expect(parseInviteLink('https://voxu.app/join/locked-in?from=cmabc12345xyz')).toEqual({ kind: 'era', eraId: 'cmabc12345xyz' })
    expect(parseInviteLink('voxu.app/join/locked-in?from=cmabc12345xyz')).toEqual({ kind: 'era', eraId: 'cmabc12345xyz' })
  })
  it('reads creator links and bare codes', () => {
    expect(parseInviteLink('https://voxu.app/i/gymtok')).toEqual({ kind: 'code', code: 'gymtok' })
    expect(parseInviteLink('  GymTok ')).toEqual({ kind: 'code', code: 'gymtok' })
  })
  it('refuses other sites, a join link with no friend, and junk', () => {
    expect(parseInviteLink('https://evil.example/i/gymtok')).toBeNull()
    expect(parseInviteLink('https://voxu.app/join/locked-in')).toBeNull()
    expect(parseInviteLink('https://voxu.app/settings')).toBeNull()
    expect(parseInviteLink('admin')).toBeNull()
    expect(parseInviteLink('')).toBeNull()
    expect(parseInviteLink(42)).toBeNull()
  })
})
