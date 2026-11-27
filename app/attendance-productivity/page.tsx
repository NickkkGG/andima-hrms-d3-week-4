"use client";

import { useEffect, useMemo, useState } from "react";
import {
  UsersRound,
  UserCheck,
  UserX,
  CalendarDays,
  TrendingUp,
  Search,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { SkeletonBlock, SkeletonTable } from "@/components/hrms/Skeleton";
import AppHeader from "@/components/AppHeader";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import LocationMapPreview from "@/components/attendance/LocationMapPreview";
import TablePagination from "@/components/hrms/TablePagination";
import { badgeClass, cardClass, inputClass, labelClass, pageTitleClass, searchInputClass, tableClass, type BadgeTone, pageBgClass } from "@/components/ui/styles";

// Small caption above a card title or stat value.
const cardEyebrowClass = "text-xs font-semibold text-slate-500";
// Selected table row: light blue fill with a blue bar on the left.

type AttendanceStatus = "PRESENT" | "UNDER_MINIMUM" | "ABSENT" | "LEAVE" | string;
type AppRole = "EMPLOYEE" | "HR" | "MANAGER";

type AttendanceRecord = {
  id: string;
  employee_id: string;
  full_name: string;
  department: string;
  date: string;
  status: AttendanceStatus;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_accuracy_meters: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_accuracy_meters: number | null;
  work_hours: number | null;
};

type AttendanceEmployee = {
  employee_id: string;
  full_name: string;
  departement_id: string | null;
  d3_departments: { name: string } | null;
};

type AttendanceQueryRow = {
  id: string;
  b2_register_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  clock_in_latitude: number | null;
  clock_in_longitude: number | null;
  clock_in_accuracy_meters: number | null;
  clock_out_latitude: number | null;
  clock_out_longitude: number | null;
  clock_out_accuracy_meters: number | null;
  status: AttendanceStatus | null;
  b2_register: AttendanceEmployee | null;
};

function statusConfig(status: AttendanceStatus, language: "id" | "en") {
  const labels = language === "id"
    ? { PRESENT: "Hadir", UNDER_MINIMUM: "Di bawah 7 jam", ABSENT: "Tidak hadir", LEAVE: "Izin / cuti" }
    : { PRESENT: "Present", UNDER_MINIMUM: "Under 7 hours", ABSENT: "Absent", LEAVE: "Leave" };
  const tones: Record<string, BadgeTone> = { PRESENT: "green", UNDER_MINIMUM: "amber", ABSENT: "red", LEAVE: "blue" };
  return { label: labels[status as keyof typeof labels] ?? status, className: badgeClass(tones[status] ?? "slate") };
}

function toDateInputValue(date: Date) {
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60_000));
  return localDate.toISOString().slice(0, 10);
}

function recentAttendanceRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - 30);
  return {
    start: toDateInputValue(start),
    end: toDateInputValue(now),
  };
}

export default function AttendanceProductivityPage() {
  const { t, language } = useLanguage();
  const locale = language === "id" ? "id-ID" : "en-GB";
  const copy = language === "id" ? {
    clockInLabel: "Jam masuk", clockOutLabel: "Jam pulang", restricted: "Fitur ini hanya dapat diakses oleh HR atau Manajer.", accessRequired: "Akses dashboard memerlukan akun HRMS yang telah dipetakan ke data karyawan.", loadFailed: "Data kehadiran belum dapat dimuat. Coba kembali atau hubungi HR Admin.", connectionFailed: "Terjadi kesalahan saat menghubungkan ke Supabase.", sessionMissing: "Sesi login tidak ditemukan. Silakan login kembali.", accountMissing: "Akun belum dipetakan ke role HRMS. Hubungi HR Admin.", productivityRestricted: "Fitur Presensi & Produktivitas hanya dapat diakses oleh HR atau Manajer.", employee: "Karyawan", title: "Presensi & Produktivitas", description: "Pantau ringkasan kehadiran dan informasi produktivitas karyawan", from: "Dari", until: "Sampai", search: "Cari nama, NIP, departemen...", totalData: "Total data", attendanceRecords: "Catatan kehadiran", present: "Hadir", attendanceRecorded: "Kehadiran tercatat", underSeven: "Di bawah 7 jam", durationBelow: "Durasi belum memenuhi minimum", absent: "Tidak hadir", noAttendance: "Tidak ada kehadiran", leave: "Izin / cuti", leaveData: "Data izin atau cuti", workTrend: "Tren jam kerja", averageDaily: "Rata-rata jam kerja per hari", followsDate: "Periode mengikuti filter tanggal di atas.", noWorkHours: "Belum ada data jam kerja untuk periode ini.", productivityComparison: "Perbandingan produktivitas", averagePerEmployee: "Rata-rata per karyawan", sortedAverage: "Diurutkan berdasarkan jam kerja rata-rata.", noData: "Belum ada data.", history: "Riwayat kehadiran", found: "data ditemukan pada periode terpilih", loading: "Memuat data dari Supabase...", unavailable: "Data kehadiran belum tersedia", noResults: "Tidak terdapat data pada periode atau pencarian yang dipilih.", date: "Tanggal", status: "Status", clock: "Clock in / out", workHours: "Jam kerja", in: "Masuk", out: "Pulang", attendanceDetail: "Detail kehadiran", notAvailable: "Tidak tersedia", notYetAvailable: "Belum tersedia", productivityInfo: "Informasi produktivitas", flexibleDuration: "Penilaian durasi fleksibel: presensi memenuhi target jika total jam kerja minimal 7 jam.", meetsSeven: "MEMENUHI 7 JAM", belowSeven: "DI BAWAH 7 JAM", information: "Informasi", disclaimer: "Data presensi digunakan sebagai informasi monitoring dan tidak digunakan untuk menyimpulkan performa karyawan.", loadingData: "Memuat data kehadiran karyawan dari Supabase...", noDataTitle: "Tidak ada data presensi", noDataDescription: "Tidak ada data yang cocok dengan kriteria filter atau pencarian Anda.",
  } : {
    clockInLabel: "Clock in", clockOutLabel: "Clock out", restricted: "This feature is only available to HR or Managers.", accessRequired: "This dashboard requires an HRMS account mapped to employee data.", loadFailed: "Attendance data could not be loaded. Please try again or contact an HR Admin.", connectionFailed: "An error occurred while connecting to Supabase.", sessionMissing: "No login session was found. Please sign in again.", accountMissing: "This account has not been mapped to an HRMS role. Contact an HR Admin.", productivityRestricted: "Attendance & Productivity is only available to HR or Managers.", employee: "Employee", title: "Attendance & Productivity", description: "Monitor employee attendance summaries and productivity information", from: "From", until: "To", search: "Search by name, employee ID, or department...", totalData: "Total data", attendanceRecords: "Attendance records", present: "Present", attendanceRecorded: "Recorded attendance", underSeven: "Under 7 hours", durationBelow: "Duration below the minimum", absent: "Absent", noAttendance: "No attendance", leave: "Leave", leaveData: "Leave records", workTrend: "Work-hour trend", averageDaily: "Average work hours per day", followsDate: "The period follows the selected date filter.", noWorkHours: "No work-hour data for this period.", productivityComparison: "Productivity comparison", averagePerEmployee: "Average per employee", sortedAverage: "Sorted by average work hours.", noData: "No data yet.", history: "Attendance history", found: "records found for the selected period", loading: "Loading data from Supabase...", unavailable: "Attendance data is not available yet", noResults: "There is no data for the selected period or search.", date: "Date", status: "Status", clock: "Clock in / out", workHours: "Work hours", in: "In", out: "Out", attendanceDetail: "Attendance details", notAvailable: "Not available", notYetAvailable: "Not available yet", productivityInfo: "Productivity information", flexibleDuration: "Flexible duration assessment: attendance meets the target when total work hours reach at least seven hours.", meetsSeven: "MEETS 7 HOURS", belowSeven: "UNDER 7 HOURS", information: "Information", disclaimer: "Attendance data is used for monitoring information and is not used to conclude employee performance.", loadingData: "Loading employee attendance data from Supabase...", noDataTitle: "No attendance data", noDataDescription: "No data matches your current filter or search.",
  };
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [selectedItem, setSelectedItem] = useState<AttendanceRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tablePage, setTablePage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [isResolvingAccess, setIsResolvingAccess] = useState(true);

  const [startDate, setStartDate] = useState(() => recentAttendanceRange().start);
  const [endDate, setEndDate] = useState(() => recentAttendanceRange().end);

  // Fetch real data from Supabase
  async function fetchAttendanceFromSupabase() {
    if (!appRole) return;
    if (appRole !== "HR" && appRole !== "MANAGER") {
      setErrorMessage(copy.restricted);
      setAttendances([]);
      setSelectedItem(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setErrorMessage("");
      const supabase = createClient();

      const query = supabase
        .from("d3_attendances")
        .select(`
          id,
          b2_register_id,
          date,
          clock_in,
          clock_out,
          clock_in_latitude,
          clock_in_longitude,
          clock_in_accuracy_meters,
          clock_out_latitude,
          clock_out_longitude,
          clock_out_accuracy_meters,
          status,
          b2_register!d3_attendances_b2_register_id_fkey (
            employee_id,
            full_name,
            departement_id,
            d3_departments!b2_register_departement_id_fkey (
              name
            )
          )
        `)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false });

      // Rekap ini diperuntukkan bagi HR dan Manager agar dapat memantau
      // attendance seluruh karyawan dalam rentang tanggal yang dipilih.

      const { data, error } = await query;

      if (error) {
        console.warn("Supabase query notice:", error.message);
        setErrorMessage(
          error.code === "42501"
            ? copy.accessRequired
            : copy.loadFailed
        );
        setAttendances([]);
        setSelectedItem(null);
        return;
      }

      if (data) {
        const formatted: AttendanceRecord[] = (data as unknown as AttendanceQueryRow[]).map((item) => {
          const emp = item.b2_register;

          let clockInStr: string | null = null;
          if (item.clock_in) {
            const inDate = new Date(item.clock_in);
            clockInStr = !isNaN(inDate.getTime())
              ? inDate.toLocaleTimeString(locale, { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })
              : String(item.clock_in);
          }

          let clockOutStr: string | null = null;
          if (item.clock_out) {
            const outDate = new Date(item.clock_out);
            clockOutStr = !isNaN(outDate.getTime())
              ? outDate.toLocaleTimeString(locale, { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })
              : String(item.clock_out);
          }

          const clockInTime = item.clock_in ? new Date(item.clock_in).getTime() : Number.NaN;
          const clockOutTime = item.clock_out ? new Date(item.clock_out).getTime() : Number.NaN;
          const workHours =
            Number.isFinite(clockInTime) && Number.isFinite(clockOutTime) && clockOutTime > clockInTime
              ? Number(((clockOutTime - clockInTime) / 3_600_000).toFixed(1))
              : null;

          const derivedStatus: AttendanceStatus = item.status === "LEAVE"
            ? "LEAVE"
            : workHours !== null && workHours >= 7
              ? "PRESENT"
              : workHours !== null
                ? "UNDER_MINIMUM"
                : "ABSENT";

          return {
            id: item.id || `ATT-${item.b2_register_id}`,
            employee_id: emp?.employee_id || "EMP-AND-000",
            full_name: emp?.full_name || copy.employee,
            department: emp?.d3_departments?.name || "-",
            date: item.date || new Date().toISOString().split("T")[0],
            status: derivedStatus,
            clock_in: clockInStr,
            clock_out: clockOutStr,
            clock_in_latitude: item.clock_in_latitude,
            clock_in_longitude: item.clock_in_longitude,
            clock_in_accuracy_meters: item.clock_in_accuracy_meters,
            clock_out_latitude: item.clock_out_latitude,
            clock_out_longitude: item.clock_out_longitude,
            clock_out_accuracy_meters: item.clock_out_accuracy_meters,
            work_hours: workHours,
          };
        });

        setAttendances(formatted);
        setSelectedItem(formatted[0] ?? null);
      }
    } catch (err: unknown) {
      console.error("Fetch Exception:", err);
      setErrorMessage(
        err instanceof Error ? err.message : copy.connectionFailed
      );
      setAttendances([]);
      setSelectedItem(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function loadAccountAccess() {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        if (mounted) {
          setErrorMessage(copy.sessionMissing);
          setLoading(false);
          setIsResolvingAccess(false);
        }
        return;
      }

      const { data: access, error: accessError } = await supabase
        .from("b2_register")
        .select("app_role")
        .eq("auth_user_id", userData.user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!mounted) return;
      if (accessError || !access) {
        setErrorMessage(copy.accountMissing);
        setLoading(false);
        setIsResolvingAccess(false);
        return;
      }

      const role = access.app_role as AppRole;
      if (role !== "HR" && role !== "MANAGER") {
        setErrorMessage(copy.productivityRestricted);
        setLoading(false);
        setIsResolvingAccess(false);
        return;
      }

      setAppRole(role);
      setIsResolvingAccess(false);
    }

    void loadAccountAccess();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    // Data baru dimuat setelah role pengguna diketahui.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isResolvingAccess && appRole) void fetchAttendanceFromSupabase();
    // fetchAttendanceFromSupabase relies on the authenticated role and range.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appRole, isResolvingAccess, startDate, endDate]);

  const filteredData = useMemo(() => {
    return attendances.filter((item) => {
      const matchesSearch =
        item.full_name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.employee_id
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        item.department
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesDate =
        item.date >= startDate && item.date <= endDate;

      return matchesSearch && matchesDate;
    });
  }, [attendances, searchQuery, startDate, endDate]);
  const tablePageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredData.length / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const paginatedData = filteredData.slice((currentPage - 1) * tablePageSize, currentPage * tablePageSize);

  const summary = useMemo(() => {
    const present = filteredData.filter(
      (item) => item.status === "PRESENT"
    ).length;

    const underMinimum = filteredData.filter(
      (item) => item.status === "UNDER_MINIMUM"
    ).length;

    const absent = filteredData.filter(
      (item) => item.status === "ABSENT"
    ).length;

    const leave = filteredData.filter(
      (item) => item.status === "LEAVE"
    ).length;

    const totalWorkHours = filteredData.reduce(
      (total, item) => total + (item.work_hours ?? 0),
      0
    );

    const recordsWithHours = filteredData.filter(
      (item) => item.work_hours !== null
    ).length;

    const averageWorkHours =
      recordsWithHours > 0
        ? totalWorkHours / recordsWithHours
        : 0;

    return {
      present,
      underMinimum,
      absent,
      leave,
      averageWorkHours,
    };
  }, [filteredData]);

  const productivitySeries = useMemo(() => {
    const byDate = new Map<string, { total: number; count: number }>();
    const byEmployee = new Map<string, { name: string; total: number; count: number }>();
    filteredData.forEach((item) => {
      if (item.work_hours === null) return;
      const day = byDate.get(item.date) ?? { total: 0, count: 0 };
      day.total += item.work_hours;
      day.count += 1;
      byDate.set(item.date, day);
      const employee = byEmployee.get(item.employee_id) ?? { name: item.full_name, total: 0, count: 0 };
      employee.total += item.work_hours;
      employee.count += 1;
      byEmployee.set(item.employee_id, employee);
    });
    return {
      daily: Array.from(byDate, ([date, value]) => ({ date, hours: value.total / value.count })).sort((a, b) => a.date.localeCompare(b.date)),
      employees: Array.from(byEmployee.values()).map((value) => ({ name: value.name, hours: value.total / value.count })).sort((a, b) => b.hours - a.hours).slice(0, 8),
    };
  }, [filteredData]);

  return (
    <div className={`min-h-screen ${pageBgClass} text-slate-800`}>
      {/* HEADER */}
      <AppHeader pageTitle={t("attendanceProductivity")} />

      {/* PAGE TITLE */}
      <section className="px-4 pt-6 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <h1 className={pageTitleClass.title}>
                {copy.title}
              </h1>

              <p className={`max-w-3xl ${pageTitleClass.subtitle}`}>
                {copy.description}
              </p>
            </div>

            {/* <span className="inline-flex w-fit items-center rounded-full border border-[#006838]/25 bg-[#eaf7f0] px-3 py-1.5 text-xs font-bold text-[#006838]">
              Role: HR / Manager
            </span> */}
          </div>

          {errorMessage && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* FILTER */}
          <div className="mt-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div>
                <label className={labelClass}>
                  {copy.from}
                </label>

                <div className="relative">
                  <CalendarDays
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setTablePage(1); }}
                    className={inputClass("pl-10 text-xs")}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  {copy.until}
                </label>

                <div className="relative">
                  <CalendarDays
                    size={14}
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setTablePage(1); }}
                    className={inputClass("pl-10 text-xs")}
                  />
                </div>
              </div>
            </div>

            <div className="relative w-full xl:w-72">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                placeholder={copy.search}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setTablePage(1); }}
                className={searchInputClass}
              />
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {/* Total Data */}
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cardEyebrowClass}>
                  {copy.totalData}
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                  {loading ? <SkeletonBlock className="h-7 w-12" /> : filteredData.length}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {copy.attendanceRecords}
                </p>
              </div>

              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <UsersRound size={18} />
              </div>
            </div>
          </div>

          {/* Hadir */}
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cardEyebrowClass}>
                  {copy.present}
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-emerald-700">
                  {loading ? <SkeletonBlock className="h-7 w-12" /> : summary.present}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {copy.attendanceRecorded}
                </p>
              </div>

              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <UserCheck size={18} />
              </div>
            </div>
          </div>

          {/* Di bawah minimum */}
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cardEyebrowClass}>
                  {copy.underSeven}
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-amber-700">
                  {loading ? <SkeletonBlock className="h-7 w-12" /> : summary.underMinimum}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {copy.durationBelow}
                </p>
              </div>

              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600">
                <TrendingUp size={18} />
              </div>
            </div>
          </div>

          {/* Tidak Hadir */}
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cardEyebrowClass}>
                  {copy.absent}
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-red-700">
                  {loading ? <SkeletonBlock className="h-7 w-12" /> : summary.absent}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {copy.noAttendance}
                </p>
              </div>

              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600">
                <UserX size={18} />
              </div>
            </div>
          </div>

          {/* Izin / Cuti */}
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={cardEyebrowClass}>
                  {copy.leave}
                </p>

                <p className="mt-2 text-2xl font-bold tracking-tight text-blue-700">
                  {loading ? <SkeletonBlock className="h-7 w-12" /> : summary.leave}
                </p>

                <p className="mt-1 text-[11px] text-slate-500">
                  {copy.leaveData}
                </p>
              </div>

              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                <CalendarDays size={18} />
              </div>
            </div>
          </div>
        </div>

        {/* PRODUCTIVITY CHARTS */}
        <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_1fr]">
          <div className={`${cardClass} p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div><p className={cardEyebrowClass}>{copy.workTrend}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{copy.averageDaily}</h2><p className="mt-1 text-xs text-slate-500">{copy.followsDate}</p></div><TrendingUp size={19} className="shrink-0 text-slate-400" />
            </div>
            {productivitySeries.daily.length === 0 ? <div className="mt-6 flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-500">{copy.noWorkHours}</div> : <div className="mt-6 flex h-52 items-end gap-2 border-b border-l border-slate-200 px-3 pb-0 pt-4">{productivitySeries.daily.map((point) => { const max = Math.max(...productivitySeries.daily.map((item) => item.hours), 7); const height = Math.max((point.hours / max) * 100, 4); return <div key={point.date} className="group flex h-full min-w-7 flex-1 flex-col items-center justify-end gap-1"><span className="text-[10px] font-bold text-slate-600 opacity-0 transition group-hover:opacity-100">{point.hours.toFixed(1)}{language === "id" ? "j" : "h"}</span><div className="w-full rounded-t-md bg-[#3B6FF5] transition group-hover:bg-blue-700" style={{ height: `${height}%` }} /><span className="text-[10px] text-slate-500">{point.date.slice(5)}</span></div> })}</div>}
          </div>
          <div className={`${cardClass} p-5`}>
            <p className={cardEyebrowClass}>{copy.productivityComparison}</p><h2 className="mt-1 text-lg font-bold text-slate-900">{copy.averagePerEmployee}</h2><p className="mt-1 text-xs text-slate-500">{copy.sortedAverage}</p>
            <div className="mt-5 space-y-3">{productivitySeries.employees.length === 0 ? <p className="rounded-lg border border-dashed border-slate-300 py-12 text-center text-xs text-slate-500">{copy.noData}</p> : productivitySeries.employees.map((employee) => { const width = Math.min((employee.hours / 9) * 100, 100); return <div key={employee.name}><div className="mb-1 flex justify-between gap-2 text-[11px]"><span className="truncate font-semibold text-slate-700">{employee.name}</span><span className="shrink-0 font-bold text-slate-900">{employee.hours.toFixed(1)} {language === "id" ? "jam" : "hours"}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${width}%` }} /></div></div> })}</div>
          </div>
        </div>

        {/* HISTORY + DETAIL */}
        <div className="mt-5 flex flex-col gap-5 xl:flex-row">
          {/* TABLE */}
          <div className={`min-w-0 flex-1 overflow-hidden ${cardClass}`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {copy.history}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {filteredData.length} {copy.found}
                </p>
              </div>
            </div>

            {loading ? (
              <SkeletonTable rows={8} columns={6} />
            ) : filteredData.length === 0 ? (
              <div className="flex min-h-[250px] items-center justify-center p-6 text-center">
                <div>
                  <CalendarDays
                    size={32}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {copy.unavailable}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {copy.noResults}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`${tableClass.table} min-w-[760px]`}>
                  <thead>
                    <tr className={tableClass.head}>
                      <th className={tableClass.headCell}>
                        {copy.employee}
                      </th>

                      <th className={tableClass.headCell}>
                        {copy.date}
                      </th>

                      <th className={tableClass.headCell}>
                        {copy.status}
                      </th>

                      <th className={tableClass.headCell}>
                        {copy.clock}
                      </th>

                      <th className={tableClass.headCell}>
                        {copy.workHours}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedData.map((row) => {
                      const isSelected = selectedItem?.id === row.id;

                      const status = statusConfig(row.status, language);

                      return (
                        <tr
                          key={row.id}
                          onClick={() => setSelectedItem(row)}
                          className={`${isSelected ? tableClass.rowSelected : tableClass.row} cursor-pointer`}
                        >
                          <td className={tableClass.cell}>
                            <div className="font-semibold text-slate-900">
                              {row.full_name}
                            </div>

                            <div className="mt-0.5 text-xs text-slate-500">
                              {row.employee_id} • {row.department}
                            </div>
                          </td>

                          <td className={`${tableClass.cell} font-medium`}>
                            {row.date}
                          </td>

                          <td className={tableClass.cell}>
                            <span
                              className={status.className}
                            >
                              {status.label}
                            </span>
                          </td>

                          <td className={tableClass.cell}>
                            <div>
                              {copy.in}: {row.clock_in ? `${row.clock_in} WIB` : "-"}
                            </div>

                            <div>
                              {copy.out}: {row.clock_out ? `${row.clock_out} WIB` : "-"}
                            </div>
                          </td>

                          <td className={tableClass.cell}>
                            {row.work_hours !== null ? (
                              <span className="font-semibold text-slate-900">
                                {row.work_hours.toFixed(1)} {language === "id" ? "jam" : "hours"}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <TablePagination page={currentPage} pageSize={tablePageSize} totalItems={filteredData.length} onPageChange={setTablePage} />
          </div>

          {/* DETAIL */}
          {selectedItem && (
            <div className={`w-full shrink-0 p-5 ${cardClass} xl:w-[360px]`}>
              <div className="border-b border-slate-100 pb-4">
                <span className={cardEyebrowClass}>
                  {copy.attendanceDetail}
                </span>

                <h3 className="mt-1 text-base font-bold text-slate-900">
                  {selectedItem.full_name}
                </h3>

                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedItem.employee_id} • {selectedItem.department}
                </p>
              </div>

              <div className="mt-4">
                <span
                  className={statusConfig(selectedItem.status, language).className}
                >
                  {statusConfig(selectedItem.status, language).label}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <DetailRow
                  label={copy.date}
                  value={selectedItem.date}
                />

                <DetailRow
                  label={copy.clockInLabel}
                  value={
                    selectedItem.clock_in
                      ? `${selectedItem.clock_in} WIB`
                      : copy.notAvailable
                  }
                />

                <DetailRow
                  label={copy.clockOutLabel}
                  value={
                    selectedItem.clock_out
                      ? `${selectedItem.clock_out} WIB`
                      : copy.notAvailable
                  }
                />

                <LocationMapPreview
                  clockIn={{
                    latitude: selectedItem.clock_in_latitude,
                    longitude: selectedItem.clock_in_longitude,
                    accuracyMeters: selectedItem.clock_in_accuracy_meters,
                  }}
                  clockOut={{
                    latitude: selectedItem.clock_out_latitude,
                    longitude: selectedItem.clock_out_longitude,
                    accuracyMeters: selectedItem.clock_out_accuracy_meters,
                  }}
                />

                <DetailRow
                  label={copy.workHours}
                  value={
                    selectedItem.work_hours !== null
                      ? `${selectedItem.work_hours.toFixed(1)} ${language === "id" ? "jam" : "hours"}`
                      : copy.notYetAvailable
                  }
                />
              </div>

              {/* PRODUCTIVITY */}
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp
                    size={15}
                    className="text-slate-400"
                  />

                  <span className="text-xs font-bold text-slate-900">
                    {copy.productivityInfo}
                  </span>
                </div>

                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {copy.flexibleDuration}
                </p>

                <span className={badgeClass(selectedItem.work_hours !== null && selectedItem.work_hours >= 7 ? "green" : "amber", "mt-3")}>
                  {selectedItem.work_hours !== null && selectedItem.work_hours >= 7 ? copy.meetsSeven : copy.belowSeven}
                </span>
              </div>

              {/* NOTE */}
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-bold text-blue-700">
                  {copy.information}
                </p>

                <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                  {copy.disclaimer}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* =========================
   COMPONENTS
========================= */

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <span className="text-right text-xs font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}
