'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, Send, Loader2, Sparkles, Crown, Bot } from 'lucide-react'
import Link from 'next/link'
import { useSubscriptionOptional } from '@/contexts/SubscriptionContext'

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
        return <em key={ti} className="italic text-white/80">{token.slice(1, -1)}</em>
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

export default function CoachPage() {
  const subscription = useSubscriptionOptional()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey! I'm your **Voxu Coach**. How are you feeling today? I can help with motivation, goal-setting, stress, or just be here to listen.",
      timestamp: Date.now(),
    }
  ])
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

  const sendMessage = async (text?: string) => {
    const trimmed = (text || input).trim()
    if (!trimmed || isLoading) return

    const userMessage: Message = { role: 'user', content: trimmed, timestamp: Date.now() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setShowQuickReplies(false)
    setIsLoading(true)

    try {
      const context = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, context }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, timestamp: Date.now() }])
      } else if (response.status === 403) {
        setMessages(prev => [...prev, { role: 'assistant', content: 'This feature requires a **Premium** subscription. Upgrade to chat with your AI Coach!', timestamp: Date.now() }])
      } else {
        const errData = await response.json().catch(() => null)
        const detail = errData?.detail ? ` (${errData.detail})` : ''
        setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I couldn't process that. Please try again.${detail}`, timestamp: Date.now() }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting. Please check your internet and try again.", timestamp: Date.now() }])
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

  // Non-premium view
  if (subscription && !subscription.isPremium) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col">
        <div className="px-6 pt-12 pb-6 flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-5 h-5 text-white/80" />
          </Link>
          <h1 className="text-2xl font-light">AI Coach</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="p-4 rounded-full bg-amber-500/20 mb-4">
            <Crown className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-medium text-white mb-2">Premium Feature</h2>
          <p className="text-white/60 text-center mb-6 max-w-xs">
            Get personalized coaching, motivation, and support from your AI wellness coach.
          </p>
          <button
            onClick={() => subscription?.openUpgradeModal()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium hover:from-amber-400 hover:to-orange-400 transition-all"
          >
            <Sparkles className="w-5 h-5" />
            Upgrade to Premium
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header with gradient */}
      <div className="relative px-6 pt-12 pb-4 flex items-center gap-3 border-b border-white/10">
        {/* Subtle gradient glow behind header */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/[0.06] to-transparent pointer-events-none" />
        <Link href="/" className="relative p-2 -ml-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-5 h-5 text-white/80" />
        </Link>
        <div className="relative flex items-center gap-3">
          {/* Coach avatar */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#08080c]" />
          </div>
          <div>
            <h1 className="text-lg font-medium">AI Coach</h1>
            <p className="text-xs text-emerald-400/80">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
            style={{ animationDelay: `${Math.min(i * 50, 200)}ms` }}
          >
            {/* Coach avatar for assistant messages */}
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-amber-500/15 flex items-center justify-center mr-2 mt-1 shrink-0">
                <Bot className="w-3.5 h-3.5 text-amber-400" />
              </div>
            )}
            <div className="flex flex-col">
              <div
                className={`max-w-[80%] p-3.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-white/15 to-white/10 text-white rounded-2xl rounded-br-md'
                    : 'bg-white/[0.04] border border-white/[0.08] text-white/90 rounded-2xl rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? renderMarkdown(msg.content) : msg.content}
              </div>
              <span className={`text-[10px] text-white/25 mt-1 ${msg.role === 'user' ? 'text-right' : 'ml-1'}`}>
                {formatTime(msg.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex justify-start animate-fade-in-up">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-500/25 to-orange-500/25 border border-amber-500/15 flex items-center justify-center mr-2 mt-1 shrink-0">
              <Bot className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] rounded-bl-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <span className="w-2 h-2 bg-amber-400/50 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick reply chips */}
        {showQuickReplies && messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
            {QUICK_REPLIES.map((qr) => (
              <button
                key={qr.label}
                onClick={() => sendMessage(qr.label)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/[0.06] border border-white/[0.1] text-sm text-white/80 hover:bg-white/[0.1] hover:border-white/[0.15] active:scale-95 transition-all"
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
      <div className="px-6 pb-8 pt-4 border-t border-white/10 bg-black/95 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask your coach..."
            className="flex-1 p-3 rounded-xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/30 focus:bg-white/[0.07] resize-none max-h-32 transition-all"
            rows={1}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            className={`p-3 rounded-xl transition-all ${
              input.trim() && !isLoading
                ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-400'
                : 'bg-white/5 text-white/30'
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
  )
}
