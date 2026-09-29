'use client'

/**
 * Keeps the field you are typing in above the keyboard.
 *
 * The plan sheet is a bottom sheet with three inputs and a Save button, and
 * on a phone the keyboard opens straight over all of them. Centring the sheet
 * helps, but it is not the fix on its own: a centred panel's middle is still
 * the middle of a viewport the keyboard may be covering the bottom half of.
 *
 * Deliberately conservative: it scrolls ONLY when the focused field is
 * actually out of view. A listener that scrolled on every focus would yank
 * the page around for fields that were perfectly visible, which is worse than
 * the problem.
 *
 * ── WHERE THE KEYBOARD IS ────────────────────────────────────────────
 *
 * In a browser, visualViewport shrinks when the keyboard opens, and that is
 * enough. In the iPhone app it is NOT: AppWrapper puts the keyboard plugin in
 * Body resize mode, which shrinks <body> but leaves the visual viewport at
 * full height — so the old check measured "everything is visible" while the
 * journal chat's input sat under the keyboard, and it never scrolled. On
 * native the plugin's own keyboardWillShow height is the source of truth.
 *
 * ── ROOM TO SCROLL INTO ──────────────────────────────────────────────
 *
 * Pages scroll inside a [data-app-shell] container sized to the screen, not
 * to the space above the keyboard. A field near the END of the page (the
 * chat composer) has nothing below it, so there is nowhere to scroll it up
 * to. While the keyboard is open this publishes its height as --kb-inset, and
 * globals.css adds that much space to the end of every app shell.
 */

import { useEffect } from 'react'

/** Long enough for the keyboard's own animation to finish. */
const KEYBOARD_ANIMATION_MS = 330
/** Air between the field and the top of the keyboard. */
const GAP = 16

const TEXT_FIELD = /^(INPUT|TEXTAREA|SELECT)$/

function scrollParent(el: HTMLElement): HTMLElement | null {
  let p = el.parentElement
  while (p) {
    const oy = getComputedStyle(p).overflowY
    if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p
    p = p.parentElement
  }
  return null
}

export function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport
    // Height reported by the native keyboard plugin; 0 in a browser.
    let nativeKeyboard = 0

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
      // The bottom of what is actually visible: the smaller of what the
      // visual viewport says and what the native keyboard says.
      const vvBottom = vv ? vv.height + vv.offsetTop : window.innerHeight
      const visibleBottom = Math.min(vvBottom, window.innerHeight - nativeKeyboard)

      const hidden = rect.bottom > visibleBottom - GAP || rect.top < 0
      if (!hidden) return

      // Scroll the container the field actually lives in, by exactly enough
      // to clear the keyboard. scrollIntoView({block:'center'}) centres in
      // the container's own box — which on native still extends under the
      // keyboard — so it could "centre" the field right behind it.
      //
      // NEVER scrollIntoView. It scrolls EVERY scrollable ancestor, including
      // the document and the overflow-hidden frame around the home shell —
      // and nothing scrolled those back, so the header stayed pushed up under
      // the status bar with content scrolling behind it.
      const parent = scrollParent(el)
      const delta = rect.top < 0 ? rect.top - GAP : rect.bottom - (visibleBottom - GAP)
      if (parent) parent.scrollBy({ top: delta, behavior: 'smooth' })
      else window.scrollBy({ top: delta, behavior: 'smooth' })
    }

    /**
     * Put back anything outside the app shell that got scrolled — by an older
     * build of this, by WKWebView's own "reveal the caret" behaviour, or by
     * the keyboard's content inset. On a page with a shell, the document and
     * the frames around the shell have exactly one correct position: the top.
     */
    const resetOuterScroll = () => {
      const shell = document.querySelector<HTMLElement>('[data-app-shell]')
      if (!shell) return
      let p = shell.parentElement
      while (p) {
        if (p.scrollTop !== 0) p.scrollTop = 0
        p = p.parentElement
      }
      const root = document.scrollingElement
      if (root && root.scrollTop !== 0) root.scrollTop = 0
    }

    const setInset = (px: number) => {
      document.documentElement.style.setProperty('--kb-inset', `${px}px`)
    }

    // On focus the keyboard has not opened yet, so the measurement would say
    // everything is fine. Wait for it.
    const onFocusIn = () => window.setTimeout(bringIntoView, KEYBOARD_ANIMATION_MS)

    // And again when the viewport itself changes — the keyboard opening,
    // closing, or switching to an emoji panel of a different height.
    document.addEventListener('focusin', onFocusIn)
    vv?.addEventListener('resize', bringIntoView)
    // A browser has no keyboardDidHide; leaving a field is the equivalent.
    const onFocusOut = () => window.setTimeout(resetOuterScroll, KEYBOARD_ANIMATION_MS)
    document.addEventListener('focusout', onFocusOut)
    // And once on mount, to recover a phone already stuck in the bad state.
    resetOuterScroll()

    // Native: the plugin knows the keyboard's height before it animates in.
    const removers: Array<() => void> = []
    let cancelled = false
    if ((window as unknown as { Capacitor?: unknown }).Capacitor) {
      ;(async () => {
        try {
          const { Keyboard } = await import('@capacitor/keyboard')
          if (cancelled) return
          const show = await Keyboard.addListener('keyboardWillShow', (info) => {
            nativeKeyboard = info.keyboardHeight || 0
            setInset(nativeKeyboard)
          })
          const shown = await Keyboard.addListener('keyboardDidShow', () => bringIntoView())
          const hide = await Keyboard.addListener('keyboardWillHide', () => {
            nativeKeyboard = 0
            setInset(0)
          })
          const hidden = await Keyboard.addListener('keyboardDidHide', resetOuterScroll)
          removers.push(() => show.remove(), () => shown.remove(), () => hide.remove(), () => hidden.remove())
        } catch {
          // Plugin missing on this platform: the visualViewport path above
          // is all there is, which is right for a browser.
        }
      })()
    }

    return () => {
      cancelled = true
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      vv?.removeEventListener('resize', bringIntoView)
      removers.forEach((r) => r())
      setInset(0)
    }
  }, [])

  return null
}
