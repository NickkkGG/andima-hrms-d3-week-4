"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import HrmsStatusPill from "@/components/hrms/HrmsStatusPill";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { EmployeeListItem } from "@/types/employee";

interface EmployeeTableProps {
  employees: EmployeeListItem[];
  summary?: { total: number; active: number; probation: number; inactive: number };
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("") || "EP";
}

export default function EmployeeTable({ employees, summary }: EmployeeTableProps) {
  const { language } = useLanguage();
  const copy = language === "id" ? { all: "Semua pegawai", total: "Total pegawai", active: "Aktif", probation: "Masa percobaan", inactive: "Tidak aktif", searchLabel: "Cari pegawai", searchPlaceholder: "Cari nama, ID pegawai, departemen, atau posisi", filter: "Filter departemen", noResult: "Tidak ada pegawai yang sesuai dengan pencarian atau departemen ini.", positionMissing: "Posisi belum tersedia", viewProfile: "Lihat profil" } : { all: "All employees", total: "Total employees", active: "Active", probation: "Probation", inactive: "Inactive", searchLabel: "Search employees", searchPlaceholder: "Search by name, employee ID, department, or position", filter: "Department filter", noResult: "No employees match this search or department.", positionMissing: "Position not available", viewProfile: "View profile" };
  const departments = useMemo(
    () => Array.from(new Set(employees.map((employee) => employee.department_name).filter((department): department is string => Boolean(department)))).sort(),
    [employees]
  );
  const [selectedDepartment, setSelectedDepartment] = useState("__all__");
  const [searchQuery, setSearchQuery] = useState("");
  const visibleEmployees = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      const isInDepartment = selectedDepartment === "__all__" || employee.department_name === selectedDepartment;
      if (!isInDepartment) return false;
      if (!normalizedQuery) return true;

      return [employee.full_name, employee.employee_id, employee.department_name, employee.position_title]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [employees, searchQuery, selectedDepartment]);

  return (
    <div className="mt-5 space-y-5">
      {summary && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-2xl border border-[#BCD4EE] bg-white p-4 shadow-[0_6px_18px_rgba(31,77,130,0.06)]"><p className="text-xs font-semibold text-[#4D5F81]">{copy.total}</p><p className="mt-1 text-2xl font-bold text-[#0B2548]">{summary.total}</p></div><div className="rounded-2xl border border-[#BCD4EE] bg-white p-4 shadow-[0_6px_18px_rgba(31,77,130,0.06)]"><p className="text-xs font-semibold text-[#4D5F81]">{copy.active}</p><p className="mt-1 text-2xl font-bold text-[#187244]">{summary.active}</p></div><div className="rounded-2xl border border-[#BCD4EE] bg-white p-4 shadow-[0_6px_18px_rgba(31,77,130,0.06)]"><p className="text-xs font-semibold text-[#4D5F81]">{copy.probation}</p><p className="mt-1 text-2xl font-bold text-amber-700">{summary.probation}</p></div><div className="rounded-2xl border border-[#BCD4EE] bg-white p-4 shadow-[0_6px_18px_rgba(31,77,130,0.06)]"><p className="text-xs font-semibold text-[#4D5F81]">{copy.inactive}</p><p className="mt-1 text-2xl font-bold text-slate-600">{summary.inactive}</p></div></div>}
      <label className="relative block">
        <span className="sr-only">{copy.searchLabel}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className="h-11 w-full rounded-xl border border-[#BCD4EE] bg-white py-2 pl-10 pr-3 text-sm text-[#172033] outline-none transition placeholder:text-slate-400 focus:border-[#0C68D5] focus:ring-4 focus:ring-[#0C68D5]/10"
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder={copy.searchPlaceholder}
          type="search"
          value={searchQuery}
        />
      </label>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label={copy.filter}>
        {["__all__", ...departments].map((department) => {
          const isSelected = selectedDepartment === department;

          return (
            <button
              className={`h-9 shrink-0 rounded-full border px-4 text-xs font-semibold transition ${
                isSelected
                  ? "border-[#0C68D5] bg-[#0C68D5] text-white shadow-[0_5px_12px_rgba(12,104,213,0.25)]"
                  : "border-[#BCD4EE] bg-white text-[#0B2548] hover:border-[#0C68D5] hover:bg-[#EAF2FC] hover:text-[#0C68D5]"
              }`}
              key={department}
              onClick={() => setSelectedDepartment(department)}
              type="button"
            >
              {department === "__all__" ? copy.all : department}
            </button>
          );
        })}
      </div>

      {visibleEmployees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#BCD4EE] bg-white px-5 py-10 text-center text-sm text-[#4D5F81]">
          {copy.noResult}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visibleEmployees.map((employee) => (
            <Link
              className="group relative min-h-[116px] overflow-hidden rounded-2xl border border-[#BCD4EE] bg-white px-5 py-4 shadow-[0_8px_22px_rgba(31,77,130,0.07)] transition hover:-translate-y-0.5 hover:border-[#0C68D5] hover:shadow-[0_12px_28px_rgba(31,77,130,0.13)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0C68D5]"
              href={`/employees/${encodeURIComponent(employee.employee_id)}`}
              key={employee.id}
            >
              <span className="absolute inset-x-0 top-0 h-1 bg-[#0B2548]" />
              <div className="flex items-start gap-3 pt-1">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#EAF2FC] text-sm font-bold text-[#0C68D5]">{initials(employee.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h2 className="truncate text-[17px] font-bold leading-5 text-[#172033] transition group-hover:text-[#0C68D5]">{employee.full_name}</h2><HrmsStatusPill value={employee.employment_status} /></div>
                  <p className="mt-0.5 truncate text-[11px] font-semibold leading-4 text-[#4D5F81]">{[employee.position_title, employee.department_name].filter(Boolean).join(" · ") || copy.positionMissing}</p>
                  <div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs font-bold tracking-[0.08em] text-[#0B2548]">{employee.employee_id}</p><span className="text-xs font-bold text-[#0C68D5]">{copy.viewProfile} →</span></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
