'use client'

/**
 * Freezes the page behind whatever renders it. Drop it inside a dialog.
 *
 *   <div role="dialog" …>
 *     <ScrollLock />
 *     …
 *
 * A component rather than another `useBodyScrollLock()` call, for one
 * reason: it is correct in both shapes a dialog comes in here. Most are
 * mounted conditionally by a parent (`{open && <Sheet/>}`), and a few gate
 * themselves with `if (!isOpen) return null`. A hook has to be called before
 * that early return, so it needs an `active` flag passed correctly — and
 * getting it wrong either freezes the app or locks nothing. Rendered as a
 * child it simply is not rendered while the dialog is closed, which is the
 * behaviour wanted in both cases, with no flag to get wrong.
 *
 * Why it matters at all: 17 of the app's 21 dialogs were not doing this. The
 * page behind a `position: fixed` overlay stayed live, which is visible as
 * the background sliding under a popup — and on WKWebView it is worse than
 * cosmetic. It is how the book sheet came to be drawn off-screen on the
 * native app with its Save button out of reach.
 *
 * Locks are counted in the hook, so stacking a sheet over a player is safe
 * and only the last one to close unlocks.
 */

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

export function ScrollLock() {
  useBodyScrollLock()
  return null
}
