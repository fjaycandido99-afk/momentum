import type { Metadata, Viewport } from 'next'
import { Inter, Cormorant_Garamond } from 'next/font/google'
import './globals.css'
import { AppWrapper } from '@/components/AppWrapper'
import { Analytics } from '@/components/analytics/Analytics'
import { SkipToContent } from '@/components/a11y/SkipToContent'

const inter = Inter({ subsets: ['latin'] })
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['300'], variable: '--font-cormorant' })

export const metadata: Metadata = {
  title: 'Voxu - Your AI Audio Coach',
  description: 'Motivation, mindfulness, and focus - delivered automatically',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Voxu',
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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
