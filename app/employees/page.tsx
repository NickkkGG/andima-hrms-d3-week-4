import { redirect } from "next/navigation";
import EmployeeSyncHistory from "@/components/EmployeeSyncHistory";
import EmployeeTable from "@/components/EmployeeTable";
import HrmsShell from "@/components/hrms/HrmsShell";
import type { EmployeeListItem } from "@/types/employee";
import { getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";
import { localizedCopy } from "@/lib/i18n-copy";
import { pageMetadata } from "@/lib/page-metadata";
import { badgeClass, cardClass, pageTitleClass } from "@/components/ui/styles";

export const generateMetadata = () => pageMetadata("employeeDirectory");

interface EmployeeSyncEvent {
  id: string;
  event_kind: string;
  message: string;
  created_at: string;
}

interface B2EmployeeDirectoryRow {
  id: string;
  employee_id: string | null;
  full_name: string | null;
  email: string | null;
  employment_status: string | null;
  position_id: string | null;
  departement_id: string | null;
  created_at: string;
  is_active: boolean | null;
}

interface EmployeeReference {
  id: string;
  title?: string;
  name?: string;
}

export default async function EmployeesPage() {
  const copyText = { id: { directory: "Direktori Pegawai", loadFailed: "Data pegawai belum dapat dimuat. Silakan coba lagi nanti.", eyebrow: "HRMS · Profil Pegawai", description: "Direktori pegawai yang telah tersinkronisasi dari registrasi B2.", active: "Aktif", syncHistory: "Riwayat sinkronisasi", open: "(buka untuk melihat)", noEmployees: "Belum ada data pegawai", noEmployeesDescription: "Pegawai dari registrasi B2 akan muncul di sini setelah tersedia.", employee: "Karyawan" }, en: { directory: "Employee Directory", loadFailed: "Employee data could not be loaded. Please try again later.", eyebrow: "HRMS · Employee Profile", description: "Employee directory synchronized from B2 registration.", active: "Active", syncHistory: "Synchronization history", open: "(open to view)", noEmployees: "No employee data yet", noEmployeesDescription: "Employees from B2 registration will appear here when available.", employee: "Employee" } }; const copy = localizedCopy(copyText);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userRole = await getD3AppRole(supabase, user.id);
  const [employeesResult, positionsResult, departmentsResult, hiddenEmployeesResult, sourcesResult, eventsResult] = await Promise.all([
    supabase
      .from("b2_register")
      .select("id, employee_id, full_name, email, employment_status, position_id, departement_id, created_at, is_active")
      .eq("is_active", true)
      .order("employee_id", { ascending: true })
      .returns<B2EmployeeDirectoryRow[]>(),
    supabase
      .from("d3_positions")
      .select("id, title")
      .returns<EmployeeReference[]>(),
    supabase
      .from("d3_departments")
      .select("id, name")
      .returns<EmployeeReference[]>(),
    supabase
      .from("d3_employee_directory_hidden")
      .select("employee_id")
      .returns<Array<{ employee_id: string }>>(),
    supabase
      .from("d3_b2_employee_sources")
      .select("b2_register_id, employee_id")
      .returns<Array<{ b2_register_id: string; employee_id: string }>>(),
    userRole === "HR"
      ? supabase
        .from("d3_employee_sync_events")
        .select("id, event_kind, message, created_at")
        .order("created_at", { ascending: false })
        .limit(12)
        .returns<EmployeeSyncEvent[]>()
      : Promise.resolve({ data: [] as EmployeeSyncEvent[], error: null }),
  ]);
  const { data, error } = employeesResult;
  const hiddenEmployeesError = hiddenEmployeesResult.error;
  const positionsError = positionsResult.error;
  const departmentsError = departmentsResult.error;
  const sourcesError = sourcesResult.error;
  const eventsError = eventsResult.error;

  if (error || positionsError || departmentsError || hiddenEmployeesError || sourcesError || eventsError) {
    console.error("Employee list query failed", {
      code: error?.code ?? positionsError?.code ?? departmentsError?.code ?? hiddenEmployeesError?.code ?? sourcesError?.code ?? eventsError?.code,
      message: error?.message ?? positionsError?.message ?? departmentsError?.message ?? hiddenEmployeesError?.message ?? sourcesError?.message ?? eventsError?.message,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-7xl rounded-2xl border border-red-200 bg-white p-6 shadow-xs">
          <h1 className="text-xl font-bold text-slate-900">{copy.directory}</h1>
          <p className="mt-2 text-sm text-red-700">{copy.loadFailed}</p>
        </section>
      </HrmsShell>
    );
  }

  const hiddenEmployeeIds = new Set((hiddenEmployeesResult.data ?? []).map((employee) => employee.employee_id));
  const b2ToD3EmployeeIds = new Map((sourcesResult.data ?? []).map((source) => [source.b2_register_id, source.employee_id]));
  const positionNames = new Map((positionsResult.data ?? []).map((position) => [position.id, position.title ?? null]));
  const departmentNames = new Map((departmentsResult.data ?? []).map((department) => [department.id, department.name ?? null]));
  const employees: EmployeeListItem[] = (data ?? [])
    .filter((employee) => employee.employee_id && employee.full_name)
    .map((employee) => ({
      id: b2ToD3EmployeeIds.get(employee.id) ?? employee.id,
      employee_id: employee.employee_id as string,
      full_name: employee.full_name as string,
      position_title: employee.position_id ? positionNames.get(employee.position_id) ?? null : null,
      department_name: employee.departement_id ? departmentNames.get(employee.departement_id) ?? null : null,
      employment_status: employee.employment_status?.toUpperCase() ?? null,
      work_location: null,
      join_date: employee.created_at ? employee.created_at.slice(0, 10) : null,
    }))
    .filter((employee) => !hiddenEmployeeIds.has(employee.id));
  const profileName = typeof user.user_metadata.full_name === "string"
    ? user.user_metadata.full_name
    : user.email?.split("@")[0] ?? "HR Manager";
  const profileRole = userRole === "HR" ? "HR / Manager" : userRole ?? copy.employee;
  const profileInitials = profileName.split(/\s+/).filter(Boolean).slice(0, 2).map((name) => name[0]?.toUpperCase()).join("") || "HR";

  return (
    <HrmsShell userEmail={user.email} userRole={userRole}>
      <section className="mx-auto w-full max-w-[1240px]">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div><p className={pageTitleClass.eyebrow}>{copy.eyebrow}</p><h1 className={`mt-1 ${pageTitleClass.title}`}>{copy.directory}</h1><p className={`max-w-2xl ${pageTitleClass.subtitle}`}>{copy.description}</p></div>
        </header>

        <div className={`flex min-h-[104px] items-center gap-4 px-5 py-4 sm:px-6 ${cardClass}`}>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-blue-200 bg-blue-100 text-base font-bold text-blue-700">{profileInitials}</span>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-base font-bold leading-6 text-slate-900">{profileName}</p><span className={badgeClass("green")}>{copy.active}</span></div><p className="mt-1 text-xs font-semibold text-blue-700">{profileRole}</p></div>
        </div>

        {userRole === "HR" && <details className={`mt-5 ${cardClass}`}><summary className="cursor-pointer list-none rounded-2xl px-5 py-4 text-sm font-bold text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6FF5]/40">{copy.syncHistory} <span className="ml-1 text-xs font-normal text-slate-500">{copy.open}</span></summary><div className="border-t border-slate-100 p-5"><EmployeeSyncHistory events={eventsResult.data ?? []} /></div></details>}

        {employees.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            <p className="text-base font-bold text-slate-900">{copy.noEmployees}</p><p className="mt-1 text-sm">{copy.noEmployeesDescription}</p>
          </div>
        ) : (
          <EmployeeTable employees={employees} summary={{ total: employees.length, active: employees.filter((employee) => ["PERMANENT", "CONTRACT", "INTERN"].includes(employee.employment_status ?? "")).length, probation: employees.filter((employee) => employee.employment_status === "PROBATION").length, inactive: employees.filter((employee) => ["RESIGNED", "TERMINATED"].includes(employee.employment_status ?? "")).length }} />
        )}
      </section>
    </HrmsShell>
  );
}
