'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
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
          <main id="main-content" key={pathname} className={`relative z-10 min-h-screen page-enter ${isHome ? '' : 'pb-16'}`}>
            {children}
          </main>
          {!isHome && !hideChrome && <MinimalNav />}
        </div>
      </ResetProvider>
    </Providers>
  )
}
