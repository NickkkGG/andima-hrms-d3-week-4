"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import SessionIdleGuard from "@/components/SessionIdleGuard";
import { SidebarProvider, useSidebar } from "@/components/SidebarContext";
import { TicketNotificationProvider } from "@/components/TicketNotificationBell";
import { pageBgClass } from "@/components/ui/styles";

function ShellLayout({ children }: { children: ReactNode }) {
  const { isCollapsed, isMobileOpen, closeMobileSidebar } = useSidebar();

  return (
    <>
      <div
        onClick={closeMobileSidebar}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] transition-opacity lg:hidden ${
          isMobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <Sidebar />
      <div
        className={`min-h-full ${pageBgClass} transition-[padding] duration-[250ms] ease-out ${
          isCollapsed ? "lg:pl-0" : "lg:pl-[250px]"
        }`}
      >
        {children}
      </div>
    </>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");
  const isAppRoute = [
    "/employees",
    "/employee-profile",
    "/biometric-enrollment",
    "/face-biometric-attendance",
    "/attendance",
    "/attendance-productivity",
    "/employee-report-ticket",
    "/feedback-reward",
    "/home",
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isPublicRoute || !isAppRoute) return <>{children}</>;

  return (
    <SidebarProvider>
      <TicketNotificationProvider>
        <SessionIdleGuard />
        <ShellLayout>{children}</ShellLayout>
      </TicketNotificationProvider>
    </SidebarProvider>
  );
}
