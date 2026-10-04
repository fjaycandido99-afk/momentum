/**
 * Is this the installed iPhone/Android app (not a browser)?
 *
 * NOT `!!window.Capacitor`: @capacitor/core defines that global in an
 * ordinary browser too, once any module imports it — so that check said
 * "app" on voxu.app in Safari and Chrome, and the paywall tried Apple
 * purchases on the web. isNativePlatform() is the real answer.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  try { return !!cap?.isNativePlatform?.() } catch { return false }
}
