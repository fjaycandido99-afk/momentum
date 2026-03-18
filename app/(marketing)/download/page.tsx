'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wind,
  Brain,
  Moon,
  Music,
  Mic,
  Sparkles,
  Shield,
  Heart,
  Star,
  ChevronDown,
  Play,
  Headphones,
  Clock,
  Zap,
} from 'lucide-react'

const APP_STORE_URL = 'https://apps.apple.com/app/id6759702163'

function VoxuLogo({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="100" fill="#0a0a0f"/>
      <circle cx="256" cy="256" r="186" stroke="rgba(255,255,255,0.9)" strokeWidth="9" fill="none"/>
      <circle cx="256" cy="256" r="133" stroke="rgba(255,255,255,0.92)" strokeWidth="10" fill="none"/>
      <circle cx="256" cy="256" r="80" stroke="rgba(255,255,255,0.95)" strokeWidth="11" fill="none"/>
      <circle cx="256" cy="256" r="36" fill="rgba(255,255,255,0.15)"/>
      <circle cx="256" cy="256" r="26" fill="white"/>
    </svg>
  )
}

function AppStoreBadge() {
  return (
    <a
      href={APP_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 bg-white text-black px-7 py-4 rounded-2xl font-semibold text-lg hover:bg-white/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
    >
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
      </svg>
      <div className="text-left">
        <div className="text-[10px] font-normal opacity-70 leading-none">Download on the</div>
        <div className="text-xl font-semibold leading-tight">App Store</div>
      </div>
    </a>
  )
}

const FEATURES = [
  {
    icon: Mic,
    title: 'Guided Voice Sessions',
    description: 'Breathing exercises, affirmations, gratitude meditations, and more — narrated in your chosen voice tone.',
  },
  {
    icon: Music,
    title: 'Ambient Soundscapes',
    description: 'Rain, ocean waves, forest sounds, and lo-fi beats to help you focus, relax, or sleep.',
  },
  {
    icon: Brain,
    title: 'AI Daily Coach',
    description: 'Personalized daily guides that adapt to your schedule, mood, and journal entries.',
  },
  {
    icon: Sparkles,
    title: 'Motivation Library',
    description: 'Curated motivational content to fuel your morning routine and keep momentum all day.',
  },
  {
    icon: Moon,
    title: 'Sleep & Wind Down',
    description: 'Evening routines with sleep meditations, progressive relaxation, and calming audio.',
  },
  {
    icon: Shield,
    title: '6 Mindset Philosophies',
    description: 'Choose from Stoic, Warrior, Scholar, Zen, Visionary, or Empath — shaping your entire experience.',
  },
]

const TESTIMONIALS = [
  {
    text: "I've tried every meditation app. Voxu is the first one that actually fits into my day without feeling like a chore.",
    name: 'Early Tester',
    role: 'Beta User',
  },
  {
    text: "The guided breathing before work completely changed my mornings. I feel focused instead of rushed.",
    name: 'Beta Tester',
    role: 'Professional',
  },
  {
    text: "Love that I can pick a mindset philosophy. The Stoic path resonates with me deeply.",
    name: 'Beta User',
    role: 'Student',
  },
]

function FloatingOrb({ delay, size, x }: { delay: number; size: number; x: number }) {
  return (
    <div
      className="absolute rounded-full bg-white/[0.03] blur-3xl pointer-events-none"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        top: '20%',
        animation: `float ${8 + delay}s ease-in-out infinite`,
        animationDelay: `${delay}s`,
      }}
    />
  )
}

export default function DownloadPage() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-30px); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.1); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-up {
          animation: fade-up 0.8s ease-out forwards;
        }
        .animate-fade-up-delay-1 {
          animation: fade-up 0.8s ease-out 0.15s forwards;
          opacity: 0;
        }
        .animate-fade-up-delay-2 {
          animation: fade-up 0.8s ease-out 0.3s forwards;
          opacity: 0;
        }
        .animate-fade-up-delay-3 {
          animation: fade-up 0.8s ease-out 0.45s forwards;
          opacity: 0;
        }
      `}</style>

      {/* Floating background orbs */}
      <FloatingOrb delay={0} size={400} x={10} />
      <FloatingOrb delay={2} size={300} x={70} />
      <FloatingOrb delay={4} size={250} x={40} />

      {/* Sticky header */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/download" className="flex items-center gap-2.5">
            <VoxuLogo size={32} />
            <span className="text-lg font-semibold">Voxu</span>
          </a>
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white text-black px-5 py-2 rounded-full text-sm font-semibold hover:bg-white/90 transition-all"
          >
            Download Free
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-4 pt-20 pb-16">
        {/* Concentric rings background */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative">
            {[320, 480, 640].map((size, i) => (
              <div
                key={size}
                className="absolute rounded-full border border-white/[0.04]"
                style={{
                  width: size,
                  height: size,
                  top: -(size / 2),
                  left: -(size / 2),
                  animation: `pulse-ring ${6 + i * 2}s ease-in-out infinite`,
                  animationDelay: `${i * 0.5}s`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <div className="animate-fade-up">
            <div className="flex justify-center mb-8">
              <VoxuLogo size={80} />
            </div>
          </div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight mb-6 animate-fade-up-delay-1">
            Your AI
            <br />
            <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              Audio Coach
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-xl mx-auto mb-10 leading-relaxed animate-fade-up-delay-2">
            Motivation, mindfulness, and focus — delivered through guided sessions,
            ambient soundscapes, and personalized AI coaching.
          </p>

          <div className="animate-fade-up-delay-3 flex flex-col items-center gap-4">
            <AppStoreBadge />
            <span className="text-sm text-white/40">Free to start. No credit card required.</span>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown className="w-6 h-6 text-white/20" />
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap items-center justify-center gap-8 sm:gap-16 text-center">
          <div>
            <div className="text-2xl font-bold">9+</div>
            <div className="text-sm text-white/50">Guided voice types</div>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold">6</div>
            <div className="text-sm text-white/50">Mindset philosophies</div>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div>
            <div className="text-2xl font-bold">50+</div>
            <div className="text-sm text-white/50">Pre-recorded sessions</div>
          </div>
          <div className="w-px h-8 bg-white/10 hidden sm:block" />
          <div>
            <div className="flex gap-0.5 justify-center mb-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-white/80 text-white/80" />
              ))}
            </div>
            <div className="text-sm text-white/50">Loved by beta testers</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            How Voxu Works
          </h2>
          <p className="text-white/50 text-center mb-16 max-w-lg mx-auto">
            Three simple steps to a calmer, more focused you.
          </p>

          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              {
                step: '01',
                icon: Headphones,
                title: 'Choose Your Path',
                desc: 'Pick your mindset philosophy and voice tone. Voxu shapes every session around your preferences.',
              },
              {
                step: '02',
                icon: Play,
                title: 'Press Play',
                desc: 'Start your daily guide with breathing, affirmations, motivation, and more — all in one flow.',
              },
              {
                step: '03',
                icon: Zap,
                title: 'Build Momentum',
                desc: 'Journal your wins, track your streak, and watch AI personalize your journey over time.',
              },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/5 border border-white/10 mb-5 group-hover:bg-white/10 transition-colors">
                  <item.icon className="w-7 h-7 text-white/80" />
                  <span className="absolute -top-2 -right-2 text-[10px] font-bold bg-white text-black w-5 h-5 rounded-full flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-white/50 text-center mb-16 max-w-lg mx-auto">
            A complete wellness toolkit in your pocket.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
                  <feature.icon className="w-6 h-6 text-white/70" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voice tones section */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Your Voice, Your Way
          </h2>
          <p className="text-white/50 mb-12 max-w-lg mx-auto">
            Choose the tone that resonates with you. Every guided session adapts.
          </p>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            {[
              { tone: 'Calm', desc: 'Soft & soothing', icon: Heart },
              { tone: 'Neutral', desc: 'Balanced & clear', icon: Wind },
              { tone: 'Direct', desc: 'Focused & concise', icon: Zap },
            ].map((v) => (
              <div
                key={v.tone}
                className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/15 transition-all"
              >
                <v.icon className="w-6 h-6 text-white/60 mx-auto mb-3" />
                <div className="font-semibold">{v.tone}</div>
                <div className="text-xs text-white/40 mt-1">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            What People Are Saying
          </h2>

          <div className="grid sm:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/[0.03] border border-white/5"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-white/60 text-white/60" />
                  ))}
                </div>
                <p className="text-sm text-white/70 leading-relaxed mb-4">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="text-sm">
                  <span className="text-white/80">{t.name}</span>
                  <span className="text-white/30"> &middot; {t.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-24 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Start Free Today
          </h2>
          <p className="text-white/50 mb-8 leading-relaxed">
            Get daily guided sessions, soundscapes, and motivation at no cost.
            Upgrade to Premium for unlimited access, AI coaching, and all voice tones.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            <div className="px-6 py-4 rounded-2xl bg-white/[0.03] border border-white/10">
              <div className="text-sm text-white/50 mb-1">Free</div>
              <div className="text-2xl font-bold">$0</div>
              <div className="text-xs text-white/40 mt-1">Daily sessions included</div>
            </div>
            <div className="px-6 py-4 rounded-2xl bg-white/[0.05] border border-white/20 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold bg-white text-black px-3 py-0.5 rounded-full">
                POPULAR
              </div>
              <div className="text-sm text-white/50 mb-1">Premium</div>
              <div className="text-2xl font-bold">$4.17<span className="text-sm font-normal text-white/40">/mo</span></div>
              <div className="text-xs text-white/40 mt-1">$49.99/year (40% off)</div>
            </div>
          </div>

          <AppStoreBadge />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4 relative">
        {/* Background glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] bg-white/[0.02] rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-6">
            <VoxuLogo size={56} />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Ready to begin?
          </h2>
          <p className="text-white/50 mb-8 text-lg">
            Download Voxu and start your first session in under a minute.
          </p>
          <AppStoreBadge />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <VoxuLogo size={24} />
            <span className="text-sm text-white/40">&copy; {new Date().getFullYear()} Voxu. All rights reserved.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Terms
            </Link>
            <Link href="/support" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Support
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
