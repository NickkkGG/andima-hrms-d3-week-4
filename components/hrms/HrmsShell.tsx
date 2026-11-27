"use client";

import type { D3AppRole } from "@/utils/employee-access";
import AppHeader from "@/components/AppHeader";
import { pageTitleKey, useLanguage } from "@/components/i18n/LanguageProvider";
import { pageBgClass } from "@/components/ui/styles";

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
    <div className={`min-h-screen ${pageBgClass} font-sans text-slate-800`}>
      <AppHeader pageTitle={localizedPageTitle} />
      <main className={contentClassName ?? "px-4 py-6 sm:px-6 lg:px-8 lg:py-8"}>{children}</main>
    </div>
  );
}
