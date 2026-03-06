import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Voxu - Your AI Audio Coach | Download for iOS',
  description: 'Motivation, mindfulness, and focus — delivered through guided sessions, ambient soundscapes, and personalized AI coaching. Download Voxu free on the App Store.',
  openGraph: {
    title: 'Voxu - Your AI Audio Coach',
    description: 'Guided breathing, affirmations, soundscapes, and AI coaching — all in one app. Download free.',
    url: 'https://voxu.app/download',
    siteName: 'Voxu',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Voxu - Your AI Audio Coach' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Voxu - Your AI Audio Coach',
    description: 'Guided breathing, affirmations, soundscapes, and AI coaching. Download free.',
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
