/* eslint-disable @next/next/no-img-element */
/**
 * GET /api/og/post?id=<postId> — generates a 1200x630 PNG for OG
 * unfurls on iMessage / Slack / X / Discord / Facebook etc.
 *
 * Edge runtime + Satori (via next/og) so it's fast (~150ms cold) and
 * cheap. Auth-free by design — crawlers don't have cookies, and the
 * data we render (body excerpt + author handle + mindset) is already
 * public via the OG meta tags on /post/[id]. Hidden posts and
 * urgent-crisis posts get a generic safety fallback card.
 *
 * Cache for an hour at the edge — post bodies don't change, and even
 * if they did, an unfurl preview going slightly stale is harmless.
 */

import { ImageResponse } from 'next/og'
import { prisma } from '@/lib/prisma'
import { InkSpiral } from '@/components/social/InkSpiral'

export const runtime = 'nodejs' // needs prisma — edge wouldn't bundle it cleanly
export const dynamic = 'force-dynamic'

const W = 1200
const H = 630

// Fallback card for hidden / crisis-urgent / unknown posts. Keeps the
// brand vibe without leaking any post-specific copy.
function FallbackCard() {
  return (
    <div
      style={{
        width: W,
        height: H,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'radial-gradient(circle at 30% 30%, #1a1a22 0%, #050507 70%)',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
        <div style={{ width: 18, height: 18, borderRadius: 999, background: 'white', boxShadow: '0 0 30px rgba(255,255,255,0.6)' }} />
        <div style={{ fontSize: 38, fontWeight: 600, letterSpacing: -1 }}>Voxu</div>
      </div>
      <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.65)' }}>A reflection · Community</div>
    </div>
  )
}

function clampExcerpt(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, ' ').trim()
  if (trimmed.length <= max) return trimmed
  // Avoid cutting mid-word.
  const slice = trimmed.slice(0, max)
  const lastSpace = slice.lastIndexOf(' ')
  return (lastSpace > max * 0.7 ? slice.slice(0, lastSpace) : slice) + '…'
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const postId = url.searchParams.get('id')
  if (!postId) {
    return new ImageResponse(<FallbackCard />, { width: W, height: H })
  }

  try {
    const post = await prisma.socialPost.findUnique({
      where: { id: postId },
      select: {
        body: true,
        anonymous: true,
        hidden: true,
        crisis_level: true,
        mindset_id: true,
        user_id: true,
      },
    })

    if (!post || post.hidden || post.crisis_level === 'urgent') {
      return new ImageResponse(<FallbackCard />, { width: W, height: H })
    }

    const profile = post.anonymous ? null : await prisma.socialProfile.findUnique({
      where: { user_id: post.user_id },
      select: { handle: true, display_name: true, spiral_name: true },
    })

    // Author's journal-entry count drives the OG avatar InkSpiral —
    // power-journalers get a denser mandala on their shared links.
    const entryCount = post.anonymous
      ? 0
      : await prisma.dailyGuide.count({
          where: {
            user_id: post.user_id,
            OR: [
              { journal_win: { not: null } },
              { journal_gratitude: { not: null } },
              { journal_learned: { not: null } },
              { journal_intention: { not: null } },
              { journal_freetext: { not: null } },
            ],
          },
        }).catch(() => 0)

    const author = post.anonymous ? 'Anonymous' : (profile?.display_name || 'Someone')
    const handle = post.anonymous ? null : (profile?.handle || null)
    const spiralName = post.anonymous ? null : (profile?.spiral_name || null)
    const excerpt = clampExcerpt(post.body, 260)

    return new ImageResponse(
      (
        <div
          style={{
            width: W,
            height: H,
            display: 'flex',
            flexDirection: 'column',
            background: 'radial-gradient(circle at 25% 20%, #1c1c26 0%, #050507 70%)',
            color: 'white',
            fontFamily: 'system-ui, sans-serif',
            padding: 64,
            position: 'relative',
          }}
        >
          {/* Top brand row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                background: 'white',
                boxShadow: '0 0 24px rgba(255,255,255,0.55)',
              }}
            />
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: -0.8 }}>Voxu</div>
            <div style={{ marginLeft: 14, fontSize: 18, color: 'rgba(255,255,255,0.42)', letterSpacing: 4, textTransform: 'uppercase' }}>
              Community
            </div>
          </div>

          {/* Body excerpt */}
          <div
            style={{
              display: 'flex',
              fontSize: excerpt.length > 180 ? 36 : 42,
              lineHeight: 1.32,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.94)',
              marginTop: 70,
              flex: 1,
              fontStyle: 'italic',
            }}
          >
            <div>&ldquo;{excerpt}&rdquo;</div>
          </div>

          {/* Author + mindset */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              borderTop: '1px solid rgba(255,255,255,0.10)',
              paddingTop: 24,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                fontSize: 28,
                fontWeight: 600,
              }}
            >
              {post.anonymous || !handle
                ? '·'
                : <InkSpiral seed={handle} entryCount={entryCount} size={60} />}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 26, fontWeight: 600 }}>{author}</div>
              {handle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18 }}>
                  <span style={{ color: 'rgba(255,255,255,0.50)' }}>@{handle}</span>
                  {spiralName && (
                    <>
                      <span style={{ color: 'rgba(255,255,255,0.28)' }}>·</span>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontStyle: 'italic' }}>
                        {spiralName}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            {post.mindset_id && (
              <div
                style={{
                  display: 'flex',
                  marginLeft: 'auto',
                  padding: '8px 16px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  fontSize: 16,
                  letterSpacing: 3,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                {post.mindset_id}
              </div>
            )}
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        headers: {
          // 1h public cache + stale-while-revalidate so unfurls are
          // snappy even on the second crawler hit, AND any edits get
          // picked up reasonably fast.
          'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      },
    )
  } catch (err) {
    console.error('[og/post] error:', err)
    return new ImageResponse(<FallbackCard />, { width: W, height: H })
  }
}
