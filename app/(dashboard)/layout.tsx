'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
import { DesktopDock } from '@/components/navigation/DesktopDock'
import { PageTransition } from '@/components/ui/PageTransition'
import { AmbientBackground } from '@/components/ui/AmbientBackground'
import { Providers } from './providers'
import { ResetProvider } from '@/contexts/ResetContext'
import { ShareSheetProvider } from '@/components/social/ShareSheetProvider'

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
        <ShareSheetProvider>
        <div className="isolate min-h-screen bg-black">
          <AmbientBackground />

          {/* Main content. Full-bleed on every breakpoint — no sidebar
              offset, no max-width cap. The dock floats inside main (below)
              instead of as a sibling, so fullscreen player overlays
              (z-55+) inside main correctly paint OVER the dock (z-40)
              within main's own stacking context. Bottom padding leaves
              clear room under the floating dock + mobile capsules. */}
          <main
            id="main-content"
            key={pathname}
            className={`relative z-10 min-h-screen page-enter ${isHome ? '' : 'pb-16'} ${!hideChrome ? 'lg:pb-40' : ''}`}
          >
            {children}

            {/* Bottom scrim — fades page content to black behind the
                floating dock so the dock's translucent pill never has
                scroll content (music tiles, card rows) peeking around or
                through it. z-20 so it sits ABOVE default page content
                (z-0) and main's relative z-10 children, but BELOW the
                BottomPlayerBar (z-30) and dock (z-40) so neither is
                covered. Desktop only — mobile uses opaque chrome. */}
            {!hideChrome && (
              <div
                aria-hidden
                className="hidden lg:block fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black via-black/85 to-transparent z-20 pointer-events-none"
              />
            )}

            {/* Desktop chrome: a floating bottom dock instead of a sidebar.
                Mounted INSIDE main so its z-40 is scoped to main's
                stacking context — overlays (player, modal) at z-55+ stay
                on top of the dock when active. */}
            {!hideChrome && <DesktopDock />}

            {/* Mobile chrome — also INSIDE main for the same stacking-
                context reason. Mounted outside the lg:hidden wrapper
                used to keep the Home pill visible above the modal
                backdrop (sibling of main → root context → above
                main's z-10), which then bled THROUGH the community
                share modal. Inside main, MinimalNav's z-30 is
                scoped to main and the z-50 share modal correctly
                covers it. */}
            {!isHome && !hideChrome && (
              <div className="lg:hidden">
                <MinimalNav />
              </div>
            )}
          </main>
        </div>
        </ShareSheetProvider>
      </ResetProvider>
    </Providers>
  )
}
