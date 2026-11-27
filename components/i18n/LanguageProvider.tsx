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
// v2: the old key was saved on every visit (so it held "id" for everyone who
// used the app before EN became the default). Real choices live in the cookie,
// which is only written when the user presses the toggle.
const storageKey = "andima-hrms-language-v2";
const cookieMaxAge = 60 * 60 * 24 * 365;

// localStorage can throw (blocked site data, strict privacy modes on some
// Windows/Edge and Safari setups). The cookie is the source of truth for the
// server render, so storage failures are ignored instead of breaking the toggle.
function readStoredLanguage() {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? normalizeLanguage(saved) : null;
  } catch {
    return null;
  }
}

function storeLanguage(language: SupportedLanguage) {
  try {
    window.localStorage.setItem(storageKey, language);
  } catch {
    // Ignore: the language cookie still carries the choice.
  }
}

function writeLanguageCookie(language: SupportedLanguage) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${languageCookieName}=${language}; path=/; max-age=${cookieMaxAge}; samesite=lax${secure}`;
}

export function LanguageProvider({ children, initialLanguage = "en" }: { children: React.ReactNode; initialLanguage?: SupportedLanguage }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<SupportedLanguage>(initialLanguage);

  useEffect(() => {
    const savedLanguage = readStoredLanguage();
    if (savedLanguage && savedLanguage !== initialLanguage) {
      writeLanguageCookie(savedLanguage);
      const refreshLanguage = window.setTimeout(() => {
        setLanguageState(savedLanguage);
        router.refresh();
      }, 0);
      return () => window.clearTimeout(refreshLanguage);
    }
  }, [initialLanguage, router]);

  useEffect(() => {
    document.documentElement.lang = language;
    storeLanguage(language);
  }, [language]);

  const setLanguage = useCallback((nextLanguage: SupportedLanguage) => {
    if (nextLanguage === language) return;
    writeLanguageCookie(nextLanguage);
    storeLanguage(nextLanguage);
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
