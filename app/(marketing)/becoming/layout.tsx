import type { Metadata } from 'next'

// Preview of the redesigned landing page ("The Art of Becoming"). Hidden:
// not linked anywhere and not indexed, until it replaces /download.
export const metadata: Metadata = {
  title: 'Voxu — The art of becoming',
  robots: { index: false, follow: false },
}

export default function BecomingLayout({ children }: { children: React.ReactNode }) {
  return children
}
