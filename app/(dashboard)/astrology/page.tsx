'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AstrologyPage } from '@/components/astrology/AstrologyPage'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'

export default function AstrologyRoute() {
  const router = useRouter()
  const mindsetCtx = useMindsetOptional()
  const [minDelayDone, setMinDelayDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Redirect non-Scholar users away from astrology
    if (mindsetCtx && !mindsetCtx.isLoading && !mindsetCtx.isScholar) {
      router.replace('/')
    }
  }, [mindsetCtx, router])

  if (!minDelayDone || !mindsetCtx || mindsetCtx.isLoading) {
    return <LoadingScreen />
  }

  if (!mindsetCtx.isScholar) {
    return <LoadingScreen />
  }

  return <AstrologyPage />
}
