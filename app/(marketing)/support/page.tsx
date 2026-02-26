import Link from 'next/link'

export const metadata = {
  title: 'Support | Voxu',
  description: 'Get help with Voxu — contact our support team.',
}

export default function SupportPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Support
          </h1>
          <p className="text-sm text-white/50">
            We&apos;re here to help
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20 space-y-10">
        {/* Contact */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            If you have questions, feedback, or need help with your account, reach out to us at:
          </p>
          <a
            href="mailto:support@voxu.app"
            className="inline-block text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            support@voxu.app
          </a>
          <p className="text-sm text-white/50 mt-2">
            We typically respond within 24 hours.
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-white mb-1">How do I cancel my subscription?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                You can manage or cancel your subscription through your device&apos;s settings. On iOS, go to Settings &gt; Apple ID &gt; Subscriptions &gt; Voxu. On the web, visit your account settings within the app.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-1">How do I restore my purchases?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                If you reinstalled the app or switched devices, go to Settings in the app and tap &quot;Restore Purchases&quot; to recover your premium access.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-1">How do I delete my account?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                You can delete your account from the Settings page in the app. This will permanently remove all your data. You can also email us at support@voxu.app to request account deletion.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-white mb-1">Is my data secure?</h3>
              <p className="text-sm text-white/70 leading-relaxed">
                Yes. We use industry-standard encryption and security practices to protect your data. Read our{' '}
                <Link href="/privacy" className="text-blue-400 hover:text-blue-300 transition-colors">
                  Privacy Policy
                </Link>{' '}
                for full details.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="pt-6 border-t border-white/10">
          <div className="flex flex-wrap gap-4 text-xs text-white/40">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">
              Terms of Service
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
