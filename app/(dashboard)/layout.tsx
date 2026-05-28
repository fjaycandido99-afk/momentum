'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
import { DesktopSidebar } from '@/components/navigation/DesktopSidebar'
import { PageTransition } from '@/components/ui/PageTransition'
import { AmbientBackground } from '@/components/ui/AmbientBackground'
import { Providers } from './providers'
import { ResetProvider } from '@/contexts/ResetContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isHome = pathname === '/'
  const isMindsetSelection = pathname?.startsWith('/mindset-selection')
  const isOnboarding = pathname?.startsWith('/daily-guide/onboarding')
  const hideChrome = isMindsetSelection || isOnboarding

  return (
    <Providers>
      <ResetProvider>
        <div className="isolate min-h-screen bg-black">
          <AmbientBackground />

          {/* Desktop sidebar (lg+ only — hidden lg:flex internally).
              Renders alongside the existing mobile chrome so phones see
              the exact same UI as before. */}
          {!hideChrome && <DesktopSidebar />}

          {/* Main content.
              - Mobile: full width, bottom padding for the floating capsules.
              - Desktop: shifted right of the sidebar (lg:pl-60) and capped at
                a comfortable reading width (lg:max-w-5xl) so the layout
                doesn't stretch edge-to-edge on a 16" MacBook. Full-bleed
                surfaces (the SessionPlayer, ResetOverlay) escape via fixed
                positioning so the max-width doesn't fight them. */}
          <main
            id="main-content"
            key={pathname}
            className={`relative z-10 min-h-screen page-enter ${isHome ? '' : 'pb-16 lg:pb-0'} ${!hideChrome ? 'lg:pl-60' : ''}`}
          >
            {/* Section pages cap at a reading-comfortable width and center.
                Home stays full-bleed (sidebar-offset only) so the immersive
                visuals can breathe to the edge of a wide monitor. */}
            <div className={!hideChrome && !isHome ? 'lg:max-w-5xl lg:mx-auto lg:px-8' : ''}>
              {children}
            </div>
          </main>

          {/* Mobile chrome — hidden on desktop where the sidebar takes over */}
          {!isHome && !hideChrome && (
            <div className="lg:hidden">
              <MinimalNav />
            </div>
          )}
        </div>
      </ResetProvider>
    </Providers>
  )
}
