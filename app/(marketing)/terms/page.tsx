import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | Voxu',
  description: 'Voxu Terms of Service — rules and guidelines for using our platform.',
}

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="pt-20 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
            Terms of Service
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
            Welcome to Voxu. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Voxu application, website, and related services (collectively, the &quot;Service&quot;). By creating an account or using Voxu, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>
        </section>

        {/* 1. Account Responsibilities */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            1. Account Responsibilities
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            You must be at least 13 years old to use Voxu. By creating an account, you represent that you meet this requirement.
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You must provide accurate and complete information when creating your account</li>
            <li>You must notify us immediately of any unauthorized use of your account</li>
          </ul>
        </section>

        {/* 2. Subscription & Billing */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            2. Subscription &amp; Billing
          </h2>

          <h3 className="text-base font-medium text-white mb-2">
            Free Tier
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Voxu offers a free tier with limited features, including one session per day, 10-minute session limits, and rotating daily music. The free tier is available indefinitely at no cost.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Premium Subscription
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Premium subscriptions unlock unlimited sessions, all music genres, journal history, checkpoints, and additional features. Premium is available as a monthly or yearly plan.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Free Trial
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            New premium subscribers may be eligible for a 7-day free trial. If you do not cancel before the trial ends, you will be automatically charged for the selected plan.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Payment Processing
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Web payments are processed by Stripe. Mobile payments (iOS/Android) are processed through the respective app store via RevenueCat. All prices are in USD unless otherwise stated.
          </p>

          <h3 className="text-base font-medium text-white mb-2">
            Cancellation &amp; Refunds
          </h3>
          <p className="text-sm text-white/70 leading-relaxed">
            You may cancel your subscription at any time. Upon cancellation, you will retain access to premium features until the end of your current billing period. Refunds are handled in accordance with the policies of the payment platform through which you subscribed (Stripe, Apple App Store, or Google Play Store).
          </p>
        </section>

        {/* 3. AI-Generated Content Disclaimer */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            3. AI-Generated Content Disclaimer
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Voxu uses artificial intelligence to generate coaching responses, journal prompts, motivational content, and other personalized material. This AI-generated content is for informational and motivational purposes only.
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li>AI content does <strong className="text-white/90">not</strong> constitute professional medical, psychological, financial, or legal advice</li>
            <li>You should not rely on AI-generated content as a substitute for professional guidance</li>
            <li>AI responses may occasionally be inaccurate or incomplete</li>
            <li>If you are experiencing a mental health crisis, please contact a qualified professional or emergency services</li>
          </ul>
        </section>

        {/* 4. Acceptable Use */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            4. Acceptable Use
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            You agree not to:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1">
            <li>Use the Service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to our systems or other users&apos; accounts</li>
            <li>Interfere with or disrupt the integrity or performance of the Service</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Use automated tools (bots, scrapers) to access the Service without permission</li>
            <li>Transmit harmful code, malware, or viruses through the Service</li>
            <li>Abuse, harass, or attempt to exploit the AI coaching features</li>
            <li>Share your account credentials with others or create multiple free accounts to circumvent limits</li>
          </ul>
        </section>

        {/* 5. User Content */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            5. User Content
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            You retain ownership of all content you create within Voxu, including journal entries, goals, reflections, and other personal data (&quot;User Content&quot;).
          </p>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            By using the Service, you grant Voxu a limited, non-exclusive license to process your User Content solely for the purpose of delivering and improving the Service. This includes processing content through our AI systems to generate personalized responses.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            We do not sell, share, or use your User Content for advertising. We will not use your User Content to train AI models without your explicit consent.
          </p>
        </section>

        {/* 6. Intellectual Property */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            6. Intellectual Property
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Voxu and its original content (excluding User Content), features, functionality, branding, AI prompts, and design are and will remain the exclusive property of Voxu and its licensors. The Service is protected by copyright, trademark, and other applicable laws.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            You may not copy, modify, distribute, sell, or lease any part of our Service or its content without our prior written consent.
          </p>
        </section>

        {/* 7. Termination */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            7. Termination
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            We reserve the right to suspend or terminate your account at any time if you violate these Terms or engage in behavior that is harmful to other users, us, or third parties.
          </p>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            You may delete your account at any time by contacting us. Upon account deletion, your personal data will be removed in accordance with our{' '}
            <Link href="/privacy" className="text-amber-400 hover:text-amber-300 transition-colors">
              Privacy Policy
            </Link>.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            If your account is terminated due to a Terms violation, you may not be eligible for a refund of any prepaid subscription fees.
          </p>
        </section>

        {/* 8. Limitation of Liability */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            8. Limitation of Liability &amp; Disclaimers
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOXU SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, LOSS OF PROFITS, OR PERSONAL INJURY ARISING OUT OF YOUR USE OF THE SERVICE.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            OUR TOTAL LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
          </p>
        </section>

        {/* 9. Governing Law */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            9. Governing Law
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these Terms or the Service will be resolved through binding arbitration in accordance with applicable rules, except where prohibited by law. You agree to waive any right to a jury trial or to participate in a class action.
          </p>
        </section>

        {/* 10. International Users (GDPR) */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            10. International Users — GDPR
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            If you are located in the European Economic Area (EEA), the United Kingdom, or Switzerland, the following additional terms apply:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li>We process your personal data in accordance with the General Data Protection Regulation (GDPR) and applicable local laws</li>
            <li>You have the right to access, correct, delete, restrict processing of, and port your personal data as described in our{' '}
              <Link href="/privacy" className="text-amber-400 hover:text-amber-300 transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>You may withdraw consent for optional data processing at any time without affecting the lawfulness of prior processing</li>
            <li>You have the right to lodge a complaint with your local data protection authority</li>
          </ul>
          <p className="text-sm text-white/70 leading-relaxed">
            Your data may be transferred to and processed in countries outside the EEA. When this occurs, we ensure appropriate safeguards are in place, including standard contractual clauses, to protect your data in accordance with GDPR requirements.
          </p>
        </section>

        {/* 11. California Users (CCPA/CPRA) */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            11. California Users — CCPA/CPRA
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            If you are a California resident, the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA) grant you additional rights:
          </p>
          <ul className="list-disc list-inside text-sm text-white/70 space-y-1 mb-4">
            <li><strong className="text-white/90">Right to Know</strong> — You may request details about the personal information we collect, use, and disclose</li>
            <li><strong className="text-white/90">Right to Delete</strong> — You may request deletion of your personal information, subject to certain exceptions</li>
            <li><strong className="text-white/90">Right to Correct</strong> — You may request correction of inaccurate personal information</li>
            <li><strong className="text-white/90">Right to Opt-Out</strong> — You may opt out of the sale or sharing of your personal information</li>
            <li><strong className="text-white/90">Non-Discrimination</strong> — We will not discriminate against you for exercising your privacy rights</li>
          </ul>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            Voxu does not sell your personal information and does not share it for cross-context behavioral advertising.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            For details on the categories of personal information we collect and how to exercise your rights, see our{' '}
            <Link href="/privacy" className="text-amber-400 hover:text-amber-300 transition-colors">
              Privacy Policy
            </Link>.
          </p>
        </section>

        {/* 12. Dispute Resolution */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            12. Dispute Resolution
          </h2>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            We encourage you to contact us first to resolve any disputes informally by emailing{' '}
            <a href="mailto:support@voxu.app" className="text-amber-400 hover:text-amber-300 transition-colors">
              support@voxu.app
            </a>.
            We will attempt to resolve any dispute within 30 days.
          </p>
          <p className="text-sm text-white/70 leading-relaxed">
            If an informal resolution is not reached, disputes will be resolved through binding arbitration as outlined in Section 9, except where prohibited by applicable law. Nothing in these Terms limits your right to bring claims before a competent court where required by law, including consumer protection laws in your jurisdiction.
          </p>
        </section>

        {/* 13. Changes to These Terms */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            13. Changes to These Terms
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            We may revise these Terms at any time by posting the updated version on this page with a new &quot;Last updated&quot; date. Your continued use of the Service after changes are posted constitutes your acceptance of the revised Terms. We encourage you to review these Terms periodically.
          </p>
        </section>

        {/* 14. Contact Us */}
        <section className="py-6 border-t border-white/5">
          <h2 className="text-xl font-semibold text-white mb-4">
            14. Contact Us
          </h2>
          <p className="text-sm text-white/70 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us at:
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
            <Link href="/terms" className="text-white/70">Terms</Link>
            <Link href="/privacy" className="hover:text-white/70 transition-colors">Privacy</Link>
            <a href="mailto:support@voxu.app" className="hover:text-white/70 transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
