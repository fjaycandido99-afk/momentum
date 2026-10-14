import type { Metadata } from 'next'

// The app's first-launch story. Not a page for search.
export const metadata: Metadata = {
  title: 'Voxu',
  robots: { index: false, follow: false },
}

export default function IntroLayout({ children }: { children: React.ReactNode }) {
  return children
}
