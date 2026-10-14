'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isNativeApp } from '@/lib/native'
import { BecomingPage } from '@/components/becoming/BecomingPage'
import { markIntroSeen } from '@/lib/marketing/intro-seen'

// The app's intro: the same story as the landing page, without anything to
// download or buy. Begin (or Skip) goes on to the first conversation.
export default function IntroPage() {
  const router = useRouter()
  // Mark the app, so the landing redirect on / can never catch it.
  useEffect(() => {
    if (isNativeApp()) document.cookie = 'voxu_app=1; path=/; max-age=31536000; samesite=lax'
  }, [])
  const begin = () => {
    markIntroSeen()
    router.replace('/')
  }
  return <BecomingPage app onBegin={begin} />
}
