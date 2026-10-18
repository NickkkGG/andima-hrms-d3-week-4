"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

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
    <>
      <Sidebar />
      <div className="min-h-full lg:pl-[260px]">{children}</div>
    </>
  );
}
