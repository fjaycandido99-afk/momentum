'use client'

import { ReactNode } from 'react'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SubscriptionProvider } from '@/contexts/SubscriptionContext'
import { MindsetProvider } from '@/contexts/MindsetContext'
import { AudioProvider } from '@/contexts/AudioContext'
import { HomeAudioProvider } from '@/contexts/HomeAudioContext'
import { AchievementProvider } from '@/contexts/AchievementContext'
import { OfflineProvider } from '@/contexts/OfflineContext'
import { OfflineBanner } from '@/components/OfflineBanner'
import { KeyboardAware } from '@/components/ui/KeyboardAware'
import { NativePushRegistrar } from '@/components/notifications/NativePushRegistrar'
import { NotificationOpenTracker } from '@/components/notifications/NotificationOpenTracker'
import { ReferralClaim } from '@/components/referral/ReferralClaim'
import { UpgradeModalWithContext } from '@/components/premium/UpgradeModal'
import { FeatureTooltipProvider } from '@/components/premium/FeatureTooltip'
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
                <HomeAudioProvider>
                  <AchievementProvider>
                    <ToastProvider>
                      <FeatureTooltipProvider>
                        <OfflineBanner />
                        {/* Keeps the focused field above the keyboard. Here
                            rather than per-sheet: seven surfaces have text
                            fields, and the next one somebody writes would
                            not have remembered. */}
                        <KeyboardAware />
                        <NativePushRegistrar />
                        <NotificationOpenTracker />
                        {/* Attributes a signup to the /i/<code> link they came from. */}
                        <ReferralClaim />
                        {children}
                        <UpgradeModalWithContext />
                        <ToastContainer />
                      </FeatureTooltipProvider>
                    </ToastProvider>
                  </AchievementProvider>
                </HomeAudioProvider>
              </AudioProvider>
            </OfflineProvider>
          </ThemeProvider>
        </MindsetProvider>
      </SubscriptionProvider>
    </SWRConfig>
  )
}
