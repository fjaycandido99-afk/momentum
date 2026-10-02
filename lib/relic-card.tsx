import { ImageResponse } from 'next/og'
import { badgeImage, type Achievement } from '@/lib/achievements'
import { achievementLine } from '@/lib/achievement-lines'
import { ogFonts, typeset } from '@/lib/og-fonts'

/**
 * A relic's share card — Story-sized (1080×1920), like the era card. The
 * coin large, what it is, what it means, when it was earned. No name: the
 * card is the coin, and who shares it is already obvious from who sent it.
 *
 * The coin is the raw struck art: the in-app steel/silver/gold is a CSS
 * filter, which the image renderer can't apply, so the rarity is named in
 * words instead.
 */
const W = 1080
const H = 1920
const SERIF = 'Cormorant'
const RARITY_WORD: Record<Achievement['rarity'], string> = {
  common: 'STEEL RELIC',
  rare: 'SILVER RELIC',
  epic: 'GOLD RELIC',
  legendary: 'LEGENDARY RELIC',
}
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export async function relicCardImage(a: Achievement, unlockedAt: Date | null, origin: string): Promise<ImageResponse> {
  const src = badgeImage(a.id, a.category)
  const coin = src ? new URL(src, origin).toString() : null
  const line = achievementLine(a.id)
  const earned = unlockedAt ? `Earned ${MONTHS[unlockedAt.getUTCMonth()]} ${unlockedAt.getUTCFullYear()}` : null
  const gold = a.rarity === 'epic' || a.rarity === 'legendary'

  return new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#000', color: '#fff', position: 'relative' }}>
        {/* A soft light behind the coin, warmer for gold. */}
        <div style={{
          position: 'absolute', top: 260, left: 90, width: 900, height: 900, borderRadius: 450, display: 'flex',
          background: gold
            ? 'radial-gradient(circle, rgba(214,170,118,0.28) 0%, rgba(0,0,0,0) 65%)'
            : 'radial-gradient(circle, rgba(214,224,238,0.18) 0%, rgba(0,0,0,0) 65%)',
        }} />
        <div style={{ display: 'flex', marginTop: 110, fontSize: 34, letterSpacing: 16, color: 'rgba(255,255,255,0.75)', fontFamily: SERIF, fontWeight: 500 }}>
          VOXU
        </div>
        {coin && (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={coin} width={680} height={680} style={{ marginTop: 170, width: 680, height: 680, borderRadius: 340 }} />
        )}
        <div style={{ display: 'flex', marginTop: 90, fontSize: 28, letterSpacing: 9, color: gold ? 'rgba(232,199,154,0.9)' : 'rgba(255,255,255,0.6)' }}>
          {RARITY_WORD[a.rarity]}
        </div>
        <div style={{ display: 'flex', marginTop: 22, fontSize: 104, lineHeight: 1, fontFamily: SERIF, fontWeight: 600, textAlign: 'center', padding: '0 80px' }}>
          {typeset(a.title)}
        </div>
        {line && (
          <div style={{ display: 'flex', marginTop: 30, fontSize: 46, lineHeight: 1.25, color: 'rgba(255,255,255,0.82)', fontFamily: SERIF, fontWeight: 500, textAlign: 'center', padding: '0 110px' }}>
            {typeset(line)}
          </div>
        )}
        <div style={{ display: 'flex', marginTop: 30, fontSize: 30, color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '0 120px' }}>
          {typeset(earned ? `${a.description} · ${earned}` : a.description)}
        </div>
        <div style={{ position: 'absolute', bottom: 110, display: 'flex', fontSize: 36, color: 'rgba(255,255,255,0.7)' }}>
          voxu.app
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: await ogFonts(),
      headers: { 'Cache-Control': 'private, no-store' },
    },
  )
}
