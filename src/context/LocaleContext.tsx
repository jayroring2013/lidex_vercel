'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Locale, translations, TranslationKey } from '@/lib/i18n'

interface LocaleContextValue {
  locale:    Locale
  setLocale: (l: Locale) => void
  t:         (key: TranslationKey) => string
}

const LocaleContext = createContext<LocaleContextValue>({
  locale:    'vi',
  setLocale: () => {},
  t:         (key) => translations.vi[key],
})

const STORAGE_KEY = 'lidex_locale'

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Default to Vietnamese
  const [locale, setLocaleState] = useState<Locale>('vi')

  // Rehydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved === 'vi' || saved === 'en') setLocaleState(saved)
  }, [])

  function setLocale(l: Locale) {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  function t(key: TranslationKey): string {
    return translations[locale][key] ?? translations.vi[key] ?? key
  }

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  return useContext(LocaleContext)
}
