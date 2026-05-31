'use client'

/* ============================================================================
   CommunityAccessGate — drop this at the TOP of any community-page client
   component to redirect non-allowed users back to /.

   The /api/social/* routes already 404 for disallowed users, so the page
   would otherwise just fail to load posts and look broken. This gives a
   clean redirect instead.

   Use:
     export default function CommunityPage() {
       return (
         <>
           <CommunityAccessGate />
           ...normal page body...
         </>
       )
     }
   ============================================================================ */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCommunityAccess } from '@/hooks/useCommunityAccess'

export function CommunityAccessGate() {
  const access = useCommunityAccess()
  const router = useRouter()
  useEffect(() => {
    if (access === false) router.replace('/')
  }, [access, router])
  return null
}
