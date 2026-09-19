import { ImageResponse } from 'next/og'
import { ERA_PRESETS_BY_KEY, DEFAULT_ERA_LENGTH_DAYS } from '@/lib/era/presets'
import { programFor } from '@/lib/era/programs'
import { eraKeyFromSlug } from '@/lib/era/share'
import { ogFonts, typeset } from '@/lib/og-fonts'

/**
 * The link preview for /join/<era> — what iMessage, WhatsApp, X and friends
 * show when someone pastes the link. The era's art on the right, its name in
 * the serif on the left, like the home hero.
 */
export const runtime = 'nodejs'
export const alt = 'Join an era on Voxu'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const SITE = 'https://voxu.app'

export default async function Image({ params }: { params: { slug: string } }) {
  const key = eraKeyFromSlug(params.slug)
  const preset = key ? ERA_PRESETS_BY_KEY.get(key) : null
  const title = (preset?.title ?? 'Who are you becoming?').toUpperCase()
  const art = `${SITE}${(key && programFor(key).image) || '/era/start.jpg'}`

  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', background: '#000', color: '#fff', position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src={art} width={560} height={630} style={{ position: 'absolute', right: 0, top: 0, width: 560, height: 630, objectFit: 'cover' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 560, height: 630, display: 'flex', background: 'linear-gradient(to right, #000 0%, rgba(0,0,0,0) 60%)' }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 72, width: 720 }}>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 8, color: 'rgba(255,255,255,0.6)' }}>JOIN THE ERA</div>
          <div style={{ display: 'flex', fontSize: title.length > 12 ? 84 : 104, lineHeight: 0.92, fontFamily: 'Cormorant', fontWeight: 600, marginTop: 16 }}>
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: 'rgba(255,255,255,0.75)', fontFamily: 'Cormorant', fontWeight: 500, marginTop: 22 }}>
            {typeset(preset?.tagline ?? 'Pick an era. Make one promise a day.')}
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: 'rgba(255,255,255,0.55)', marginTop: 40 }}>
            {`${DEFAULT_ERA_LENGTH_DAYS} days · one promise a day · voxu.app`}
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await ogFonts() },
  )
}
