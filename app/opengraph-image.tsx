import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Voxu - Your AI Audio Coach'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          backgroundColor: '#0a0a0f',
        }}
      >
        {/* Background image */}
        <img
          src={`${process.env.NEXT_PUBLIC_APP_URL || 'https://voxu.app'}/og-bg.jpg`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            opacity: 0.6,
          }}
        />

        {/* Dark gradient overlay */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Logo circles */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: '50%',
              border: '3px dashed rgba(255,255,255,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                border: '3px dotted rgba(255,255,255,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '3px dashed rgba(255,255,255,0.45)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    backgroundColor: 'white',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: 'white',
              letterSpacing: -1,
            }}
          >
            Voxu
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 26,
              color: 'rgba(255,255,255,0.7)',
              marginTop: 8,
            }}
          >
            Your AI Audio Coach
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 16,
            }}
          >
            Motivation, mindfulness, and focus — delivered automatically
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
