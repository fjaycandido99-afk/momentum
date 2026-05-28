'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
import { DesktopDock } from '@/components/navigation/DesktopDock'
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

          {/* Desktop chrome: a floating bottom dock instead of a sidebar.
              Sidebars push the app toward "productivity software" — Voxu's
              identity is cinematic / immersive, so the dock keeps the
              canvas open and matches MinimalNav's glass language. */}
          {!hideChrome && <DesktopDock />}

          {/* Main content. Full-bleed on every breakpoint — no sidebar
              offset, no max-width cap. The dock floats above the canvas
              instead of consuming layout space. Bottom padding leaves
              clear room under the dock / mobile capsules. */}
          <main
            id="main-content"
            key={pathname}
            className={`relative z-10 min-h-screen page-enter ${isHome ? '' : 'pb-16'} ${!hideChrome ? 'lg:pb-28' : ''}`}
          >
            {children}
          </main>

          {/* Mobile chrome — hidden on desktop where the dock takes over */}
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
