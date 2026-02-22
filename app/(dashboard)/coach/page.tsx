'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronLeft, Send, Loader2, Sparkles, Crown, MessageSquare, ClipboardList, Sun, Clock, Moon, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'
import { useMindsetOptional } from '@/contexts/MindsetContext'
import { MindsetIcon } from '@/components/mindset/MindsetIcon'
import { CoachingPlans } from '@/components/coach/CoachingPlans'
import { CoachAvatar, type CoachEmotion } from '@/components/coach/CoachAvatar'
import { FeatureHint } from '@/components/ui/FeatureHint'
import { TierBanner } from '@/components/premium/TierBanner'
import { MINDSET_CONFIGS, getCoachName } from '@/lib/mindset/configs'
import { getActivePlan, COACHING_PLANS, getPlanProgress } from '@/lib/coaching-plans'
import { logXPEventServer } from '@/lib/gamification'
import { useAchievementOptional } from '@/contexts/AchievementContext'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

const QUICK_REPLIES = [
  { label: "I'm stressed", icon: '😮‍💨' },
  { label: 'Motivate me', icon: '🔥' },
  { label: 'Help me focus', icon: '🎯' },
  { label: "I can't sleep", icon: '🌙' },
]

const CHECK_IN_TYPES = [
  { id: 'morning', label: 'Morning', icon: Sun, color: 'text-amber-400' },
  { id: 'midday', label: 'Midday', icon: Clock, color: 'text-blue-400' },
  { id: 'evening', label: 'Evening', icon: Moon, color: 'text-purple-400' },
  { id: 'goal-review', label: 'Goals', icon: BarChart3, color: 'text-green-400' },
]

const CHECK_IN_PROMPTS: Record<string, string> = {
  morning: "Good morning! What am I committing to today?",
  midday: "Midday check-in — how's my progress so far?",
  evening: "Evening reflection — what did I accomplish today?",
  'goal-review': "Let's review my goals. How am I doing?",
}

const COACH_GREETINGS: Record<string, string> = {
  stoic: "Hey! I'm **The Sage**, your Voxu mentor grounded in **Stoic** wisdom. I'll help you focus on what you can control, build resilience, and find clarity. How are you feeling today?",
  existentialist: "Hey! I'm **The Guide**, your Voxu mentor guided by **Existentialist** philosophy. I'm here to help you embrace freedom, find meaning, and make bold choices. What's on your mind?",
  cynic: "Hey! I'm **The Challenger**, your Voxu mentor channeling the **Cynic** spirit. Let's cut through the noise, question assumptions, and find what truly matters. What do you need today?",
  hedonist: "Hey! I'm **The Muse**, your Voxu mentor inspired by **Epicurean** wisdom. I'll help you find genuine joy, cultivate gratitude, and savor what matters. How can I support you today?",
  samurai: "Hey! I'm **The Sensei**, your Voxu mentor walking the **Samurai** path with you. I'll help you train with discipline, act with honor, and sharpen your focus. What shall we work on?",
  scholar: "Hey! I'm **The Oracle**, your Voxu mentor exploring the mysteries of mind and cosmos alongside you. I'll draw from **psychology, mythology, and the stars**. What are you seeking today?",
}

function formatTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// Simple markdown parser: **bold**, *italic*, line breaks
function renderMarkdown(text: string) {
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/)

  return paragraphs.map((para, pi) => {
    // Process inline markdown
    const tokens = para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    const rendered = tokens.map((token, ti) => {
      if (token.startsWith('**') && token.endsWith('**')) {
        return <strong key={ti} className="font-semibold text-white">{token.slice(2, -2)}</strong>
      }
      if (token.startsWith('*') && token.endsWith('*')) {
        return <em key={ti} className="italic text-white/70">{token.slice(1, -1)}</em>
      }
      // Handle single line breaks
      return token.split('\n').map((line, li, arr) => (
        <span key={`${ti}-${li}`}>
          {line}
          {li < arr.length - 1 && <br />}
        </span>
      ))
    })

    return (
      <p key={pi} className={pi > 0 ? 'mt-2' : ''}>
        {rendered}
      </p>
    )
  })
}

const EMOTION_KEYWORDS: { emotion: CoachEmotion; words: string[] }[] = [
  { emotion: 'excited', words: ["let's go", 'crush it', 'amazing', 'incredible', 'unstoppable', 'fire', 'dominate', 'beast'] },
  { emotion: 'happy', words: ['great', 'proud', 'well done', 'celebrate', 'awesome', 'fantastic', 'wonderful', 'excellent', 'congrats', 'progress', 'nice work'] },
  { emotion: 'empathetic', words: ['understand', 'sorry', 'tough', 'difficult', 'struggle', 'pain', 'hear you', "it's okay", 'valid', 'challenging', 'feel for you'] },
  { emotion: 'thinking', words: ['consider', 'think about', 'reflect', 'what if', 'perspective', 'hmm', 'interesting', 'let me'] },
]

function detectEmotion(text: string): CoachEmotion {
  const lower = text.toLowerCase()
  for (const { emotion, words } of EMOTION_KEYWORDS) {
    if (words.some(w => lower.includes(w))) return emotion
  }
  return 'idle'
}

export default function CoachPage() {
  const subscription = useSubscriptionOptional()
  const mindsetCtx = useMindsetOptional()
  const achievementCtx = useAchievementOptional()
  const [activeTab, setActiveTab] = useState<'chat' | 'plans'>('chat')
  const [chatMode, setChatMode] = useState<'coach' | 'accountability'>('coach')
  const [activePlanBanner, setActivePlanBanner] = useState<string | null>(null)
  const [hasLoggedCheckInXP, setHasLoggedCheckInXP] = useState(false)
  const [coachEmotion, setCoachEmotion] = useState<CoachEmotion>('idle')
  const emotionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setEmotionWithDecay = useCallback((emotion: CoachEmotion, decayMs = 4000) => {
    if (emotionTimerRef.current) clearTimeout(emotionTimerRef.current)
    setCoachEmotion(emotion)
    if (emotion !== 'idle') {
      emotionTimerRef.current = setTimeout(() => setCoachEmotion('idle'), decayMs)
    }
  }, [])

  useEffect(() => {
    const planId = getActivePlan()
    if (planId) {
      const plan = COACHING_PLANS.find(p => p.id === planId)
      const progress = getPlanProgress(planId)
      if (plan && progress) {
        const day = progress.completedDays.length + 1
        if (day <= 7) {
          setActivePlanBanner(`Day ${day} of ${plan.title}`)
        }
      }
    }
  }, [activeTab])

  const coachName = getCoachName(mindsetCtx?.mindset)
  const defaultGreeting = `Hey! I'm **${coachName}**, your Voxu mentor. How are you feeling today? I can help with motivation, goal-setting, stress, or just be here to listen.`
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: mindsetCtx ? (COACH_GREETINGS[mindsetCtx.mindset] || defaultGreeting) : defaultGreeting,
      timestamp: Date.now(),
    }
  ])

  // Update greeting once mindset loads (it may load after initial render)
  useEffect(() => {
    if (!mindsetCtx) return
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ ...prev[0], content: COACH_GREETINGS[mindsetCtx.mindset] || defaultGreeting }]
      }
      return prev
    })
  }, [mindsetCtx?.mindset])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (text?: string, checkInType?: string) => {
    const trimmed = (text || input).trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = { role: 'user', content: trimmed, timestamp: Date.now() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setShowQuickReplies(false)
    setIsLoading(true)
    setEmotionWithDecay('thinking', 30000)

    try {
      const context = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          context,
          mode: chatMode,
          checkInType,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: Date.now() }])
        setEmotionWithDecay(detectEmotion(data.reply))

        // Award XP on first accountability check-in per session
        if (chatMode === 'accountability' && !hasLoggedCheckInXP) {
          logXPEventServer('accountabilityCheckIn').then(result => {
            if (result?.newAchievements?.length && achievementCtx) {
              achievementCtx.triggerAchievements(result.newAchievements)
            }
          })
          setHasLoggedCheckInXP(true)
        }
      } else if (response.status === 403) {
        setMessages(prev => [...prev, { role: 'assistant', content: `This feature requires a **Premium** subscription. Upgrade to chat with **${coachName}**!`, timestamp: Date.now() }])
        setEmotionWithDecay('empathetic')
      } else {
        const errData = await response.json().catch(() => null)
        const detail = errData?.detail ? ` (${errData.detail})` : ''
        setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I couldn't process that. Please try again.${detail}`, timestamp: Date.now() }])
        setEmotionWithDecay('idle')
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please check your internet and try again.", timestamp: Date.now() }])
      setEmotionWithDecay('idle')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Non-premium view — plans are free, chat is premium
  if (subscription && !subscription.isPremium) {
    return (
      <div className="min-h-screen text-white flex flex-col">
        <div className="sticky top-0 z-50 px-6 pt-12 pb-4 mb-4 flex items-center gap-3 bg-black">
          <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
          <Link href="/" aria-label="Back to home" className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none">
            <ChevronLeft className="w-5 h-5 text-white/70" />
          </Link>
          <h1 className="text-2xl font-light shimmer-text">{coachName}</h1>
        </div>
        <TierBanner page="coach" />
        {/* Tab bar */}
        <div className="flex px-6 gap-2 pb-4 border-b border-white/10">
          <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all ${activeTab === 'chat' ? 'bg-black text-white border border-white/20' : 'bg-black text-white/60 border border-white/[0.08]'}`}>
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
          <button onClick={() => setActiveTab('plans')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all ${activeTab === 'plans' ? 'bg-black text-white border border-white/20' : 'bg-black text-white/60 border border-white/[0.08]'}`}>
            <ClipboardList className="w-3.5 h-3.5" /> Plans
          </button>
        </div>
        {activeTab === 'plans' ? (
          <div key="plans" className="flex-1 overflow-y-auto scrollbar-hide animate-fade-in">
            <CoachingPlans />
          </div>
        ) : (
          <div key="chat" className="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="bg-black rounded-2xl border border-white/10 p-8 text-center">
              <div className="p-4 rounded-full bg-amber-500/20 mb-4 mx-auto w-fit">
                <Crown className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-xl font-medium text-white mb-2">Premium Feature</h2>
              <p className="text-white/70 mb-6 max-w-xs">
                Get personalized coaching, motivation, and support from your AI wellness coach.
              </p>
              <button
                onClick={() => subscription?.openUpgradeModal()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all press-scale mx-auto"
              >
                <Sparkles className="w-5 h-5" />
                Upgrade to Premium
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen text-white flex flex-col">
      {/* Header with gradient */}
      <div className="sticky top-0 z-50 relative px-6 pt-12 pb-4 mb-4 flex items-center gap-3 bg-black">
        <div className="absolute -bottom-6 left-0 right-0 h-6 bg-gradient-to-b from-black via-black/60 to-transparent pointer-events-none" />
        {/* Subtle gradient glow behind header */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.06] to-transparent pointer-events-none" />
        <Link href="/" aria-label="Back to home" className="relative p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none">
          <ChevronLeft className="w-5 h-5 text-white/70" />
        </Link>
        <div className="relative flex items-center gap-3 flex-1">
          {/* Coach avatar */}
          <div className="relative">
            <CoachAvatar mindsetId={mindsetCtx?.mindset} size="lg" emotion={coachEmotion} />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#08080c]" />
          </div>
          <div>
            <h1 className="text-lg font-medium shimmer-text">{coachName}</h1>
            <p className="text-xs text-emerald-400/80">Online</p>
          </div>
          {mindsetCtx && (
            <div className="ml-auto flex items-center justify-center px-1.5 py-1 rounded-full bg-white/[0.06]">
              <MindsetIcon mindsetId={mindsetCtx.mindset} className="w-4 h-4 text-white/75" />
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex px-6 gap-2 py-2 border-b border-white/10">
        <button onClick={() => setActiveTab('chat')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all ${activeTab === 'chat' ? 'bg-black text-white border border-white/20' : 'bg-black text-white/60 border border-white/[0.08]'}`}>
          <MessageSquare className="w-3.5 h-3.5" /> Chat
        </button>
        <button onClick={() => setActiveTab('plans')} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm transition-all ${activeTab === 'plans' ? 'bg-black text-white border border-white/20' : 'bg-black text-white/60 border border-white/[0.08]'}`}>
          <ClipboardList className="w-3.5 h-3.5" /> Plans
        </button>
      </div>

      <TierBanner page="coach" />

      {/* Active plan banner in chat tab */}
      {activeTab === 'chat' && activePlanBanner && (
        <button
          onClick={() => setActiveTab('plans')}
          className="mx-6 mt-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 text-left hover:bg-amber-500/15 transition-colors"
        >
          {activePlanBanner} →
        </button>
      )}

      {activeTab === 'plans' ? (
        <div key="plans" className="flex-1 overflow-y-auto scrollbar-hide animate-fade-in">
          <CoachingPlans />
        </div>
      ) : (
      <div key="chat" className="flex-1 flex flex-col animate-fade-in">
      {/* Mode toggle pills */}
      <div className="flex px-6 gap-2 pt-3 pb-1">
        <button
          onClick={() => setChatMode('coach')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
            chatMode === 'coach'
              ? 'bg-black border border-amber-500/30 text-amber-400'
              : 'bg-black border border-white/[0.08] text-white/60'
          }`}
        >
          Coach
        </button>
        <button
          onClick={() => setChatMode('accountability')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
            chatMode === 'accountability'
              ? 'bg-black border border-emerald-500/30 text-emerald-400'
              : 'bg-black border border-white/[0.08] text-white/60'
          }`}
        >
          Check-in
        </button>
      </div>

      {/* Check-in quick actions (only when accountability mode + at start) */}
      {chatMode === 'accountability' && showQuickReplies && messages.length === 1 && (
        <div className="px-6 py-3">
          <p className="text-xs text-white/60 mb-2">Quick check-in</p>
          <div className="grid grid-cols-2 gap-2">
            {CHECK_IN_TYPES.map(type => {
              const Icon = type.icon
              return (
                <button
                  key={type.id}
                  onClick={() => sendMessage(CHECK_IN_PROMPTS[type.id], type.id)}
                  className="flex items-center gap-2 p-3 rounded-xl bg-black border border-white/10 hover:border-white/20 transition-all press-scale"
                >
                  <Icon className={`w-4 h-4 ${type.color}`} />
                  <span className="text-xs text-white/85">{type.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            style={{ animationDelay: `${Math.min(i * 50, 200)}ms` }}
          >
            {/* Coach avatar for assistant messages */}
            {msg.role === 'assistant' && (
              <CoachAvatar mindsetId={mindsetCtx?.mindset} size="md" className="mr-2 mt-1" emotion="idle" />
            )}
            <div className="flex flex-col">
              <div
                className={`max-w-[80%] p-3.5 text-sm leading-relaxed rounded-2xl border border-white/10 ${
                  msg.role === 'user'
                    ? 'bg-black text-white rounded-br-md'
                    : 'bg-black text-white/70 rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
              <span className={`text-[10px] text-white/40 mt-1 ${msg.role === 'user' ? 'text-right' : 'ml-1'}`}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div role="status" aria-label="Coach is typing" className="flex justify-start animate-fade-in-up">
            <CoachAvatar mindsetId={mindsetCtx?.mindset} size="md" className="mr-2 mt-1" emotion="thinking" />
            <div className="p-3.5 bg-black rounded-2xl rounded-bl-md border border-white/10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick reply chips (coach mode only) */}
        {chatMode === 'coach' && showQuickReplies && messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.label}
                aria-label={`Quick reply: ${qr.label}`}
                onClick={() => sendMessage(qr.label)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-black rounded-2xl border border-white/10 text-sm text-white/70 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <span>{qr.icon}</span>
                <span>{qr.label}</span>
              </button>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 pb-8 pt-4 border-t border-white/15 bg-black/80 backdrop-blur-xl">
        <FeatureHint id="coach-intro" text={`Ask anything — ${coachName} adapts to your mindset`} mode="once" />
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            aria-label={chatMode === 'accountability' ? 'Share your progress...' : 'Ask your coach...'}
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setEmotionWithDecay(e.target.value.length > 0 ? 'listening' : 'idle')
            }}
            onKeyDown={handleKeyDown}
            placeholder={chatMode === 'accountability' ? 'Share your progress...' : 'Ask your coach...'}
            className="flex-1 p-3 rounded-xl bg-white/[0.05] border border-white/15 text-white placeholder-white/50 focus:outline-none focus:border-amber-500/30 focus:bg-white/[0.07] focus-visible:ring-1 focus-visible:ring-amber-500/20 resize-none max-h-32 transition-all"
            rows={1}
          />
          <button
            aria-label={isLoading ? 'Sending...' : 'Send message'}
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-400'
                : 'bg-white/5 text-white/40'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
      </div>
      )}
    </div>
  )
}
