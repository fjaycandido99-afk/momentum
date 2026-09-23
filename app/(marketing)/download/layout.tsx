import type { Metadata } from 'next'

// Leads with the product, matching the root layout: the mindset you are
// building. The era mechanic follows in the description — it is how the app
// works, not what it is.
export const metadata: Metadata = {
  title: 'Voxu — Build your mindset | Download for iOS',
  description: 'An AI coach that helps you build the mindset you want — and remembers what you said on day one. Pick a 30-day era, make one promise a day, and keep the record. Free on the App Store.',
  openGraph: {
    title: 'Voxu — Build your mindset',
    description: 'An AI coach that helps you build the mindset you want — and remembers what you said on day one. Pick a 30-day era, make one promise a day, and keep the record.',
    url: 'https://voxu.app/download',
    siteName: 'Voxu',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Voxu — Build your mindset' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voxu — Build your mindset',
    description: 'Pick an era. One promise a day. Your coach keeps count.',
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
