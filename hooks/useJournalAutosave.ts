import { useState, useEffect, useRef, useCallback } from 'react'

type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseJournalAutosaveOptions {
  onSave: () => Promise<void>
  enabled: boolean
  debounceMs?: number
}

export function useJournalAutosave(
  deps: unknown[],
  options: UseJournalAutosaveOptions,
) {
  const { onSave, enabled, debounceMs = 2000 } = options
  const [status, setStatus] = useState<AutosaveStatus>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  // Debounced autosave on content change
  useEffect(() => {
    // Skip first render (initial load from server)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (!enabledRef.current) return

    // Check if any dep has content
    const hasContent = deps.some(
      (d) => typeof d === 'string' && d.trim().length > 0,
    )
    if (!hasContent) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await onSaveRef.current()
        setStatus('saved')
        // Reset to idle after 2s
        setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
      } catch {
        setStatus('error')
        setTimeout(() => setStatus((s) => (s === 'error' ? 'idle' : s)), 3000)
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // Fire-and-forget save on unmount
  useEffect(() => {
    return () => {
      if (enabledRef.current) {
        // Best-effort save — don't await
        onSaveRef.current().catch(() => {})
      }
    }
  }, [])

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setStatus('saving')
    try {
      await onSaveRef.current()
      setStatus('saved')
      setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 2000)
    } catch {
      setStatus('error')
    }
  }, [])

  return { status, saveNow }
}
