'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { ResetOverlay } from '@/components/ResetOverlay'

// Lets any screen open the Reset/SOS overlay. Default is a no-op so
// useReset() is safe even outside the provider.
const ResetCtx = createContext<{ openReset: () => void }>({ openReset: () => {} })

export const useReset = () => useContext(ResetCtx)

export function ResetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <ResetCtx.Provider value={{ openReset: () => setOpen(true) }}>
      {children}
      <ResetOverlay open={open} onClose={() => setOpen(false)} />
    </ResetCtx.Provider>
  )
}
