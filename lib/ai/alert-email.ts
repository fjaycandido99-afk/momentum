/**
 * Operator email, via Resend.
 *
 * RESEND_API_KEY has been in the Vercel environment for months and no code
 * referenced it — the same pattern as OPENAI_API_KEY. This is the first
 * thing to use it, and it is used for exactly one purpose: telling you
 * when the AI is broken.
 *
 * Never throws. An alert channel that can take down the cron that calls it
 * is worse than no alert channel.
 */

const RESEND_URL = 'https://api.resend.com/emails'

export interface AlertMail {
  subject: string
  body: string
}

export function alertRecipient(): string | null {
  return process.env.ALERT_EMAIL || process.env.ADMIN_OWNER_EMAIL || null
}

export function isAlertEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!alertRecipient()
}

export async function sendAlertEmail(mail: AlertMail): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const to = alertRecipient()

  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  if (!to) return { ok: false, error: 'ALERT_EMAIL / ADMIN_OWNER_EMAIL not set' }

  // Resend requires a verified sending domain. Overridable because the
  // verified domain may not be voxu.app.
  const from = process.env.ALERT_FROM || 'Voxu Alerts <alerts@voxu.app>'

  try {
    const res = await fetch(RESEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.body }),
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      return { ok: false, error: `${res.status} ${detail.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'network error' }
  }
}
