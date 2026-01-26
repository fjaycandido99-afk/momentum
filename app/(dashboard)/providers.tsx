'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { AudioProvider } from '@/contexts/AudioContext'
import { UpgradeModalWithContext } from '@/components/premium/UpgradeModal'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SubscriptionProvider>
      <ThemeProvider>
        <AudioProvider>
          <NotificationProvider>
            {children}
            <UpgradeModalWithContext />
          </NotificationProvider>
        </AudioProvider>
      </ThemeProvider>
    </SubscriptionProvider>
  )
}
