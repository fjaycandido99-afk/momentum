'use client'

/**
 * Keeps the field you are typing in above the keyboard.
 *
 * The plan sheet is a bottom sheet with three inputs and a Save button, and
 * on a phone the keyboard opens straight over all of them. Centring the sheet
 * helps, but it is not the fix on its own: a centred panel's middle is still
 * the middle of a viewport the keyboard may be covering the bottom half of.
 *
 * capacitor.config.ts already sets `KeyboardResize.Body`, which would shrink
 * the WebView so the layout could react — but config changes there are inert
 * until a native rebuild, and the shipped binary predates it. This works in
 * the build people have today, and in a browser, and keeps working after the
 * rebuild.
 *
 * Deliberately conservative: it scrolls ONLY when the focused field is
 * actually out of view. A listener that scrolled on every focus would yank
 * the page around for fields that were perfectly visible, which is worse than
 * the problem.
 *
 * Uses visualViewport where it exists, which is the only thing that knows how
 * tall the screen is with a keyboard on it — innerHeight does not change.
 */

import { useEffect } from 'react'

/** Long enough for the keyboard's own animation to finish. */
const KEYBOARD_ANIMATION_MS = 330

const TEXT_FIELD = /^(INPUT|TEXTAREA|SELECT)$/

export function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport

    const bringIntoView = () => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return
      if (!TEXT_FIELD.test(el.tagName) && !el.isContentEditable) return

      // A checkbox or a range slider does not raise a keyboard, and moving
      // the page under somebody's thumb mid-drag is its own bug.
      if (el instanceof HTMLInputElement && ['checkbox', 'radio', 'range', 'button', 'submit'].includes(el.type)) {
        return
      }

      const rect = el.getBoundingClientRect()
      // The bottom of what is actually visible: the visual viewport's height
      // plus how far it has been pushed down. With no keyboard and no
      // visualViewport support this is just the window.
      const visibleBottom = vv ? vv.height + vv.offsetTop : window.innerHeight

      // 12px of air, so a field flush against the keyboard still reads as
      // sitting above it rather than touching it.
      const hidden = rect.bottom > visibleBottom - 12 || rect.top < 0
      if (!hidden) return

      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }

    // On focus the keyboard has not opened yet, so the measurement would say
    // everything is fine. Wait for it.
    const onFocusIn = () => window.setTimeout(bringIntoView, KEYBOARD_ANIMATION_MS)

    // And again when the viewport itself changes — the keyboard opening,
    // closing, or switching to an emoji panel of a different height.
    document.addEventListener('focusin', onFocusIn)
    vv?.addEventListener('resize', bringIntoView)

    return () => {
      document.removeEventListener('focusin', onFocusIn)
      vv?.removeEventListener('resize', bringIntoView)
    }
  }, [])

  return null
}
