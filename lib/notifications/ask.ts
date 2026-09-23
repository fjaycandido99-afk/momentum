/**
 * Whether to ask for notifications, and which ask it is.
 *
 * 286 notifications have been sent in this app's life and every one of them
 * went to a single user. Twelve of thirteen have never received one — and
 * there is not a single telemetry event for a notification prompt, because
 * there has never been a prompt. The only way to turn them on is Settings →
 * Notifications, twelve toggles in four groups, most of the way down a long
 * page. People do open Settings; nobody found this.
 *
 * Two different problems hide behind that one number, and they need two
 * different asks:
 *
 *   'enable'        — the browser or app can subscribe right now. Ask.
 *   'install-first' — iOS Safari. Web push on iOS requires the site to be
 *                     added to the home screen (16.4+), so there is no
 *                     permission to request yet. Asking "turn on
 *                     notifications" here produces nothing and teaches the
 *                     person the button is broken.
 *   'none'          — don't.
 *
 * Pure: every input is passed in, so the rules are testable without a
 * browser, a service worker, or a permission dialog.
 */

export type AskKind = 'enable' | 'install-first' | 'none'

export interface AskInput {
  /** From getNotificationPermission(). */
  permission: NotificationPermission | 'unsupported'
  /** From getPushSupportInfo().supported. */
  supported: boolean
  platform: 'ios' | 'android' | 'web'
  /** Running as an installed PWA. */
  isInstalled: boolean
  /** Running inside the Capacitor shell. */
  isNative: boolean
  /** They have already been asked once, ever. */
  alreadyAsked: boolean
  /**
   * There is a promise on the screen, waiting to be kept.
   *
   * The whole point of the timing. A reminder is a service to a promise, so
   * with one in front of them "shall I remind you?" answers a question the
   * person already has; on launch, before there is anything to be reminded
   * of, the same words are a toll booth on the way in.
   *
   * Deliberately not "they just promised in this session" — somebody who
   * promised last night and came back to check it off is exactly who a
   * reminder would have served, and they would never qualify.
   */
  hasPromise: boolean
}

export function reminderAsk(input: AskInput): AskKind {
  // Asked once, ever. A second ask is nagging, and the answer would not
  // change: a browser that has been told no does not re-prompt anyway.
  if (input.alreadyAsked) return 'none'

  // Already on. Nothing to ask.
  if (input.permission === 'granted') return 'none'

  // They said no, to the real OS dialog. That is a decision, not a gap —
  // and on web the browser will refuse to prompt again regardless, so an
  // "enable" button here would do nothing at all.
  if (input.permission === 'denied') return 'none'

  if (!input.hasPromise) return 'none'

  if (input.supported) return 'enable'

  // Not supported, and the reason is fixable by the person: iOS Safari,
  // where push exists only for an installed PWA.
  if (input.platform === 'ios' && !input.isInstalled && !input.isNative) {
    return 'install-first'
  }

  // Not supported for a reason nobody can act on — an old browser, a
  // webview without a push manager. Say nothing rather than offer a button
  // that cannot work.
  return 'none'
}

/**
 * The dismissal id, shared by both asks.
 *
 * One id on purpose: somebody who declined the install-first version has
 * declined the subject, and should not meet the enable version the day they
 * install the app. See lib/ui/dismiss.
 */
export const REMINDER_ASK_ID = 'reminder-ask'
