'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { ChevronDown, type LucideIcon } from 'lucide-react'

interface SettingsCategoryProps {
  id: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
  title: string
  description: string
  children: ReactNode
  defaultOpen?: boolean
}

const STORAGE_KEY = 'voxu-settings-accordion'

function getStoredState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setStoredState(id: string, open: boolean) {
  try {
    const current = getStoredState()
    current[id] = open
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {}
}

export function SettingsCategory({
  id,
  icon: Icon,
  iconColor = 'text-white',
  iconBg = 'bg-white/10',
  title,
  description,
  children,
  defaultOpen = false,
}: SettingsCategoryProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [mounted, setMounted] = useState(false)

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = getStoredState()
    if (id in stored) {
      setIsOpen(stored[id])
    }
    setMounted(true)
  }, [id])

  const toggle = () => {
    const next = !isOpen
    setIsOpen(next)
    setStoredState(id, next)
  }

  return (
    <div className="card-gradient-border overflow-hidden">
      <button
        onClick={toggle}
        aria-expanded={isOpen}
        className="w-full flex items-center gap-3 p-5 text-left transition-colors hover:bg-white/[0.02] press-scale focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
      >
        <div className={`p-2 rounded-xl ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-medium text-white">{title}</h2>
          <p className="text-white/60 text-xs">{description}</p>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-white/40 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          {mounted && (
            <div className="px-5 pb-5 pt-0 space-y-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
