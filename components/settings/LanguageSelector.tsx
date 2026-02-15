'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { locales, localeNames, type Locale } from '@/i18n'
import { ChevronDown } from 'lucide-react'

interface LanguageSelectorProps {
  currentLocale?: Locale
  onLocaleChange?: (locale: Locale) => void
}

export function LanguageSelector({ currentLocale = 'en', onLocaleChange }: LanguageSelectorProps) {
  const [selected, setSelected] = useState<Locale>(currentLocale)
  const [isOpen, setIsOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})

  const handleSelect = useCallback((locale: Locale) => {
    setSelected(locale)
    setIsOpen(false)
    onLocaleChange?.(locale)
    try {
      localStorage.setItem('voxu_locale', locale)
    } catch {}
  }, [onLocaleChange])

  // Position the portal dropdown relative to the button
  useEffect(() => {
    if (!isOpen || !buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    })
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (buttonRef.current?.contains(e.target as Node)) return
      setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <span>{localeNames[selected]}</span>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <ul
          role="listbox"
          style={dropdownStyle}
          className="bg-[#1c1c20] border border-white/10 rounded-xl overflow-hidden animate-fade-in shadow-xl shadow-black/50"
        >
          {locales.map((locale) => (
            <li key={locale}>
              <button
                role="option"
                aria-selected={locale === selected}
                onClick={() => handleSelect(locale)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                  locale === selected
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {localeNames[locale]}
              </button>
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}
