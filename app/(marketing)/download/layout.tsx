import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Voxu — 30 days, one promise a day | Download for iOS',
  description: 'Pick a 30-day era, make one promise a day, and keep a record of the days you kept it. Your coach remembers what you said on day one. Free on the App Store.',
  openGraph: {
    title: 'Voxu — 30 days, one promise a day',
    description: 'Pick a 30-day era, make one promise a day, and keep a record of the days you kept it. Your coach remembers what you said on day one.',
    url: 'https://voxu.app/download',
    siteName: 'Voxu',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Voxu — 30 days, one promise a day' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voxu — 30 days, one promise a day',
    description: 'Pick an era. One promise a day. Keep the record.',
    images: ['/og-image.png'],
  },
}

export default function DownloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // No wrapper layout — the page handles its own header/footer
  return <>{children}</>
}
