'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PathPage } from '@/components/path/PathPage'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'

export default function MyPathRoute() {
  const router = useRouter()
  const mindsetCtx = useMindsetOptional()
  const [minDelayDone, setMinDelayDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Redirect Scholar users to their dedicated Cosmic Guide page
    if (mindsetCtx && !mindsetCtx.isLoading && mindsetCtx.isScholar) {
      router.replace('/astrology')
    }
  }, [mindsetCtx, router])

  if (!minDelayDone || !mindsetCtx || mindsetCtx.isLoading) {
    return <LoadingScreen />
  }

  // Scholar users get redirected above
  if (mindsetCtx.isScholar) {
    return <LoadingScreen />
  }

  const mindsetId = mindsetCtx.mindset as Exclude<typeof mindsetCtx.mindset, 'scholar'>

  return <PathPage mindsetId={mindsetId} />
}
