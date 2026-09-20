import { prisma } from '@/lib/prisma'
import { eraKeyRows, funnelRows, keptRate, type EraKeyRow, type FunnelRow } from './era-funnel'

/**
 * The founder view's numbers (/dev-analytics): where people fall out of the
 * era loop, and what the app has learned about what people think.
 *
 * Two rules run through this file.
 *
 * 1. COUNT ROWS, NOT EVENTS, wherever a row exists. Eras, promises and
 *    referrals are facts in the database, so the funnel is accurate and
 *    works for anything that happened before tracking existed. Events only
 *    fill the steps that leave no row: seeing the picker, opening the share
 *    sheet, visiting a join link, opening a wake-up call.
 *
 * 2. NEVER READ WHAT PEOPLE WROTE. Voxu's privacy policy tells people their
 *    journal is sent to the AI only to write one reply, and that with AI
 *    memory off "it cannot read your journal". So nothing here selects a
 *    journal, promise, era or dream text column. What it does read is the
 *    structured things people TAP: the Daily Read answers, the moods, the
 *    tags they chose, which prompt they answered, which era they picked.
 *    That answers "what do people think" without reading anyone's diary.
 */

const n = (v: unknown) => Number(v ?? 0)

export interface EraFunnel {
  steps: FunnelRow[]
  byEra: EraKeyRow[]
  promises: { made: number; answered: number; kept: number; keptPercent: number | null }
  stuck: { startedNeverPromised: number; aliveNow: number; erasStarted: number }
}

export async function loadEraFunnel(since: Date): Promise<EraFunnel> {
  const [
    started, day1, day1Answered, day7, neverPromised, alive, health, byKey, referrals, events,
  ] = await Promise.all([
    prisma.$queryRaw<{ eras: bigint; users: bigint }[]>`
      SELECT COUNT(*) AS eras, COUNT(DISTINCT user_id) AS users FROM "Era" WHERE created_at >= ${since}`,
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT e.id) AS c FROM "Era" e
      JOIN "EraPromise" p ON p.era_id = e.id AND p.local_day = e.start_day
      WHERE e.created_at >= ${since}`,
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT e.id) AS c FROM "Era" e
      JOIN "EraPromise" p ON p.era_id = e.id AND p.local_day = e.start_day AND p.kept IS NOT NULL
      WHERE e.created_at >= ${since}`,
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT e.id) AS c FROM "Era" e
      JOIN "EraPromise" p ON p.era_id = e.id AND (p.local_day::date - e.start_day::date) >= 6
      WHERE e.created_at >= ${since}`,
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*) AS c FROM "Era" e
      WHERE e.created_at >= ${since}
        AND NOT EXISTS (SELECT 1 FROM "EraPromise" p WHERE p.era_id = e.id)`,
    prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(DISTINCT e.id) AS c FROM "Era" e
      JOIN "EraPromise" p ON p.era_id = e.id
      WHERE e.status = 'active' AND p.local_day::date >= CURRENT_DATE - 2`,
    prisma.$queryRaw<{ made: bigint; answered: bigint; kept: bigint }[]>`
      SELECT COUNT(*) AS made,
             COUNT(kept) AS answered,
             COUNT(CASE WHEN kept THEN 1 END) AS kept
      FROM "EraPromise" WHERE created_at >= ${since}`,
    prisma.$queryRaw<{ era_key: string; starts: bigint; promises: bigint; answered: bigint; kept: bigint }[]>`
      SELECT e.era_key,
             COUNT(DISTINCT e.id) AS starts,
             COUNT(p.id) AS promises,
             COUNT(p.kept) AS answered,
             COUNT(CASE WHEN p.kept THEN 1 END) AS kept
      FROM "Era" e LEFT JOIN "EraPromise" p ON p.era_id = e.id
      WHERE e.created_at >= ${since}
      GROUP BY e.era_key`,
    prisma.eraReferral.count({ where: { created_at: { gte: since } } }),
    prisma.featureEvent.groupBy({
      by: ['metadata'],
      _count: { id: true },
      where: { feature: 'era', created_at: { gte: since } },
    }),
  ])

  // Era events carry their step in metadata ("picker", "share_opened", …).
  const ev = new Map(events.map(e => [e.metadata ?? '', e._count.id]))
  const erasStarted = n(started[0]?.eras)

  const steps = funnelRows([
    { key: 'picker', label: 'Saw the era picker', value: ev.get('picker') ?? 0, note: 'views', events: true },
    { key: 'started', label: 'Started an era', value: erasStarted, note: `${n(started[0]?.users)} people` },
    { key: 'day1', label: 'Made the day-1 promise', value: n(day1[0]?.c) },
    { key: 'day1_answered', label: 'Answered day 1', value: n(day1Answered[0]?.c), note: 'said kept or not' },
    { key: 'day7', label: 'Still promising on day 7', value: n(day7[0]?.c) },
    { key: 'share_opened', label: 'Opened the share card', value: ev.get('share_opened') ?? 0, note: 'views', events: true },
    { key: 'share_sent', label: 'Actually shared it', value: ev.get('share_sent') ?? 0, note: 'shares or copies', events: true },
    { key: 'join_visit', label: 'Join link visits', value: ev.get('join_page') ?? 0, note: 'includes people not signed in', events: true },
    { key: 'joined', label: 'Started an era from a link', value: referrals },
  ])

  return {
    steps,
    byEra: eraKeyRows(byKey.map(r => ({
      key: r.era_key,
      starts: n(r.starts),
      promises: n(r.promises),
      answered: n(r.answered),
      kept: n(r.kept),
    }))),
    promises: {
      made: n(health[0]?.made),
      answered: n(health[0]?.answered),
      kept: n(health[0]?.kept),
      keptPercent: keptRate(n(health[0]?.kept), n(health[0]?.answered)),
    },
    stuck: {
      startedNeverPromised: n(neverPromised[0]?.c),
      aliveNow: n(alive[0]?.c),
      erasStarted,
    },
  }
}

export interface ThoughtSignals {
  read: {
    answers: number
    people: number
    /** Signed mean of (score − 3) × direction, −2…+2: which way people lean. */
    byAxis: { axis: string; answers: number; people: number; lean: number }[]
    /** How many people share each Daily Read signature (thin ones excluded). */
    signatures: { signature: string; people: number }[]
  }
  journal: {
    days: number
    people: number
    /** The 5-level mood people tapped with an entry. */
    mood: { value: string; count: number }[]
    /** Tags people chose themselves — labels, never their words. */
    tags: { tag: string; count: number }[]
    /** Which rotating prompt they answered. */
    prompts: { prompt: string; count: number }[]
  }
  guide: {
    /** Mood before vs after a guide day, where both were recorded. */
    moodMoved: { better: number; same: number; worse: number }
    energy: { value: string; count: number }[]
  }
  /**
   * The check-in's one-tap answers (lib/era/reasons.ts), across everyone:
   * what stops people, what helps, and whether their own certainty predicts
   * anything. Keys and counts only — the lists are closed, so this is
   * countable without reading a word anyone wrote.
   */
  promises: {
    blockers: { key: string; count: number }[]
    helpers: { key: string; count: number }[]
    confidence: { bucket: 'sure' | 'unsure'; answered: number; kept: number; keptPercent: number | null }[]
  }
}

/** Minimum answers behind a Daily Read signature before it's counted. */
const SIGNATURE_MIN_ANSWERS = 5

export async function loadThoughtSignals(since: Date): Promise<ThoughtSignals> {
  const [
    axes, readTotals, signatures, journalTotals, moods, tags, prompts, moodPairs, energy,
    blockers, helpers, confidence,
  ] = await Promise.all([
    prisma.$queryRaw<{ axis: string; answers: bigint; people: bigint; lean: number | null }[]>`
      SELECT axis, COUNT(*) AS answers, COUNT(DISTINCT user_id) AS people,
             AVG((score - 3) * direction)::float AS lean
      FROM "AssessmentAnswer" WHERE created_at >= ${since}
      GROUP BY axis ORDER BY axis`,
    prisma.$queryRaw<{ answers: bigint; people: bigint }[]>`
      SELECT COUNT(*) AS answers, COUNT(DISTINCT user_id) AS people
      FROM "AssessmentAnswer" WHERE created_at >= ${since}`,
    prisma.$queryRaw<{ signature: string; people: bigint }[]>`
      SELECT signature, COUNT(*) AS people FROM "AssessmentSignature"
      WHERE answered >= ${SIGNATURE_MIN_ANSWERS}
      GROUP BY signature ORDER BY people DESC, signature ASC`,
    prisma.$queryRaw<{ days: bigint; people: bigint }[]>`
      SELECT COUNT(*) AS days, COUNT(DISTINCT user_id) AS people
      FROM "DailyGuide" WHERE date >= ${since} AND journal_mood IS NOT NULL`,
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      SELECT journal_mood AS value, COUNT(*) AS count FROM "DailyGuide"
      WHERE date >= ${since} AND journal_mood IS NOT NULL
      GROUP BY journal_mood ORDER BY count DESC`,
    prisma.$queryRaw<{ tag: string; count: bigint }[]>`
      SELECT tag, COUNT(*) AS count FROM (
        SELECT unnest(journal_tags) AS tag FROM "DailyGuide" WHERE date >= ${since}
      ) t GROUP BY tag ORDER BY count DESC, tag ASC LIMIT 20`,
    prisma.$queryRaw<{ prompt: string; count: bigint }[]>`
      SELECT journal_prompt AS prompt, COUNT(*) AS count FROM "DailyGuide"
      WHERE date >= ${since} AND journal_prompt IS NOT NULL
      GROUP BY journal_prompt ORDER BY count DESC LIMIT 15`,
    prisma.$queryRaw<{ before: string; after: string; count: bigint }[]>`
      SELECT mood_before AS before, mood_after AS after, COUNT(*) AS count
      FROM "DailyGuide"
      WHERE date >= ${since} AND mood_before IS NOT NULL AND mood_after IS NOT NULL
      GROUP BY mood_before, mood_after`,
    prisma.$queryRaw<{ value: string; count: bigint }[]>`
      SELECT energy_level AS value, COUNT(*) AS count FROM "DailyGuide"
      WHERE date >= ${since} AND energy_level IS NOT NULL
      GROUP BY energy_level ORDER BY count DESC`,
    prisma.$queryRaw<{ key: string; count: bigint }[]>`
      SELECT blocker AS key, COUNT(*) AS count FROM "EraPromise"
      WHERE created_at >= ${since} AND blocker IS NOT NULL
      GROUP BY blocker ORDER BY count DESC, blocker ASC`,
    prisma.$queryRaw<{ key: string; count: bigint }[]>`
      SELECT helper AS key, COUNT(*) AS count FROM "EraPromise"
      WHERE created_at >= ${since} AND helper IS NOT NULL
      GROUP BY helper ORDER BY count DESC, helper ASC`,
    prisma.$queryRaw<{ bucket: string; answered: bigint; kept: bigint }[]>`
      SELECT CASE WHEN confidence >= 4 THEN 'sure' ELSE 'unsure' END AS bucket,
             COUNT(kept) AS answered,
             COUNT(CASE WHEN kept THEN 1 END) AS kept
      FROM "EraPromise"
      WHERE created_at >= ${since} AND confidence IS NOT NULL
      GROUP BY 1 ORDER BY 1`,
  ])

  const rank: Record<string, number> = { low: 1, medium: 2, high: 3 }
  const moodMoved = { better: 0, same: 0, worse: 0 }
  for (const p of moodPairs) {
    const from = rank[p.before] ?? 0
    const to = rank[p.after] ?? 0
    const count = n(p.count)
    if (!from || !to) continue
    if (to > from) moodMoved.better += count
    else if (to === from) moodMoved.same += count
    else moodMoved.worse += count
  }

  return {
    read: {
      answers: n(readTotals[0]?.answers),
      people: n(readTotals[0]?.people),
      byAxis: axes.map(a => ({
        axis: a.axis,
        answers: n(a.answers),
        people: n(a.people),
        lean: Math.round((a.lean ?? 0) * 100) / 100,
      })),
      signatures: signatures.map(s => ({ signature: s.signature, people: n(s.people) })),
    },
    journal: {
      days: n(journalTotals[0]?.days),
      people: n(journalTotals[0]?.people),
      mood: moods.map(m => ({ value: m.value, count: n(m.count) })),
      tags: tags.map(t => ({ tag: t.tag, count: n(t.count) })),
      prompts: prompts.map(p => ({ prompt: p.prompt, count: n(p.count) })),
    },
    guide: {
      moodMoved,
      energy: energy.map(e => ({ value: e.value, count: n(e.count) })),
    },
    promises: {
      blockers: blockers.map(b => ({ key: b.key, count: n(b.count) })),
      helpers: helpers.map(h => ({ key: h.key, count: n(h.count) })),
      confidence: confidence.map(c => ({
        bucket: c.bucket === 'sure' ? 'sure' as const : 'unsure' as const,
        answered: n(c.answered),
        kept: n(c.kept),
        keptPercent: keptRate(n(c.kept), n(c.answered)),
      })),
    },
  }
}

export interface WakeUsage {
  callsSet: number
  callsSent: number
  callsOpened: number
}

export async function loadWakeUsage(since: Date): Promise<WakeUsage> {
  const [callsSet, callsSent, opens] = await Promise.all([
    prisma.userPreferences.count({ where: { wake_call_enabled: true } }),
    prisma.notificationSendLog.count({ where: { type: 'era_wake', sent_at: { gte: since } } }),
    prisma.featureEvent.count({ where: { feature: 'era', metadata: 'wake_call', created_at: { gte: since } } }),
  ])
  return { callsSet, callsSent, callsOpened: opens }
}
