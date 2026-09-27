"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import { usePathname } from "next/navigation";

type SidebarItemProps = {
  icon: React.ReactNode;
  label: string;
  href?: string;
  suffix?: React.ReactNode;
};

type SidebarSubItemProps = {
  label: string;
  href: string;
};

function SidebarItem({
  icon,
  label,
  href = "#",
  suffix,
}: SidebarItemProps) {
    
  return (
    <Link
      href={href}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-[#d9e2fc] transition-colors hover:bg-[#1e3765] hover:text-white"
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>

      {suffix}
    </Link>
  );
}

function SidebarSubItem({
  label,
  href,
}: SidebarSubItemProps) {
    const pathname = usePathname();
    const isActive = pathname === href;
   return (
    <Link
      href={href}
      className={`flex w-full items-center rounded-md px-3 py-2 text-xs transition-colors ${
        isActive
          ? "bg-[#1e3765] text-white"
          : "text-[#d9e2fc]/80 hover:bg-[#1e3765] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Sidebar() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isHrmsOpen, setIsHrmsOpen] = useState(true);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#0f2342] px-4 py-5 text-[#d9e2fc] shadow-lg transition-transform lg:translate-x-0 ${
          isSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-2">
          <div className="grid size-9 place-items-center rounded-lg bg-[#069494] shadow-sm">
            <BriefcaseBusiness
              size={19}
              className="text-white"
            />
          </div>

          <div>
            <p className="text-xl font-bold tracking-[-0.5px] text-white">
              ANDIMA
            </p>

            <p className="text-xs text-[#d9e2fc]/80">
              Logistics Suite
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            className="ml-auto rounded p-1 text-[#d9e2fc] lg:hidden"
            aria-label="Tutup navigasi"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-8 space-y-1.5 text-sm font-semibold">
          <SidebarItem
            icon={<LayoutDashboard size={16} />}
            label="Dashboard"
            href="/dashboard"
          />

          <SidebarItem
            icon={<BriefcaseBusiness size={16} />}
            label="POS"
            href="/pos"
          />

          <SidebarItem
            icon={<UsersRound size={16} />}
            label="CRM"
            href="/crm"
            suffix={<ChevronRight size={15} />}
          />

          {/* HRMS */}
          <div>
            <button
              type="button"
              onClick={() =>
                setIsHrmsOpen((value) => !value)
              }
              className="flex w-full items-center justify-between rounded-lg bg-[#069494] px-3 py-2.5 text-white shadow-sm"
            >
              <span className="flex items-center gap-3">
                <ClipboardList size={17} />
                HRMS
              </span>

              <ChevronDown
                size={16}
                className={`transition-transform ${
                  isHrmsOpen
                    ? "rotate-0"
                    : "-rotate-90"
                }`}
              />
            </button>

            {isHrmsOpen && (
              <div className="ml-5 mt-2 border-l border-[#d9e2fc]/20 pl-3">
                <SidebarSubItem
                  label="Employee Profile"
                  href="/employee-profile"
                />

                <SidebarSubItem
                  label="Attendance"
                  href="/attendance"
                />

                <SidebarSubItem
                  label="Attendance & Productivity"
                  href="/attendance-productivity"
                />

                <SidebarSubItem
                  label="Feedback & Reward"
                  href="/feedback-reward"
                />

                <SidebarSubItem
                  label="Employee Report & Ticket"
                  href="/employee-report-ticket"
                />
              </div>
            )}
          </div>

          <SidebarItem
            icon={<ShieldCheck size={16} />}
            label="MID"
            href="/mid"
            suffix={<ChevronRight size={15} />}
          />
        </nav>

        {/* Bottom Section */}
        <div className="mt-auto space-y-3">
          {/* Customer Support */}
          <div className="rounded-lg border border-[#d9e2fc]/15 bg-[#1e3765] p-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-white">
              <CircleHelp
                size={14}
                className="text-[#77d8cd]"
              />

              Customer Support
            </div>

            <p className="mt-1 text-[10px] text-[#d9e2fc]/80">
              24/7 Operations Line
            </p>
          </div>

          {/* Settings */}
          <SidebarItem
            icon={<Settings size={15} />}
            label="Settings"
            href="/settings"
          />

          {/* User */}
          <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
            <span className="grid size-7 place-items-center rounded-full bg-[#16834b] text-[10px] font-bold text-white">
              NN
            </span>

            <div>
              <p className="text-xs font-bold text-white">
                Nick Nelson
              </p>

              <p className="text-[10px] text-[#d9e2fc]/75">
                Web Developer
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile menu button */}
      <button
        type="button"
        onClick={() => setIsSidebarOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-[#0f2342] p-2 text-white lg:hidden"
        aria-label="Buka navigasi"
      >
        <LayoutDashboard size={20} />
      </button>

      {/* Main Content */}
      {/* <main className="min-h-screen lg:ml-[260px]">
        {children}
      </main> */}
    </>
  );
}