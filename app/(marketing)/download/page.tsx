import { BecomingPage } from '@/components/becoming/BecomingPage'
import { IntroSections } from '@/components/becoming/IntroSections'

// The landing page: "The Art of Becoming" (a statue carved as you scroll,
// one chapter per part of the app), then what is inside, the prices and the
// way in. The old long-scroll intro's best parts live in IntroSections.
export default function DownloadPage() {
  return (
    <BecomingPage>
      <IntroSections />
    </BecomingPage>
  )
}
