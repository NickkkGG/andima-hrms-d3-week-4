"use client";

import { useLanguage, type SupportedLanguage, type TranslationKey } from "@/components/i18n/LanguageProvider";

// Text labels instead of flag emoji: Windows does not render regional-indicator
// flags (it shows the letters "ID" / "GB" in boxes), so plain text looks the
// same on Windows, macOS, and mobile.
const options: { value: SupportedLanguage; label: string; nameKey: TranslationKey }[] = [
  { value: "id", label: "ID", nameKey: "indonesian" },
  { value: "en", label: "EN", nameKey: "english" },
];

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex shrink-0 items-center rounded-lg border border-[#BCD4EE] bg-white/80 p-0.5 shadow-[0_1px_3px_rgba(31,77,130,0.07)]"
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
            className={`inline-flex h-7 min-w-9 items-center justify-center rounded-md px-2 text-[11px] font-bold leading-none tracking-[0.04em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C68D5]/40 ${
              isActive ? "bg-[#0C68D5] text-white shadow-sm" : "text-[#47688E] hover:bg-[#EAF2FC]"
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
