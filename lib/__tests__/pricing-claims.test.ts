import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  AI_FEATURE_LIMITS,
  AI_MEMORY_DEPTH,
  FREE_TIER_LIMITS,
  TRIAL_DAYS,
} from '@/lib/subscription-constants'

/**
 * Nothing may be advertised that the code does not do.
 *
 * This exists because it had already happened. The pricing page, the upgrade
 * modal and the Terms were all selling "offline downloads" — a feature whose
 * only trace in the codebase is `offline_enabled: false` in a constants file,
 * read by nothing, with no download UI anywhere. The same pages sold "all
 * backgrounds" and "every voice tone", neither of which is gated, and listed
 * "unlimited sessions" and "no time limits" as PREMIUM when free has both.
 *
 * Copy drifts because nothing fails when it does. Now something does.
 */

const FILES = [
  'app/(marketing)/pricing/page.tsx',
  'app/(marketing)/download/page.tsx',
  'app/(marketing)/terms/page.tsx',
  'components/premium/UpgradeModal.tsx',
  'components/premium/TierBanner.tsx',
  'components/premium/SoftLock.tsx',
  'components/premium/FeatureTooltip.tsx',
  'app/(dashboard)/settings/page.tsx',
  'messages/en.json',
]

function read(rel: string): string {
  return readFileSync(join(process.cwd(), rel), 'utf8')
}

/** Copy lines only — ignore the comments that explain these very rules. */
function copyOnly(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')
}

/**
 * Claims only — sentences that DENY a feature are fine and, in the Terms,
 * are the point ("Voxu does not currently offer offline downloads"). A test
 * that can't tell a claim from a disclaimer would push us into silence,
 * which is worse than saying plainly what we don't do.
 */
function claimsOnly(source: string): string {
  return copyOnly(source)
    .split(/(?<=[.!?])\s+|\n/)
    .filter(sentence => !/\b(does not|doesn['’]t|no|never|not)\b/i.test(sentence))
    .join(' ')
    .toLowerCase()
}

describe('no feature is advertised that does not exist', () => {
  it('nothing claims offline downloads', () => {
    // `offline_enabled` is declared and read by nothing; there is no
    // download UI. If that changes, this test should be the thing that
    // tells you it's now allowed to say so.
    for (const file of FILES) {
      const text = claimsOnly(read(file))
      expect(text.includes('offline download'), `${file} sells offline downloads`).toBe(false)
      expect(text.includes('download for offline'), file).toBe(false)
    }
  })

  it('nothing sells voice tones or backgrounds as premium', () => {
    // FREEMIUM_LIMITS.voiceTones exists but is never read; the tone picker
    // and the background picker are open to everyone.
    for (const file of FILES) {
      const text = claimsOnly(read(file))
      expect(text.includes('voice tones'), `${file} sells voice tones`).toBe(false)
      expect(text.includes('all backgrounds'), `${file} sells all backgrounds`).toBe(false)
    }
  })

  it('nothing sells free features as premium upgrades', () => {
    // Free is 99 sessions/day at 999 minutes with checkpoints on. Selling
    // those as premium tells a free user their tier is worse than it is.
    expect(FREE_TIER_LIMITS.sessions_per_day).toBeGreaterThan(50)
    expect(FREE_TIER_LIMITS.session_duration_minutes).toBeGreaterThan(100)
    expect(FREE_TIER_LIMITS.checkpoints_enabled).toBe(true)

    const premiumLists = [
      read('components/premium/UpgradeModal.tsx'),
      read('app/(marketing)/pricing/page.tsx'),
    ].map(copyOnly)

    for (const text of premiumLists) {
      expect(/unlimited daily sessions/i.test(text)).toBe(false)
      expect(/no time limits/i.test(text)).toBe(false)
      expect(/all checkpoints/i.test(text)).toBe(false)
    }
  })

  it('never calls premium spoken replies unlimited', () => {
    // chat_voice is the one feature where PREMIUM is capped too.
    expect(AI_FEATURE_LIMITS.chat_voice.premium).toBe(30)
    for (const file of FILES) {
      const text = claimsOnly(read(file))
      expect(/unlimited (voice|spoken)/.test(text), `${file} claims unlimited voice`).toBe(false)
    }
  })

  it('never claims premium unlocks "all content"', () => {
    // Music, motivation and soundscapes are free for everyone by design —
    // YouTube's terms don't allow charging for its content.
    for (const file of FILES) {
      const text = claimsOnly(read(file))
      expect(text.includes('unlocks all content'), file).toBe(false)
      expect(text.includes('every soundscape, genre'), file).toBe(false)
    }
  })
})

describe('the free tier is described as it actually is', () => {
  it('does not describe caps that were lifted', () => {
    const settings = copyOnly(read('app/(dashboard)/settings/page.tsx'))
    expect(settings.includes('1 session/day')).toBe(false)
    expect(settings.includes('10-min limit')).toBe(false)
    expect(settings.includes('Genre selection locked')).toBe(false)
  })

  it('does not show journal history as a flat no for free', () => {
    // Free gets seven days, server-enforced. A ✗ contradicts the code and
    // the app's own journal screen.
    expect(FREE_TIER_LIMITS.journal_history_enabled).toBe(true)
    expect(FREE_TIER_LIMITS.journal_history_days).toBe(7)
    const pricing = read('app/(marketing)/pricing/page.tsx')
    expect(pricing).toMatch(/Journal history[\s\S]{0,120}Last 7 days/)
  })

  it('quotes the real daily allowances', () => {
    expect(AI_FEATURE_LIMITS.chat.free).toBe(5)
    expect(AI_FEATURE_LIMITS.chat_voice.free).toBe(1)
    const pricing = copyOnly(read('app/(marketing)/pricing/page.tsx'))
    expect(pricing).toMatch(/5 a day/)
    expect(pricing).toMatch(/1 a day/)
  })

  it('quotes the real memory depth', () => {
    expect(AI_MEMORY_DEPTH.premium.journalDays).toBe(30)
    const pricing = copyOnly(read('app/(marketing)/pricing/page.tsx'))
    expect(pricing).toMatch(/30 days/)
  })
})

describe('the retired Daily Guide page is not sold as the product', () => {
  it('no marketing page names it as a feature', () => {
    for (const file of ['app/(marketing)/pricing/page.tsx', 'app/(marketing)/terms/page.tsx']) {
      const text = copyOnly(read(file))
      expect(/the Daily Guide|Daily Guide with/i.test(text), `${file} sells the retired page`).toBe(false)
    }
  })
})

describe('the trial length has one source', () => {
  it('is 14 days and nothing hardcodes another number for it', () => {
    expect(TRIAL_DAYS).toBe(14)
    const banner = copyOnly(read('components/premium/TrialBanner.tsx'))
    // The progress bar used to divide by a hardcoded 7, so it read as
    // half-spent on day one of a 14-day trial.
    expect(banner).not.toMatch(/\/ 7\) \* 100/)
  })
})
