"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import {
  ChevronDown,
  ClipboardList,
  Layers3,
  Menu,
  ScanFace,
  X,
} from "lucide-react";

function HrmsLink({ label, href }: { label: string; href: string }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href === "/employees" && pathname.startsWith("/employees"));

  return (
    <Link
      href={href}
      className={`flex w-full items-center rounded-md px-3 py-2 text-xs transition-colors ${
        isActive ? "bg-[#1e3765] text-white" : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const isPublicRoute = pathname === "/login" || pathname === "/register" || pathname.startsWith("/auth/");
  const isD3Route = pathname.startsWith("/employees") || [
    "/employee-profile",
    "/attendance",
    "/attendance-productivity",
    "/biometric-enrollment",
    "/employee-report-ticket",
    "/feedback-reward",
  ].includes(pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHrmsOpen, setIsHrmsOpen] = useState(true);
  const [isD3Open, setIsD3Open] = useState(false);
  const [d3ClosedOnPath, setD3ClosedOnPath] = useState<string | null>(null);
  const [isInternalSigningOut, setIsInternalSigningOut] = useState(false);
  const [appRole, setAppRole] = useState<"EMPLOYEE" | "HR" | "MANAGER" | null>(null);
  const isD3Expanded = isD3Route ? d3ClosedOnPath !== pathname : isD3Open;
  const canViewAttendanceProductivity = appRole === "HR" || appRole === "MANAGER";

  useEffect(() => {
    let isMounted = true;

    async function loadRole() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: access } = await supabase
        .from("d3_user_access")
        .select("app_role")
        .eq("auth_user_id", userData.user.id)
        .maybeSingle();

      if (isMounted && access?.app_role) {
        setAppRole(access.app_role as "EMPLOYEE" | "HR" | "MANAGER");
      }
    }

    void loadRole();
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

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0f2342] px-4 py-5 text-[#d9e2fc] shadow-lg transition-transform lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center overflow-hidden rounded-lg bg-transparent p-0 shadow-none">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Logo-ANDIMA-wzx4gpZx20EFE5IYcH3jqabixELIo3.png"
              alt="Logo Andima"
              className="h-full w-full object-contain"
            />
          </div>
          <div><p className="text-xl font-bold tracking-[-0.5px] text-white">ANDIMA</p><p className="text-xs text-[#d9e2fc]/80">Logistics Suite</p></div>
          <button type="button" onClick={() => setIsSidebarOpen(false)} className="ml-auto rounded p-1 text-[#d9e2fc] lg:hidden" aria-label="Tutup navigasi"><X size={18} /></button>
        </div>

        <nav className="mt-8 space-y-1.5 text-sm font-semibold">
          <Link href="/face-biometric-attendance" className="flex w-full items-center gap-3 rounded-lg border border-[#49d6bf]/25 bg-[#16834b] px-3 py-2.5 text-white shadow-sm transition hover:bg-[#006838]">
            <ScanFace size={17} /> Attendance
          </Link>
          <div>
            <button
              type="button"
              onClick={() => setIsHrmsOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg bg-[#155cfd] px-3 py-2.5 text-white shadow-sm"
            >
              <span className="flex items-center gap-3"><ClipboardList size={17} /> HRMS</span>
              <ChevronDown size={16} className={`transition-transform ${isHrmsOpen ? "rotate-0" : "-rotate-90"}`} />
            </button>
            {isHrmsOpen && (
              <div className="ml-5 mt-2 border-l border-[#d9e2fc]/20 pl-3">
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={toggleD3Menu}
                    className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-xs transition-colors ${
                      isD3Route ? "bg-[#155cfd] text-white" : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white"
                    }`}
                    aria-expanded={isD3Expanded}
                  >
                    <span className="flex items-center gap-2"><Layers3 size={14} /> D3</span>
                    <ChevronDown size={14} className={`transition-transform ${isD3Expanded ? "rotate-0" : "-rotate-90"}`} />
                  </button>
                  {isD3Expanded && (
                    <div className="ml-4 mt-1 border-l border-[#d9e2fc]/15 pl-2">
                      <HrmsLink label="Employee Profile Management" href="/employees" />
                      <HrmsLink label="Biometric Registration" href="/biometric-enrollment" />
                      <HrmsLink label="Attendance History & Correction" href="/attendance" />
                      {canViewAttendanceProductivity && (
                        <HrmsLink label="Attendance & Productivity Dashboard" href="/attendance-productivity" />
                      )}
                      <HrmsLink label="Feedback & Reward" href="/feedback-reward" />
                      <HrmsLink label="Employee Report & Ticket" href="/employee-report-ticket" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </nav>

        <div className="mt-auto space-y-3">
          <button type="button" onClick={() => void handleSignOut()} disabled={isInternalSigningOut} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-red-600 px-3 py-1.5 text-sm font-bold text-red-500 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50" aria-label="Logout">
            {isInternalSigningOut ? "Keluar..." : "Logout"}
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-[#0f2342] p-2 text-white lg:hidden"
        aria-label="Buka navigasi"
      >
        <Menu size={20} />
      </button>
    </>
  );
}
