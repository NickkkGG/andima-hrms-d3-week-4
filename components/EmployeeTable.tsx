"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import HrmsStatusPill from "@/components/hrms/HrmsStatusPill";
import TablePagination from "@/components/hrms/TablePagination";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { cardClass, searchInputClass, segmentedClass } from "@/components/ui/styles";
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
  const [page, setPage] = useState(1);
  const pageSize = 10;
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
  const totalPages = Math.max(1, Math.ceil(visibleEmployees.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedEmployees = visibleEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="mt-5 space-y-5">
      {summary && <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><div className={`p-4 ${cardClass}`}><p className="text-xs font-semibold text-slate-500">{copy.total}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{summary.total}</p></div><div className={`p-4 ${cardClass}`}><p className="text-xs font-semibold text-slate-500">{copy.active}</p><p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">{summary.active}</p></div><div className={`p-4 ${cardClass}`}><p className="text-xs font-semibold text-slate-500">{copy.probation}</p><p className="mt-1 text-2xl font-bold tracking-tight text-amber-700">{summary.probation}</p></div><div className={`p-4 ${cardClass}`}><p className="text-xs font-semibold text-slate-500">{copy.inactive}</p><p className="mt-1 text-2xl font-bold tracking-tight text-slate-600">{summary.inactive}</p></div></div>}
      <label className="relative block">
        <span className="sr-only">{copy.searchLabel}</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          className={searchInputClass}
          onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
          placeholder={copy.searchPlaceholder}
          type="search"
          value={searchQuery}
        />
      </label>
      <div className={segmentedClass.group} aria-label={copy.filter}>
        {["__all__", ...departments].map((department) => {
          const isSelected = selectedDepartment === department;

          return (
            <button
              className={`${segmentedClass.item} ${isSelected ? segmentedClass.active : segmentedClass.idle}`}
              key={department}
              onClick={() => { setSelectedDepartment(department); setPage(1); }}
              type="button"
            >
              {department === "__all__" ? copy.all : department}
            </button>
          );
        })}
      </div>

      {visibleEmployees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500">
          {copy.noResult}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {paginatedEmployees.map((employee) => (
            <Link
              className={`group relative min-h-[116px] overflow-hidden px-5 py-4 transition hover:border-blue-400 hover:bg-slate-50/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6FF5]/40 ${cardClass}`}
              href={`/employees/${encodeURIComponent(employee.employee_id)}`}
              key={employee.id}
            >
              <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">{initials(employee.full_name)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2"><h2 className="truncate text-sm font-bold leading-5 text-slate-900 transition group-hover:text-blue-700">{employee.full_name}</h2><HrmsStatusPill value={employee.employment_status} /></div>
                  <p className="mt-0.5 truncate text-[11px] font-medium leading-4 text-slate-500">{[employee.position_title, employee.department_name].filter(Boolean).join(" · ") || copy.positionMissing}</p>
                  <div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs font-bold tracking-[0.08em] text-slate-700">{employee.employee_id}</p><span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">{copy.viewProfile}<ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></span></div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <TablePagination page={currentPage} pageSize={pageSize} totalItems={visibleEmployees.length} onPageChange={setPage} />
    </div>
  );
}
