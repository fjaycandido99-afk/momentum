/**
 * Contextual callbacks — AI-personalized "coach memory" push notifications
 * that fire the morning AFTER a user does something meaningful (writes a
 * journal entry, saves a quote, completes a session, logs a low mood).
 *
 * Pattern: user takes action today → AI generates a short next-morning
 * push that calls back to their content ("Yesterday you wrote about X.
 * How's that landing today?") → ScheduledAlert queues it for the user's
 * next-morning reminder time → existing /api/cron/alerts processor
 * delivers it via APNs + Web Push.
 *
 * Wiring is opt-out via the existing AlertType.enabled +
 * UserAlertPreference.enabled flags — `ai_callback` alert type starts
 * enabled by default, users can mute it in Settings → Notifications.
 *
 * Deduplication: if we already have a pending ai_callback queued for
 * the same user + same target morning, we REPLACE it with the freshest
 * context instead of stacking 5 notifs for 5 saves in one evening.
 */

import { prisma } from './prisma'
import { createChatCompletion, GROQ_MODEL } from './groq'

export type CallbackType =
  | 'journal_callback'
  | 'quote_callback'
  | 'session_callback'
  | 'mood_callback'

// Snippets passed in from the trigger site, kept loose so each trigger
// can fill in whatever's relevant without forcing a tight type.
interface CallbackContext {
  /** A short summary of what the user did — fed to the AI verbatim.
   *  e.g. "Wrote a journal win: 'finally finished the mvp'" or
   *       "Saved a quote by Marcus Aurelius about hardship" */
  summary: string
  /** Optional reference (entryId, quoteId) — stored on the alert's
   *  data payload so we could deep-link to it on tap later. */
  refId?: string
  /** Optional mood/intensity — e.g. 'low' for mood callbacks so the
   *  AI knows to be especially supportive. */
  intensity?: 'low' | 'normal' | 'high'
}

const ALERT_TYPE_ID = 'ai_callback'

/**
 * Ensure the AlertType row exists. Idempotent — only inserts on the
 * first call ever. Called lazily from queueCallback() so we don't need
 * a separate seed step or migration.
 */
async function ensureAlertType(): Promise<void> {
  await prisma.alertType.upsert({
    where: { id: ALERT_TYPE_ID },
    update: {},
    create: {
      id: ALERT_TYPE_ID,
      label: 'Coach memory',
      description: 'AI-personalized follow-ups on what you wrote, saved, or felt',
      category: 'coach',
      default_priority: 'normal',
      default_channel: 'push',
      cooldown_minutes: 0,
      enabled: true,
    },
  })
}

/**
 * Compute the next occurrence of the user's reminder time in their
 * local timezone, expressed as a UTC Date. Falls back to 8:00 if the
 * user has no reminder_time set, and UTC if no timezone.
 */
function nextMorningFor(reminderTime: string | null, timezone: string | null): Date {
  const [hh, mm] = (reminderTime || '08:00').split(':').map(Number)
  const tz = timezone || 'UTC'

  // Compute "now in user's timezone" by finding the offset between
  // a known reference rendered in tz and the same instant in UTC.
  const now = new Date()
  const nowInTzString = now.toLocaleString('en-US', { timeZone: tz })
  const nowInTz = new Date(nowInTzString)
  const offsetMs = nowInTz.getTime() - now.getTime()

  // Build the target morning (today at HH:MM in tz, expressed as UTC).
  const target = new Date(nowInTz)
  target.setHours(hh, mm || 0, 0, 0)
  // If we've already passed today's reminder time in the user's tz,
  // bump to tomorrow.
  if (target <= nowInTz) {
    target.setDate(target.getDate() + 1)
  }
  // Convert back from "wall clock in tz" to actual UTC.
  return new Date(target.getTime() - offsetMs)
}

/**
 * Ask the AI to write a single warm 1-line push for tomorrow morning
 * that calls back to today's action. Returns { title, body }. Falls
 * back to a generic template if the AI call fails — we never block
 * the user's action on this.
 */
async function generateCallbackMessage(
  type: CallbackType,
  ctx: CallbackContext,
): Promise<{ title: string; body: string }> {
  const typeFraming: Record<CallbackType, string> = {
    journal_callback: "they wrote a journal entry yesterday — gently follow up on what they wrote",
    quote_callback: "they saved a quote yesterday — resurface it with a personal framing",
    session_callback: "they completed a Daily Guide session yesterday — ask how it carried forward",
    mood_callback: "they logged a low mood yesterday — send a warm, non-preachy supportive check-in",
  }

  const system = `You are Arlo, a warm AI coach in the Voxu wellness app.
Generate a single PUSH NOTIFICATION the user will see tomorrow morning.

Framing: ${typeFraming[type]}.

Constraints:
- Reference what they did SPECIFICALLY (use the summary below).
- "title" must be under 32 characters.
- "body" must be under 110 characters.
- Sound like a friend, not a coach script — no "I noticed..." or "Remember to..."
- Use "yesterday" for time reference (the notif fires the morning after).
- No emojis unless one feels exactly right (max 1).

Return ONLY valid JSON: {"title": "...", "body": "..."}`

  const user = `User's action summary: ${ctx.summary}${
    ctx.intensity ? `\nIntensity: ${ctx.intensity}` : ''
  }`

  try {
    const result = await createChatCompletion({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 200,
      temperature: 0.8,
    })
    const text = result.choices[0]?.message?.content || ''
    const parsed = JSON.parse(text) as { title?: string; body?: string }
    if (parsed.title && parsed.body) {
      return {
        title: parsed.title.slice(0, 64),
        body: parsed.body.slice(0, 180),
      }
    }
  } catch (err) {
    console.warn('[contextual-callbacks] AI generation failed, using fallback:', err)
  }

  // Fallback templates per type — never block on AI.
  const fallback: Record<CallbackType, { title: string; body: string }> = {
    journal_callback: { title: 'Yesterday\'s reflection', body: 'How is what you wrote yesterday landing today?' },
    quote_callback:   { title: 'A line you saved',         body: 'You bookmarked something yesterday. Worth a re-read.' },
    session_callback: { title: 'Carrying it forward',      body: 'You showed up yesterday. What stuck with you?' },
    mood_callback:    { title: 'Just checking in',         body: 'Yesterday was a heavy one. How are you today?' },
  }
  return fallback[type]
}

/**
 * Queue a next-morning callback for a user. Idempotent within a
 * 24-hour window — replaces an already-pending callback of the same
 * type instead of stacking.
 */
export async function queueCallback(
  userId: string,
  type: CallbackType,
  ctx: CallbackContext,
): Promise<void> {
  try {
    await ensureAlertType()

    // Get the user's reminder time + timezone so we can fire at THEIR
    // morning, not UTC's.
    const prefs = await prisma.userPreferences.findUnique({
      where: { user_id: userId },
      select: { reminder_time: true, timezone: true },
    })
    const scheduledAt = nextMorningFor(prefs?.reminder_time ?? null, prefs?.timezone ?? null)

    // Generate the AI message NOW (with full context) — locked in at
    // queue time, fires verbatim tomorrow. Cheaper than re-generating
    // at cron-time and the "yesterday" framing makes the temporal
    // shift work naturally.
    const { title, body } = await generateCallbackMessage(type, ctx)

    // Dedupe: cancel any existing pending ai_callback for this user
    // scheduled for the same morning (within 12h window). Keeps a
    // burst of saves from queuing 5 notifs for the same morning.
    const dedupeStart = new Date(scheduledAt.getTime() - 12 * 60 * 60 * 1000)
    const dedupeEnd = new Date(scheduledAt.getTime() + 12 * 60 * 60 * 1000)
    await prisma.scheduledAlert.updateMany({
      where: {
        user_id: userId,
        alert_type_id: ALERT_TYPE_ID,
        status: { in: ['pending', 'queued'] },
        scheduled_at: { gte: dedupeStart, lte: dedupeEnd },
      },
      data: { status: 'cancelled', last_error: 'Superseded by newer callback' },
    })

    // Queue the fresh callback.
    await prisma.scheduledAlert.create({
      data: {
        user_id: userId,
        alert_type_id: ALERT_TYPE_ID,
        priority: 'normal',
        channel: 'push',
        status: 'pending',
        scheduled_at: scheduledAt,
        title,
        body,
        data: { callback_type: type, refId: ctx.refId ?? null, summary: ctx.summary.slice(0, 200) },
      },
    })
  } catch (err) {
    // Never block the user's action — best-effort.
    console.warn('[contextual-callbacks] queueCallback failed:', err)
  }
}
