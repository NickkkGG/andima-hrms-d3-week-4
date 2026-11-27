"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { ChevronDown, ClipboardList, Layers3, ScanFace } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { SidebarBurger, useSidebar } from "@/components/SidebarContext";

const D3_ROUTE_PREFIXES = [
  "/employees",
  "/employee-profile",
  "/attendance",
  "/attendance-productivity",
  "/biometric-enrollment",
  "/face-biometric-attendance",
  "/employee-report-ticket",
  "/feedback-reward",
];

function isRouteOrChild(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

// Sub-menu item from the design system: no icon, a 6px dot marks the open page.
function HrmsLink({ label, href, onNavigate }: { label: ReactNode; href: string; onNavigate: () => void }) {
  const pathname = usePathname();
  const isActive = isRouteOrChild(pathname, href);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={`flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left transition-colors ${
        isActive ? "bg-[#B0C6D4] text-[#45556C] hover:bg-[#A3BCCB]" : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white"
      }`}
    >
      <span className={`size-[6px] shrink-0 rounded-full ${isActive ? "bg-[#14B8A6]" : "bg-transparent"}`} />
      <span className={`text-[12.5px] leading-snug tracking-[-0.01em] ${isActive ? "font-semibold" : "font-medium"}`}>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");
  const isD3Route = D3_ROUTE_PREFIXES.some((route) => isRouteOrChild(pathname, route));
  const { isCollapsed, isMobileOpen, closeMobileSidebar } = useSidebar();
  const isAttendanceActive = isRouteOrChild(pathname, "/face-biometric-attendance");
  const [isHrmsOpen, setIsHrmsOpen] = useState(true);
  const [isD3Open, setIsD3Open] = useState(false);
  const [d3ClosedOnPath, setD3ClosedOnPath] = useState<string | null>(null);
  const [isInternalSigningOut, setIsInternalSigningOut] = useState(false);
  const [appRole, setAppRole] = useState<"EMPLOYEE" | "HR" | "MANAGER" | null>(null);
  const isD3Expanded = isD3Route ? d3ClosedOnPath !== pathname : isD3Open;
  const canViewAttendanceProductivity = appRole === "HR" || appRole === "MANAGER";

  // The sidebar only needs the role to decide which menus are visible. Ticket
  // notifications live in the ticket page's bell, so nothing is polled here.
  useEffect(() => {
    let isMounted = true;

    async function loadAccountRole() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: access } = await supabase
        .from("b2_register")
        .select("app_role")
        .eq("auth_user_id", userData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      const role = access?.app_role as "EMPLOYEE" | "HR" | "MANAGER" | undefined;
      if (isMounted && role) setAppRole(role);
    }

    void loadAccountRole();
    return () => {
      isMounted = false;
    };
  }, []);

  function toggleD3Menu() {
    if (isD3Route) {
      setD3ClosedOnPath(isD3Expanded ? pathname : null);
      return;
    }
    setIsD3Open((value) => !value);
  }

  async function handleSignOut() {
    setIsInternalSigningOut(true);
    try {
      await createClient().auth.signOut({ scope: "local" });
      router.replace("/login");
      router.refresh();
    } finally {
      setIsInternalSigningOut(false);
    }
  }

  if (isPublicRoute) return null;

  // Collapsed on desktop means fully hidden (width 0). The lg: prefix keeps the
  // phone drawer usable even when the desktop sidebar was closed.
  return (
    <aside
      aria-label={t("hrms")}
      className={`fixed inset-y-0 left-0 z-40 flex w-[250px] select-none flex-col justify-between overflow-y-auto bg-[#0F2342] p-4 transition-all duration-[250ms] ease-out lg:translate-x-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } ${isCollapsed ? "lg:pointer-events-none lg:invisible lg:w-0 lg:overflow-hidden lg:p-0 lg:opacity-0" : "lg:opacity-100"}`}
    >
      <div className="w-full min-w-[218px]">
        <div className="flex items-center justify-between gap-3 px-1.5 pb-6 pt-1.5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
                alt="Logo Andima"
                className="size-9 object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[19px] font-extrabold leading-none tracking-tight text-white">ANDIMA</span>
              <span className="mt-1 text-[12px] font-normal leading-tight text-[#8FA3BF]">Logistics Suite</span>
            </div>
          </div>
          <SidebarBurger onClick={closeMobileSidebar} label={t("closeNavigation")} className="lg:hidden" />
        </div>

        <nav className="flex flex-col gap-2.5" aria-label={t("hrms")}>
          <Link
            href="/face-biometric-attendance"
            onClick={closeMobileSidebar}
            aria-current={isAttendanceActive ? "page" : undefined}
            className={`flex w-full items-center gap-2.5 rounded-[8px] px-3.5 py-2.5 text-[13.5px] font-semibold tracking-[-0.01em] text-white shadow-xs transition-colors ${
              isAttendanceActive
                ? "bg-[#047857] ring-2 ring-inset ring-white/30 hover:bg-[#065F46]"
                : "bg-[#059669] hover:bg-[#047857] active:bg-[#065F46]"
            }`}
          >
            <ScanFace size={18} strokeWidth={1.9} className="shrink-0" /> {t("attendance")}
          </Link>
          <div>
            <button
              type="button"
              onClick={() => setIsHrmsOpen((value) => !value)}
              aria-expanded={isHrmsOpen}
              className="flex w-full cursor-pointer items-center justify-between rounded-[8px] bg-[#0550D7] px-3.5 py-2.5 text-white shadow-xs transition-colors hover:bg-[#0447C0] active:bg-[#043FA9]"
            >
              <span className="flex items-center gap-2.5">
                <ClipboardList size={18} strokeWidth={1.9} className="shrink-0" />
                <span className="text-[13.5px] font-semibold tracking-[-0.01em]">{t("hrms")}</span>
              </span>
              <ChevronDown size={15} className={`transition-transform duration-200 ${isHrmsOpen ? "rotate-0" : "-rotate-90"}`} />
            </button>
            {isHrmsOpen && (
              <div className="flex items-stretch pt-1.5">
                <div className="ml-4 mr-3 w-[1.5px] shrink-0 rounded-full bg-[#263B5E]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <button
                    type="button"
                    onClick={toggleD3Menu}
                    aria-expanded={isD3Expanded}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-[13px] font-semibold tracking-[-0.01em] transition-colors ${
                      isD3Route ? "text-white" : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2"><Layers3 size={15} strokeWidth={1.9} /> {t("d3")}</span>
                    <ChevronDown size={14} className={`transition-transform duration-200 ${isD3Expanded ? "rotate-0" : "-rotate-90"}`} />
                  </button>
                  {isD3Expanded && (
                    <div className="flex items-stretch">
                      <div className="ml-3 mr-2 w-[1.5px] shrink-0 rounded-full bg-[#263B5E]" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <HrmsLink label={t("employeeProfileManagement")} href="/employees" onNavigate={closeMobileSidebar} />
                        <HrmsLink label={t("biometricRegistration")} href="/biometric-enrollment" onNavigate={closeMobileSidebar} />
                        <HrmsLink label={t("attendanceHistoryCorrection")} href="/attendance" onNavigate={closeMobileSidebar} />
                        {canViewAttendanceProductivity && (
                          <HrmsLink label={t("attendanceProductivity")} href="/attendance-productivity" onNavigate={closeMobileSidebar} />
                        )}
                        <HrmsLink label={t("feedbackReward")} href="/feedback-reward" onNavigate={closeMobileSidebar} />
                        <HrmsLink label={t("employeeReportTicket")} href="/employee-report-ticket" onNavigate={closeMobileSidebar} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      <div className="w-full min-w-[218px] pt-4">
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isInternalSigningOut}
          aria-label={t("logout")}
          className="flex w-full cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#D92D43] bg-transparent py-2 text-[15px] font-bold tracking-wide text-[#E3697B] transition-colors hover:bg-[#D92D43]/10 active:bg-[#D92D43]/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isInternalSigningOut ? t("signingOut") : t("logout")}
        </button>
      </div>
    </aside>
  );
}
