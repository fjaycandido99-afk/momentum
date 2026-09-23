import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * Every table holding a person's own data has to be in their export.
 *
 * The export route enumerates its queries BY HAND, and its own comment
 * already said "anything new goes here too" — which had stopped being true.
 * Five tables were missing when this test was written: Book, Practice,
 * PracticeLog, ExerciseRun and ResetSession. What somebody reads, the
 * disciplines they keep, every day they logged one, every exercise they ran
 * and every time they opened the app to calm down — none of it could be
 * exported.
 *
 * A hand-maintained list will always drift. This reads the schema instead,
 * finds every user-scoped model, and requires each one to be either exported
 * or DELIBERATELY excluded below with a reason. Adding a table now forces the
 * decision rather than letting it be forgotten.
 */

const schema = readFileSync('prisma/schema.prisma', 'utf8')
const route = readFileSync('app/api/account/export/route.ts', 'utf8')

/** Models with a user_id column or a User relation. */
function userScopedModels(): string[] {
  const models = [...schema.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)]
  return models.filter(m => /user_id\s+String|user\s+User\s/.test(m[2])).map(m => m[1])
}

/**
 * Deliberately NOT exported, each with the reason.
 *
 * An export is the person's own record of themselves. It is not a dump of
 * every row that mentions them: a push token is a device credential, a
 * billing row belongs to Stripe's record and is available from them, and a
 * per-day AI counter is our meter rather than anything about the reader.
 *
 * To exclude something new, add it here with a reason. That is the point —
 * the decision gets made and written down.
 */
const DELIBERATELY_EXCLUDED: Record<string, string> = {
  Subscription: 'billing state; the authoritative copy is Stripe/Apple, and it is not a record of the person',
  Session: 'auth sessions — credentials, not content',
  PushSubscription: 'device push tokens; exporting a credential is a liability, not a right',
  NotificationSendLog: 'our send log, for capping and dedupe. What we did, not what they did',
  AiCallLog: 'our own operational log of model calls',
  AiUsageDaily: 'the quota meter — our counter, not their data',
  XPEvent: 'derived from actions that are themselves exported',
  FeatureEvent: 'product analytics on taps; route patterns only, no content',
  UserAchievement: 'derived — unlocked from the exported activity',
  UserAlertPreference: 'covered by preferences',
  ScheduledAlert: 'queue state for pending sends',
  AlertHistory: 'our send history, same as NotificationSendLog',
  AssessmentSignature: 'derived from AssessmentAnswer, which IS exported',
  ReferralHit: 'a click log on a link, not the reader',
  EraReferral: 'link plumbing for a shared era',
  EraPromise: 'exported inside `eras`, which includes its relations',
}

describe('the data export', () => {
  it('covers every user-scoped table, or says why not', () => {
    const missing: string[] = []

    for (const model of userScopedModels()) {
      if (model in DELIBERATELY_EXCLUDED) continue
      // The query in the route: prisma.book.findMany / prisma.user.findUnique
      const accessor = model.charAt(0).toLowerCase() + model.slice(1)
      if (!route.includes(`prisma.${accessor}.`)) missing.push(model)
    }

    expect(
      missing,
      `Not exported and not listed as a deliberate exclusion: ${missing.join(', ')}.\n` +
        'Add the query to app/api/account/export/route.ts, or add the model to ' +
        'DELIBERATELY_EXCLUDED in this test with the reason.',
    ).toEqual([])
  })

  it('exports the five tables that were found missing', () => {
    // Named explicitly so a future refactor that drops one fails loudly
    // rather than quietly returning less of somebody's life than it did.
    for (const accessor of ['book', 'practice', 'practiceLog', 'exerciseRun', 'resetSession']) {
      expect(route, accessor).toContain(`prisma.${accessor}.`)
    }
  })

  it('keeps every exclusion honest about an existing model', () => {
    // An exclusion for a table that no longer exists is a stale excuse, and
    // would silently cover a real model added under the same name later.
    const models = new Set(userScopedModels())
    for (const excluded of Object.keys(DELIBERATELY_EXCLUDED)) {
      expect(models.has(excluded), `${excluded} is excluded but is not a user-scoped model`).toBe(true)
    }
  })

  it('gives a reason for every exclusion', () => {
    for (const [model, reason] of Object.entries(DELIBERATELY_EXCLUDED)) {
      expect(reason.length, model).toBeGreaterThan(15)
    }
  })
})
