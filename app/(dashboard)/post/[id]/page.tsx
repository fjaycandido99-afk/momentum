/* ============================================================================
   /post/[id] — server wrapper that generates OG/Twitter metadata for
   shareable link previews. The interactive body lives in
   PostDetailClient (client component).

   generateMetadata reads the post directly from the DB (no API hop) so
   crawlers without cookies still get the right tags. The body itself
   still requires auth — but the head tags are rendered into the HTML
   shell regardless, so Twitter / iMessage / Slack previews work.

   For posts that are hidden or crisis-locked, we serve a generic title
   so we don't accidentally surface concerning content in unfurls.
   ============================================================================ */

import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { PostDetailClient } from './PostDetailClient'

interface RouteContext { params: Promise<{ id: string }> }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '').trim() || 'https://voxu.app'

function buildOgPreviewUrl(title: string): string {
  // No bespoke OG-image renderer yet — fall back to the app's static
  // social card. Swap to a /api/og?title=... endpoint when ready.
  return `${APP_URL}/og-default.png`
}

export async function generateMetadata({ params }: RouteContext): Promise<Metadata> {
  const { id } = await params
  try {
    const post = await prisma.socialPost.findUnique({
      where: { id },
      select: {
        body: true,
        anonymous: true,
        hidden: true,
        crisis_level: true,
        user_id: true,
      },
    })
    if (!post || post.hidden || post.crisis_level === 'urgent') {
      return {
        title: 'A reflection — Voxu Community',
        description: 'A shared reflection from the Voxu Community.',
      }
    }
    const profile = post.anonymous ? null : await prisma.socialProfile.findUnique({
      where: { user_id: post.user_id },
      select: { handle: true, display_name: true },
    })
    const author = post.anonymous ? 'Anonymous' : (profile?.display_name || 'Someone')
    const excerpt = post.body.slice(0, 180) + (post.body.length > 180 ? '…' : '')
    const title = `${author} on Voxu Community`
    const url = `${APP_URL}/post/${id}`
    return {
      title,
      description: excerpt,
      openGraph: {
        type: 'article',
        url,
        title,
        description: excerpt,
        siteName: 'Voxu',
        images: [{ url: buildOgPreviewUrl(title) }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description: excerpt,
        images: [buildOgPreviewUrl(title)],
      },
      alternates: { canonical: url },
    }
  } catch {
    return {
      title: 'Voxu Community',
      description: 'Reflections from people doing the inner work.',
    }
  }
}

export default async function PostDetailPage({ params }: RouteContext) {
  const { id } = await params
  return <PostDetailClient id={id} />
}
