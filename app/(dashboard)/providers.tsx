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
import { ToastProvider } from '@/contexts/ToastContext'
import { ToastContainer } from '@/components/ui/ToastContainer'
import { SWRConfig } from 'swr'
import { swrDefaults } from '@/lib/swr-config'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SWRConfig value={swrDefaults}>
      <SubscriptionProvider>
        <MindsetProvider>
          <ThemeProvider>
            <OfflineProvider>
              <AudioProvider>
                <AchievementProvider>
                  <ToastProvider>
                    <OfflineBanner />
                    {children}
                    <UpgradeModalWithContext />
                    <ToastContainer />
                  </ToastProvider>
                </AchievementProvider>
              </AudioProvider>
            </OfflineProvider>
          </ThemeProvider>
        </MindsetProvider>
      </SubscriptionProvider>
    </SWRConfig>
  )
}
