/**
 * Scroll the page's own container (the [data-app-shell]) so an element sits
 * a little below the sticky header.
 *
 * Never scrollIntoView: it also scrolls the document and the overflow-hidden
 * frame around the shell, which is what once left the header stuck under the
 * status bar with no way back.
 */
export function scrollShellTo(id: string, offset = 120): boolean {
  const el = document.getElementById(id)
  const shell = el?.closest<HTMLElement>('[data-app-shell]')
  if (!el || !shell) return false
  const top = shell.scrollTop + el.getBoundingClientRect().top - shell.getBoundingClientRect().top - offset
  shell.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  return true
}
