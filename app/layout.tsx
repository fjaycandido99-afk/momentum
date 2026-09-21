import type { Metadata, Viewport } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { AppWrapper } from '@/components/AppWrapper'
import { Analytics } from '@/components/analytics/Analytics'
import { SkipToContent } from '@/components/a11y/SkipToContent'

const inter = Inter({ subsets: ['latin'] })
// 300 for the splash wordmark; 500/600 for the era hero's display type.
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300', '500', '600'], variable: '--font-cormorant' })

// The title and description used to describe the pre-era library
// ("guided sessions, ambient soundscapes"), which the landing page had
// already stopped selling — the app and its own marketing disagreed about
// what the product is.
export const metadata: Metadata = {
  metadataBase: new URL('https://voxu.app'),
  title: 'Voxu — 30 days, one promise a day',
  description: 'Pick a 30-day era, make one promise a day, and keep a record of the days you kept it. Your coach remembers what you said on day one.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Voxu',
  },
  openGraph: {
    title: 'Voxu — 30 days, one promise a day',
    description: 'Pick a 30-day era, make one promise a day, and keep a record of the days you kept it. Your coach remembers what you said on day one.',
    url: 'https://voxu.app',
    siteName: 'Voxu',
    type: 'website',
    locale: 'en_US',
    // Site-wide default — rendered on the fly by /api/og/default
    // (Voxu-branded card with the cinematic aura signature). Pages
    // that want a bespoke unfurl (e.g. /post/[id]) override locally.
    images: [{ url: '/api/og/default', width: 1200, height: 630, alt: 'Voxu' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voxu — 30 days, one promise a day',
    description: 'Pick an era. One promise a day. Keep the record.',
    images: ['/api/og/default'],
  },
  robots: {
    index: true,
    follow: true,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0e12' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="32x32" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://jkrpreixylczfdfdyxrm.supabase.co" crossOrigin="anonymous" />
      </head>
      <body className={`${inter.className} ${cormorant.variable} antialiased`}>
        <SkipToContent />
        <AppWrapper>
          {children}
        </AppWrapper>
        <Analytics />
      </body>
    </html>
  )
}
