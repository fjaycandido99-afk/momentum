import { getRequestConfig } from 'next-intl/server'

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

export default getRequestConfig(async () => {
  // For now, always use English. When locale routing is added,
  // this will read from the request (cookie/header/path).
  const locale = defaultLocale

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
