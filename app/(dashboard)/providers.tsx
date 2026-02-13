'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { MindsetProvider } from '@/contexts/MindsetContext'
import { AudioProvider } from '@/contexts/AudioContext'
import { AchievementProvider } from '@/contexts/AchievementContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { OfflineBanner } from '@/components/OfflineBanner'
import { UpgradeModalWithContext } from '@/components/premium/UpgradeModal'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SubscriptionProvider>
      <MindsetProvider>
        <ThemeProvider>
          <OfflineProvider>
            <AudioProvider>
              <AchievementProvider>
                <OfflineBanner />
                {children}
                <UpgradeModalWithContext />
              </AchievementProvider>
            </AudioProvider>
          </OfflineProvider>
        </ThemeProvider>
      </MindsetProvider>
    </SubscriptionProvider>
  )
}
