'use client'

import { useState, useCallback } from 'react'
import { locales, localeNames, type Locale } from '@/i18n'
import { ChevronDown } from 'lucide-react'

interface LanguageSelectorProps {
  currentLocale?: Locale
  onLocaleChange?: (locale: Locale) => void
}

export function LanguageSelector({ currentLocale = 'en', onLocaleChange }: LanguageSelectorProps) {
  const [selected, setSelected] = useState<Locale>(currentLocale)
  const [isOpen, setIsOpen] = useState(false)

  const handleSelect = useCallback((locale: Locale) => {
    setSelected(locale)
    setIsOpen(false)
    onLocaleChange?.(locale)
    // Persist preference
    try {
      localStorage.setItem('voxu_locale', locale)
    } catch {}
  }, [onLocaleChange])

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Select language"
      >
        <span>{localeNames[selected]}</span>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-[#1c1c20] border border-white/10 rounded-xl overflow-hidden z-50 animate-fade-in"
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
        </ul>
      )}
    </div>
  )
}
