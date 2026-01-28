'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { DailyGuideHome } from '@/components/daily-guide/DailyGuideHome'
import dynamic from 'next/dynamic'

const DiscoverContent = dynamic(
  () => import('@/app/(dashboard)/discover/page'),
  { ssr: false }
)

const JournalContent = dynamic(
  () => import('@/app/(dashboard)/journal/page'),
  { ssr: false }
)

type DrawerTab = 'guide' | 'discover' | 'journal'

interface ContentDrawerProps {
  isOpen: boolean
  onToggle: (open: boolean) => void
}

export function ContentDrawer({ isOpen, onToggle }: ContentDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>('guide')
  const handleRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number>(0)
  const touchStartTime = useRef<number>(0)

  const TABS: { id: DrawerTab; label: string }[] = [
    { id: 'guide', label: 'Guide' },
    { id: 'discover', label: 'Discover' },
    { id: 'journal', label: 'Journal' },
  ]

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartTime.current = Date.now()
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY
      const diff = touchStartY.current - touchEndY
      const timeDiff = Date.now() - touchStartTime.current

      // Require at least 50px swipe, or a fast flick (30px in <200ms)
      if (diff > 50 || (diff > 30 && timeDiff < 200)) {
        onToggle(true)
      } else if (diff < -50 || (diff < -30 && timeDiff < 200)) {
        onToggle(false)
      }
    },
    [onToggle]
  )

  const handleClick = useCallback(() => {
    onToggle(!isOpen)
  }, [isOpen, onToggle])

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onToggle(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onToggle])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 drawer-backdrop animate-in"
          onClick={() => onToggle(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed left-0 right-0 bottom-0 z-50 bg-[#0a0a0f] rounded-t-3xl border-t border-white/10"
        style={{
          transform: isOpen ? 'translateY(0)' : 'translateY(calc(100% - 48px))',
          transition: 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          height: 'calc(100vh - 80px)',
        }}
      >
        {/* Handle bar area */}
        <div
          ref={handleRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onClick={handleClick}
          className="flex flex-col items-center pt-3 pb-2 cursor-pointer select-none"
        >
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-white/30 mb-3" />

          {/* Peek label when closed */}
          {!isOpen && (
            <p className="text-xs text-white/50 animate-fade-in">
              Swipe up for Guide, Discover & Journal
            </p>
          )}
        </div>

        {/* Tab bar (visible when open) */}
        {isOpen && (
          <div className="px-6 pb-3">
            <div className="flex gap-1 p-1 bg-white/5 rounded-xl">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white/80'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable content area */}
        {isOpen && (
          <div
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
          >
            {activeTab === 'guide' && <DailyGuideHome embedded />}
            {activeTab === 'discover' && <DiscoverContent />}
            {activeTab === 'journal' && <JournalContent />}
          </div>
        )}
      </div>
    </>
  )
}
