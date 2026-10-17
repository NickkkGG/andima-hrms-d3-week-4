"use client";

import type { D3AppRole } from "@/utils/employee-access";
import { ChevronRight } from "lucide-react";
import HeaderAccount from "@/components/HeaderAccount";
import { pageTitleKey, useLanguage } from "@/components/i18n/LanguageProvider";

interface HrmsShellProps {
  children: React.ReactNode;
  userEmail?: string;
  userRole?: D3AppRole | null;
  pageTitle?: string;
  contentClassName?: string;
}

export default function HrmsShell({ children, userEmail, userRole, pageTitle = "Employee Profile Management", contentClassName }: HrmsShellProps) {
  const { t } = useLanguage();
  const localizedPageTitle = pageTitleKey(pageTitle) ? t(pageTitleKey(pageTitle)!) : pageTitle;
  // AppShell already owns the shared sidebar and header region for every D3 route.
  // Keep this wrapper so the imported D3-001 pages retain their original content.
  void userEmail;
  void userRole;

  return (
    <div className="min-h-screen bg-[#EAF2FC] font-sans text-[#121B2E]">
      <header className="sticky top-0 z-20 flex h-16 items-center border-b border-[#bcd4ee]/80 bg-white/72 px-4 shadow-[0_4px_16px_rgba(31,77,130,0.08)] backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3">
          <div className="hidden min-w-0 items-center gap-3 sm:flex">
            <span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548]">ANDIMA HRMS</span>
            <span className="h-5 border-l border-[#BCD4EE]" />
            <span className="text-xs font-semibold text-[#3F4940]">HRMS</span>
            <ChevronRight size={13} className="shrink-0 text-[#52749B]/60" />
            <span className="truncate text-xs font-semibold text-[#0C68D5]">{localizedPageTitle}</span>
          </div>
          <span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548] sm:hidden">{localizedPageTitle}</span>
          <HeaderAccount />
        </div>
      </header>
      <main className={contentClassName ?? "px-5 py-7 lg:px-8 lg:py-8"}>{children}</main>
    </div>
  );
}
