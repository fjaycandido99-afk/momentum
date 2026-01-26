'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { UpgradeModalWithContext } from '@/components/premium/UpgradeModal'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SubscriptionProvider>
      <ThemeProvider>
        <NotificationProvider>
          {children}
          <UpgradeModalWithContext />
        </NotificationProvider>
      </ThemeProvider>
    </SubscriptionProvider>
  )
}
