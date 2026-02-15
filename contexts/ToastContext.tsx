'use client'

import { createContext, useContext, useCallback, useState, useRef, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'milestone'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration: number
  action?: ToastAction
}

interface ToastContextValue {
  toasts: Toast[]
  showToast: (opts: { message: string; type?: ToastType; duration?: number; action?: ToastAction }) => string
  dismissToast: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const MAX_TOASTS = 3
const DEFAULT_DURATIONS: Record<ToastType, number> = {
  info: 3000,
  success: 3000,
  error: 5000,
  milestone: 3000,
}

let toastCounter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const dismissToast = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const showToast = useCallback((opts: { message: string; type?: ToastType; duration?: number; action?: ToastAction }) => {
    const type = opts.type || 'info'
    const duration = opts.duration ?? DEFAULT_DURATIONS[type]
    const id = `toast-${++toastCounter}`

    const toast: Toast = { id, message: opts.message, type, duration, action: opts.action }

    setToasts(prev => {
      const next = [...prev, toast]
      // Evict oldest if over max
      while (next.length > MAX_TOASTS) {
        const evicted = next.shift()!
        const timer = timersRef.current.get(evicted.id)
        if (timer) {
          clearTimeout(timer)
          timersRef.current.delete(evicted.id)
        }
      }
      return next
    })

    // Auto-dismiss
    const timer = setTimeout(() => dismissToast(id), duration)
    timersRef.current.set(id, timer)

    return id
  }, [dismissToast])

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
