"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="flex items-center rounded-lg border border-[#BCD4EE] bg-white/80 p-0.5 shadow-[0_1px_3px_rgba(31,77,130,0.07)]" aria-label={t("language")}>
      <button
        type="button"
        onClick={() => setLanguage("id")}
        className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition ${language === "id" ? "bg-[#0C68D5] text-white shadow-sm" : "text-[#47688E] hover:bg-[#EAF2FC]"}`}
        aria-pressed={language === "id"}
        aria-label={t("indonesian")}
        title={t("indonesian")}
      >
        <span aria-hidden="true">🇮🇩</span><span className="hidden md:inline">ID</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-semibold transition ${language === "en" ? "bg-[#0C68D5] text-white shadow-sm" : "text-[#47688E] hover:bg-[#EAF2FC]"}`}
        aria-pressed={language === "en"}
        aria-label={t("english")}
        title={t("english")}
      >
        <span aria-hidden="true">🇬🇧</span><span className="hidden md:inline">EN</span>
      </button>
    </div>
  );
}
