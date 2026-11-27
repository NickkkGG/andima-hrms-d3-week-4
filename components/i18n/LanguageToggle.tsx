"use client";

import { useLanguage, type SupportedLanguage, type TranslationKey } from "@/components/i18n/LanguageProvider";

// Text labels instead of flag emoji: Windows does not render regional-indicator
// flags (it shows the letters "ID" / "GB" in boxes), so plain text looks the
// same on Windows, macOS, and mobile. EN comes first and is the default
// (QA BUG-D3-026).
const options: { value: SupportedLanguage; label: string; nameKey: TranslationKey }[] = [
  { value: "en", label: "EN", nameKey: "english" },
  { value: "id", label: "ID", nameKey: "indonesian" },
];

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex shrink-0 items-center rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-semibold"
    >
      {options.map((option) => {
        const isActive = language === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            aria-pressed={isActive}
            title={t(option.nameKey)}
            className={`cursor-pointer rounded-md px-2 py-0.5 text-[11px] transition-colors ${
              isActive ? "bg-white font-bold text-blue-700 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span aria-hidden="true">{option.label}</span>
            <span className="sr-only">{t(option.nameKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
