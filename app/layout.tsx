import type { Metadata, Viewport } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { AppWrapper } from '@/components/AppWrapper'
import { Analytics } from '@/components/analytics/Analytics'
import { SkipToContent } from '@/components/a11y/SkipToContent'

const inter = Inter({ subsets: ['latin'] })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300'], variable: '--font-cormorant' })

export const metadata: Metadata = {
  metadataBase: new URL('https://voxu.app'),
  title: 'Voxu - Your AI Audio Coach',
  description: 'Motivation, mindfulness, and focus — delivered automatically through guided sessions, ambient soundscapes, and AI coaching.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Voxu',
  },
  openGraph: {
    title: 'Voxu - Your AI Audio Coach',
    description: 'Motivation, mindfulness, and focus — delivered automatically through guided sessions, ambient soundscapes, and AI coaching.',
    url: 'https://voxu.app',
    siteName: 'Voxu',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Voxu - Your AI Audio Coach' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voxu - Your AI Audio Coach',
    description: 'Motivation, mindfulness, and focus — delivered automatically.',
    images: ['/og-image.png'],
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
  maximumScale: 5,
  userScalable: true,
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
