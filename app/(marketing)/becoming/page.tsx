import { permanentRedirect } from 'next/navigation'

// The preview became the landing page.
export default function Becoming() {
  permanentRedirect('/download')
}
