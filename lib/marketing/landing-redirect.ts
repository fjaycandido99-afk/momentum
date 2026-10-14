/**
 * Who opening voxu.app is sent to the landing page (/download) instead of
 * the app's first-run screen.
 *
 * Only a signed-out visitor in a REAL browser, on "/" exactly. The iOS and
 * Android apps load voxu.app too, so anything that might be the app keeps
 * the app: when in doubt, don't redirect (the worst case is today's
 * behaviour, the first-run screen). Pure, so the rules are tested.
 */

export const APP_COOKIE = 'voxu_app' // set by the app itself (marketing layout)
export const WEB_COOKIE = 'voxu_web' // "start in your browser" was chosen

export type LandingInput = {
  path: string
  signedIn: boolean
  userAgent: string
  cookies: { app?: boolean; web?: boolean }
  /** ?web=1: the visitor chose to start in the browser. */
  webParam: boolean
}

/** A browser we are sure is not the app's own web view. */
export function isRealBrowser(ua: string): boolean {
  if (!ua) return false
  // Android's app web view marks itself "; wv)".
  if (/;\s*wv\)/i.test(ua)) return false
  // iOS: Safari, Chrome, Firefox, Edge carry their own token; the app's
  // WKWebView carries none of them.
  if (/iPhone|iPad|iPod/i.test(ua)) return /Safari\/|CriOS\/|FxiOS\/|EdgiOS\//.test(ua)
  return /Chrome\/|Safari\/|Firefox\/|Edg\//.test(ua)
}

export function shouldSendToLanding(i: LandingInput): boolean {
  if (i.path !== '/') return false
  if (i.signedIn) return false
  if (i.webParam || i.cookies.web || i.cookies.app) return false
  return isRealBrowser(i.userAgent)
}
