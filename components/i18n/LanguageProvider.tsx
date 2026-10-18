"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { languageCookieName, messages, normalizeLanguage, type SupportedLanguage, type TranslationKey } from "@/lib/i18n";

export type { SupportedLanguage, TranslationKey } from "@/lib/i18n";
export { pageTitleKey } from "@/lib/i18n";

type LanguageContextValue = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = "andima-hrms-language";
const cookieMaxAge = 60 * 60 * 24 * 365;

export function LanguageProvider({ children, initialLanguage = "id" }: { children: React.ReactNode; initialLanguage?: SupportedLanguage }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage);

  useEffect(() => {
    const savedLanguage = normalizeLanguage(window.localStorage.getItem(storageKey));
    if (savedLanguage !== initialLanguage) {
      document.cookie = `${languageCookieName}=${savedLanguage}; path=/; max-age=${cookieMaxAge}; samesite=lax`;
      const refreshLanguage = window.setTimeout(() => {
        setLanguageState(savedLanguage);
        router.refresh();
      }, 0);
      return () => window.clearTimeout(refreshLanguage);
    }
  }, [initialLanguage, router]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem(storageKey, language);
  }, [language]);

  const setLanguage = useCallback((nextLanguage: SupportedLanguage) => {
    if (nextLanguage === language) return;
    document.cookie = `${languageCookieName}=${nextLanguage}; path=/; max-age=${cookieMaxAge}; samesite=lax`;
    window.localStorage.setItem(storageKey, nextLanguage);
    setLanguageState(nextLanguage);
    router.refresh();
  }, [language, router]);

  const value = useMemo<LanguageContextValue>(() => ({ language, setLanguage, t: (key) => messages[language][key] }), [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
