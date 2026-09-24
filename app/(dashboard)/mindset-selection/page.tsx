'use client'

import { useEffect, useState } from 'react'
import { MindsetSelectionScreen } from '@/components/mindset/MindsetSelectionScreen'

/**
 * The mindset picker, which is two screens wearing one URL.
 *
 * During onboarding it is a required step with nothing behind it. Reached
 * from Settings, from home's header or from Mindset Evolution it is a CHANGE,
 * and there was no way back out — the dashboard layout hides its own nav on
 * this route (`hideChrome`), so somebody who tapped in to look at the options
 * was stuck until they picked one. Changing your mind about changing your
 * mind was not possible.
 *
 * Which of the two it is comes from the DATA, not from the caller. Four places
 * link here and they all use the same plain URL; a `?change=1` convention
 * would have to be added to each of them and would be missed by the fifth.
 * `mindset_selected_at` already answers the question: set means they have
 * chosen before, so this is a change.
 *
 * It also finally wires `isReset`, which has existed on the component since it
 * was written, carries its own copy ("Change your coach" / "A new voice"), and
 * had no caller.
 */
export default function MindsetSelectionPage() {
  const [isReset, setIsReset] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/daily-guide/preferences')
      .then(r => (r.ok ? r.json() : null))
      .then(prefs => {
        if (!cancelled && prefs?.mindset_selected_at) setIsReset(true)
      })
      // A failed check means no back button, which is the onboarding
      // behaviour — the safe way to be wrong, since it never traps somebody
      // who has nowhere to go back to.
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  return <MindsetSelectionScreen isReset={isReset} />
}
