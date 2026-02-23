import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | Voxu',
  description: 'Voxu Privacy Policy — how we collect, use, and protect your data.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-sm text-white/50">
            Last updated: February 22, 2026
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* Intro */}
        <section className="py-6">
          <p className="text-sm text-white/70 leading-relaxed">
            Voxu (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) operates the Voxu application and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service. Please read this policy carefully. By using Voxu, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        {/* 1. Information We Collect */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            1. Information We Collect
          </h2>

          <h3 className="text-base font-medium text-white mb-2">
            Account Information
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            When you create an account, we collect your email address, display name, and authentication credentials. If you sign in with a third-party provider (e.g., Google, Apple), we receive your name and email from that provider.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            User-Generated Content
          </h3>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li>Journal entries and reflections</li>
            <li>Goals and checkpoint progress</li>
            <li>AI coach conversations</li>
            <li>Mindset and preference selections</li>
          </ul>

          <h3 className="text-base font-medium text-white mb-2">
            Usage Data
          </h3>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li>Session activity (duration, features used)</li>
            <li>Music and soundscape preferences</li>
            <li>Device type, browser, and operating system</li>
            <li>Interaction patterns to improve the experience</li>
          </ul>

          <h3 className="text-base font-medium text-white mb-2">
            Push Notification Tokens
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            If you enable push notifications, we store your device push token to deliver reminders and updates. You can disable notifications at any time through your device settings.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Payment Information
          </h3>
          <p className="text-sm text-white/70 leading-relaxed">
            Payment details (credit card numbers, billing addresses) are collected and processed directly by our payment processors (Stripe and RevenueCat). We do not store your full payment information on our servers.
          </p>
        </section>

        {/* 2. How We Use Your Information */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li>Provide, operate, and maintain the Voxu service</li>
            <li>Personalize your experience (AI coaching, content recommendations, mindset-based content)</li>
            <li>Process subscriptions and payments</li>
            <li>Send push notifications and reminders (with your consent)</li>
            <li>Analyze usage patterns to improve our features</li>
            <li>Respond to support inquiries and communicate service updates</li>
            <li>Detect and prevent fraud or abuse</li>
          </ul>
        </section>

        {/* 3. Third-Party Services */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            3. Third-Party Services
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            We use the following third-party services to operate Voxu. Each has its own privacy policy governing the use of your information:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li><strong className="text-white/90">Supabase</strong> — Authentication and database hosting</li>
            <li><strong className="text-white/90">Stripe</strong> — Payment processing for web subscriptions</li>
            <li><strong className="text-white/90">RevenueCat</strong> — Mobile subscription management (iOS/Android)</li>
            <li><strong className="text-white/90">Groq</strong> — AI language model processing for coaching and content generation</li>
            <li><strong className="text-white/90">ElevenLabs</strong> — Text-to-speech audio generation</li>
            <li><strong className="text-white/90">YouTube</strong> — Embedded media playback (music, soundscapes, guided content)</li>
          </ul>
        </section>

        {/* 4. Data Storage & Security */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            4. Data Storage &amp; Security
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Your data is stored on secure servers provided by Supabase. We implement industry-standard security measures including encryption in transit (TLS) and at rest. While we strive to protect your information, no method of electronic transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            AI conversations are processed in real time and are not retained by our AI providers beyond what is necessary to generate a response. Your journal entries and AI conversation history are stored in our database and associated with your account.
          </p>
        </section>

        {/* 5. Your Rights */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            5. Your Rights
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            You have the following rights regarding your personal data:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li><strong className="text-white/90">Access</strong> — Request a copy of the personal data we hold about you</li>
            <li><strong className="text-white/90">Correction</strong> — Request that we correct inaccurate or incomplete data</li>
            <li><strong className="text-white/90">Deletion</strong> — Request that we delete your account and associated data</li>
            <li><strong className="text-white/90">Export</strong> — Request a portable copy of your data</li>
            <li><strong className="text-white/90">Opt-out</strong> — Disable push notifications or marketing communications at any time</li>
          </ul>
          <p className="text-sm text-white/70 leading-relaxed mt-4">
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:privacy@voxu.app" className="text-amber-400 hover:text-amber-300 transition-colors">
              privacy@voxu.app
            </a>.
            We will respond to your request within 30 days.
          </p>
        </section>

        {/* 6. GDPR (European Users) */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            6. GDPR — European Users
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, the following additional provisions apply under the General Data Protection Regulation (GDPR):
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Lawful Basis for Processing
          </h3>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li><strong className="text-white/90">Consent</strong> — For push notifications, optional analytics, and marketing communications</li>
            <li><strong className="text-white/90">Contract</strong> — To provide the Voxu service you signed up for, including AI coaching and content delivery</li>
            <li><strong className="text-white/90">Legitimate Interest</strong> — To improve our service, prevent fraud, and ensure security</li>
          </ul>

          <h3 className="text-base font-medium text-white mb-2">
            Your GDPR Rights
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            In addition to the rights listed in Section 5, you have the right to:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li><strong className="text-white/90">Restrict Processing</strong> — Request that we limit how we use your data</li>
            <li><strong className="text-white/90">Data Portability</strong> — Receive your data in a structured, machine-readable format</li>
            <li><strong className="text-white/90">Object</strong> — Object to processing based on legitimate interest</li>
            <li><strong className="text-white/90">Withdraw Consent</strong> — Withdraw any previously given consent at any time</li>
            <li><strong className="text-white/90">Lodge a Complaint</strong> — File a complaint with your local data protection authority</li>
          </ul>

          <h3 className="text-base font-medium text-white mb-2">
            Data Retention
          </h3>
          <p className="text-sm text-white/70 leading-relaxed">
            We retain your personal data only for as long as necessary to provide our services and fulfill the purposes described in this policy. When you delete your account, we will delete or anonymize your data within 30 days, except where we are required to retain it by law.
          </p>
        </section>

        {/* 7. CCPA/CPRA (California Users) */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            7. CCPA/CPRA — California Users
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) provide you with additional rights regarding your personal information.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Categories of Personal Information Collected
          </h3>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li><strong className="text-white/90">Identifiers</strong> — Email address, display name, device identifiers</li>
            <li><strong className="text-white/90">Commercial Information</strong> — Subscription and payment history</li>
            <li><strong className="text-white/90">Internet Activity</strong> — Usage data, interaction patterns, feature preferences</li>
            <li><strong className="text-white/90">Inferences</strong> — Content preferences derived from your usage</li>
          </ul>

          <h3 className="text-base font-medium text-white mb-2">
            Your CCPA/CPRA Rights
          </h3>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li><strong className="text-white/90">Right to Know</strong> — Request what personal information we collect, use, and disclose</li>
            <li><strong className="text-white/90">Right to Delete</strong> — Request deletion of your personal information</li>
            <li><strong className="text-white/90">Right to Correct</strong> — Request correction of inaccurate personal information</li>
            <li><strong className="text-white/90">Right to Opt-Out</strong> — Opt out of the sale or sharing of your personal information</li>
            <li><strong className="text-white/90">Non-Discrimination</strong> — We will not discriminate against you for exercising your privacy rights</li>
          </ul>

          <h3 className="text-base font-medium text-white mb-2">
            Do Not Sell or Share
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Voxu does not sell your personal information. We do not share your personal information for cross-context behavioral advertising purposes.
          </p>

          <p className="text-sm text-white/70 leading-relaxed">
            To exercise your California privacy rights, contact us at{' '}
            <a href="mailto:privacy@voxu.app" className="text-amber-400 hover:text-amber-300 transition-colors">
              privacy@voxu.app
            </a>.
            We will verify your identity before processing your request and respond within 45 days.
          </p>
        </section>

        {/* 8. International Data Transfers */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            8. International Data Transfers
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Your information may be transferred to and processed in countries other than your country of residence, including the United States. These countries may have different data protection laws. When we transfer your data internationally, we ensure appropriate safeguards are in place, including standard contractual clauses approved by relevant authorities, to protect your personal information in accordance with this policy.
          </p>
        </section>

        {/* 9. Children's Privacy */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            9. Children&apos;s Privacy
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            Voxu is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal data from a child under 13 without parental consent, we will take steps to delete that information. If you believe we may have collected information from a child under 13, please contact us at{' '}
            <a href="mailto:privacy@voxu.app" className="text-amber-400 hover:text-amber-300 transition-colors">
              privacy@voxu.app
            </a>.
          </p>
        </section>

        {/* 10. Cookies & Local Storage */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            10. Cookies &amp; Local Storage
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Voxu uses cookies and browser local storage to:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li>Maintain your authentication session</li>
            <li>Remember your preferences (theme, mindset, audio settings)</li>
            <li>Cache content for offline access and performance</li>
          </ul>
          <p className="text-sm text-white/70 leading-relaxed mt-4">
            We use a service worker to cache static assets and background images for improved performance. We do not use cookies for advertising or cross-site tracking.
          </p>
        </section>

        {/* 11. Changes to This Policy */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            11. Changes to This Policy
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            We may update this Privacy Policy from time to time. When we make changes, we will update the &quot;Last updated&quot; date at the top of this page. We encourage you to review this policy periodically. Continued use of Voxu after changes are posted constitutes your acceptance of the updated policy.
          </p>
        </section>

        {/* 12. Contact Us */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            12. Contact Us
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            If you have any questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p className="text-sm text-white/70 leading-relaxed mt-2">
            <a href="mailto:privacy@voxu.app" className="text-amber-400 hover:text-amber-300 transition-colors">
              privacy@voxu.app
            </a>
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-white/50 text-sm">
          <span>Voxu {new Date().getFullYear()}</span>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:text-white/70 transition-colors">Terms</Link>
            <Link href="/privacy" className="text-white/70">Privacy</Link>
            <a href="mailto:support@voxu.app" className="hover:text-white/70 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
