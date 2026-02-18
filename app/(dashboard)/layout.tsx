'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
import { PageTransition } from '@/components/ui/PageTransition'
import { Providers } from './providers'

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
      <div className="isolate min-h-screen bg-black">
        <main id="main-content" key={pathname} className={`min-h-screen page-enter ${isHome ? '' : 'pb-16'}`}>
          {children}
        </main>
        {!isHome && !hideChrome && <MinimalNav />}
      </div>
    </Providers>
  )
}
