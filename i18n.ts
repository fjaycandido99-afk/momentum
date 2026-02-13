export const locales = ['en', 'es', 'fr', 'pt', 'de', 'ja'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Espanol',
  fr: 'Francais',
  pt: 'Portugues',
  de: 'Deutsch',
  ja: 'Japanese',
}
