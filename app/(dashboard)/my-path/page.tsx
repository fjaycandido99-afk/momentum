'use client'

import { useState, useEffect } from 'react'
import { PathPage } from '@/components/path/PathPage'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { LoadingScreen } from '@/components/ui/LoadingSpinner'

export default function MyPathRoute() {
  const mindsetCtx = useMindsetOptional()
  const [minDelayDone, setMinDelayDone] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMinDelayDone(true), 2500)
    return () => clearTimeout(timer)
  }, [])

  if (!minDelayDone || !mindsetCtx || mindsetCtx.isLoading) {
    return <LoadingScreen />
  }

  return <PathPage mindsetId={mindsetCtx.mindset} />
}
