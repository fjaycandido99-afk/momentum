'use client'

import { usePathname } from 'next/navigation'
import { MinimalNav } from '@/components/navigation/MinimalNav'
import { DailyBackground } from '@/components/player/DailyBackground'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { Providers } from './providers'

function MindsetBackground() {
  const mindsetCtx = useMindsetOptional()
  return <DailyBackground animate mindsetFilter={mindsetCtx?.backgroundPool} />
}

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
        {!hideChrome && (
          <div className="fixed inset-0 -z-10 pointer-events-none">
            <MindsetBackground />
          </div>
        )}
        <main key={pathname} className={`min-h-screen ${isHome ? '' : 'pb-16'}`}>
          {children}
        </main>
        {!isHome && !hideChrome && <MinimalNav />}
      </div>
    </Providers>
  )
}
