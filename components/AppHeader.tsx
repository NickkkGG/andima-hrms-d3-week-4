"use client";

import type { ReactNode } from "react";
import HeaderAccount from "@/components/HeaderAccount";
import LanguageToggle from "@/components/i18n/LanguageToggle";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SidebarBurger, useSidebar } from "@/components/SidebarContext";
import TicketNotificationBell from "@/components/TicketNotificationBell";

// The one header used by every D3 page (class design system, as in the CCR app):
// sidebar burger, app name + breadcrumb, EN/ID switch, ticket bell, account.
// The ticket page passes its own bell, fed by the tickets it already loaded.
export default function AppHeader({ pageTitle, notificationSlot }: { pageTitle: ReactNode; notificationSlot?: ReactNode }) {
  const { t } = useLanguage();
  const { toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-20 flex h-[58px] shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white">
      <div className="flex h-full min-w-0 items-center">
        <div className="flex h-full shrink-0 items-center justify-center border-r border-[#F1F5F9] px-3 sm:px-3.5">
          <SidebarBurger onClick={toggleSidebar} label={t("toggleNavigation")} />
        </div>
        <div className="flex min-w-0 items-center gap-2 truncate pl-3 pr-2 sm:gap-3.5 sm:pl-4 sm:pr-3">
          <span className="hidden whitespace-nowrap text-[14px] font-bold tracking-[-0.01em] text-[#121B2E] sm:inline">Andima HRMS</span>
          <span className="truncate text-[13px] font-bold tracking-[-0.01em] text-[#121B2E] sm:hidden">{pageTitle}</span>
          <span className="hidden truncate text-[11.5px] font-medium tracking-[-0.005em] text-[#3F4940] md:inline">
            HRMS / D3 / <strong className="font-bold text-[#1D4ED8]">{pageTitle}</strong>
          </span>
        </div>
      </div>
      <div className="flex h-full shrink-0 items-center">
        <div className="flex h-full items-center justify-center border-l border-[#E2E8F0] px-2 sm:px-3">
          <LanguageToggle />
        </div>
        <div className="relative flex h-full items-center justify-center border-l border-[#E2E8F0] px-2 sm:px-4">
          {notificationSlot ?? <TicketNotificationBell />}
        </div>
        <div className="flex h-full items-center gap-2.5 border-l border-[#E2E8F0] px-2.5 sm:px-4">
          <HeaderAccount />
        </div>
      </div>
    </header>
  );
}

