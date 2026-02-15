'use client'

import { useToast, type Toast } from '@/contexts/ToastContext'

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const baseClass = 'flex items-center gap-3 px-4 py-2.5 rounded-full backdrop-blur-md toast-enter'

  const variantClass =
    toast.type === 'error'
      ? 'bg-red-500/15 border border-red-500/25'
      : toast.type === 'milestone'
        ? 'bg-amber-500/15 border border-amber-500/25'
        : 'bg-white/10 border border-white/15'

  const textClass =
    toast.type === 'error'
      ? 'text-sm text-red-200/90 font-medium'
      : toast.type === 'milestone'
        ? 'text-sm text-amber-200/90 font-medium'
        : 'text-sm text-white/90 font-medium'

  return (
    <div className={`${baseClass} ${variantClass}`} role="alert">
      <p className={`${textClass} whitespace-nowrap`}>{toast.message}</p>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick()
            onDismiss()
          }}
          className="text-xs font-semibold text-white/80 hover:text-white bg-white/10 px-2.5 py-1 rounded-full transition-colors whitespace-nowrap"
        >
          {toast.action.label}
        </button>
      )}
    </div>
  )
}

export function ToastContainer() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-auto">
      {toasts.map(toast => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  )
}
