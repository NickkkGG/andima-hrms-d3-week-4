"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useLanguage, type TranslationKey } from "@/components/i18n/LanguageProvider";

// Text that server-rendered pages hand to the browser in both languages. The
// browser picks one from the language context, so the toggle switches it at
// once instead of waiting for router.refresh() to bring back a new server
// render (the delay and mixed-language screens in the Employees and
// Feedback & Reward pages).

export function LocalizedText({ id, en }: { id: string; en: string }) {
  const { language } = useLanguage();
  return language === "id" ? id : en;
}

export function TranslatedText({ textKey }: { textKey: TranslationKey }) {
  const { t } = useLanguage();
  return t(textKey);
}

// <option> only accepts plain text children, so the label is chosen here.
export function LocalizedOption({ id, en, ...props }: { id: string; en: string } & Omit<ComponentPropsWithoutRef<"option">, "children">) {
  const { language } = useLanguage();
  return <option {...props}>{language === "id" ? id : en}</option>;
}

// Inputs rendered by a server page whose placeholder has to follow the toggle.
export function LocalizedInput({ placeholderId, placeholderEn, ...props }: { placeholderId: string; placeholderEn: string } & Omit<ComponentPropsWithoutRef<"input">, "placeholder">) {
  const { language } = useLanguage();
  return <input {...props} placeholder={language === "id" ? placeholderId : placeholderEn} />;
}
