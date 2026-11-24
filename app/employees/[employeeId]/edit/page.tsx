import Link from "next/link";
import { redirect } from "next/navigation";
import EmployeeEditForm from "@/components/EmployeeEditForm";
import EmployeeManagementAccessDenied from "@/components/hrms/EmployeeManagementAccessDenied";
import HrmsShell from "@/components/hrms/HrmsShell";
import type { DepartmentOption, EmployeeProfile, PositionOption } from "@/types/employee";
import { canManageEmployeeProfiles, getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { localizedCopy } from "@/lib/i18n-copy";
import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("editEmployeeProfile");

interface EditEmployeePageProps {
  params: Promise<{ employeeId: string }>;
}

interface D1PositionOption {
  position_id: string;
  position_code: string;
  position_title: string;
  department_id: string;
  department_code: string;
  department_name: string;
}

interface B2EmployeeEditRow {
  id: string;
  employee_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  employment_status: string | null;
  position_id: string | null;
  departement_id: string | null;
  created_at: string;
}

interface D3MirrorProvisionResult {
  employee_id: string;
}

export default async function EditEmployeePage({ params }: EditEmployeePageProps) {
  const copy = localizedCopy({ id: { title: "Edit profil pegawai", back: "← Profil pegawai", eyebrow: "MANAJEMEN PEGAWAI" }, en: { title: "Edit employee profile", back: "← Employee profile", eyebrow: "EMPLOYEE MANAGEMENT" } });
  const { employeeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userRole = await getD3AppRole(supabase, user.id);

  if (!canManageEmployeeProfiles(userRole)) {
    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <EmployeeManagementAccessDenied title={copy.title} />
      </HrmsShell>
    );
  }

  const { data: b2Employee, error: employeeError } = await supabase
    .from("b2_register")
    .select("id, employee_id, full_name, email, phone, employment_status, position_id, departement_id, created_at")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .maybeSingle()
    .returns<B2EmployeeEditRow>();

  if (employeeError) {
    console.error("Employee edit profile query failed", {
      code: employeeError.code,
      message: employeeError.message,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-bold">{copy.title}</h1>
          <p className="mt-2"><LocalizedText id="Profil pegawai belum dapat dimuat. Silakan coba lagi nanti." en="The employee profile could not be loaded. Please try again later." /></p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            <LocalizedText id="← Kembali ke Daftar Pegawai" en="← Back to Employee Directory" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  if (!b2Employee) {
    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-xl border border-[#D9E2FC] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#121B2E]">{copy.title}</h1>
          <p className="mt-2 text-slate-600"><LocalizedText id="Data pegawai tidak ditemukan." en="Employee data was not found." /></p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            <LocalizedText id="← Kembali ke Daftar Pegawai" en="← Back to Employee Directory" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  const { data: b2Source, error: b2SourceError } = await supabase
    .from("d3_b2_employee_sources")
    .select("employee_id")
    .eq("b2_register_id", b2Employee.id)
    .maybeSingle();

  if (b2SourceError) {
    console.error("Employee edit B2 source query failed", {
      code: b2SourceError.code,
      message: b2SourceError.message,
    });
  }

  if (b2SourceError) {
    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-xl border border-[#D9E2FC] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#121B2E]">{copy.title}</h1>
          <p className="mt-2 text-slate-600"><LocalizedText id="Pemetaan data pegawai belum dapat dimuat." en="The employee data mapping could not be loaded." /></p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            <LocalizedText id="← Kembali ke Daftar Pegawai" en="← Back to Employee Directory" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  const { data: provisionedMirror, error: provisionError } = b2Source
    ? { data: b2Source, error: null }
    : await supabase
      .rpc("d3_ensure_b2_employee_mirror", { p_b2_register_id: b2Employee.id })
      .maybeSingle()
      .returns<D3MirrorProvisionResult>();

  if (provisionError || !provisionedMirror) {
    const provisionErrorCode = provisionError?.code ?? "NO_RESULT";
    const provisionErrorMessage = provisionError?.message ?? "D3 mirror RPC returned no employee.";
    console.error(
      "Employee edit D3 mirror provisioning failed",
      JSON.stringify({ code: provisionErrorCode, message: provisionErrorMessage, details: provisionError?.details ?? null, hint: provisionError?.hint ?? null })
    );
    const userMessage = provisionErrorCode === "23505"
      ? { id: "Email pegawai sudah terhubung ke data D3 dengan nama berbeda. Pemetaan perlu diperbaiki oleh admin terlebih dahulu.", en: "This employee email is already linked to D3 data under a different name. An admin needs to fix the mapping first." }
      : provisionErrorCode === "22023"
        ? { id: "Data B2 belum lengkap. Pastikan nama, email, posisi, dan departemen sudah terisi.", en: "The B2 data is incomplete. Make sure name, email, position, and department are filled in." }
        : provisionErrorCode === "42501"
          ? { id: "Anda tidak memiliki izin HR untuk membuat data D3.", en: "You do not have HR permission to create D3 data." }
          : { id: "Data D3 belum dapat dibuat. Pastikan posisi dan departemen pegawai sudah tersedia di B2.", en: "D3 data could not be created. Make sure the employee's position and department exist in B2." };
    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-bold text-[#121B2E]">{copy.title}</h1>
          <p className="mt-2"><LocalizedText id={userMessage.id} en={userMessage.en} /></p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href={`/employees/${encodeURIComponent(employeeId)}`}>
            <LocalizedText id="← Kembali ke Profil Pegawai" en="← Back to Employee Profile" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  const { data: d3Employee, error: d3EmployeeError } = await supabase
    .from("d3_view_employee_360")
    .select("id, identity_type, identity_number, join_date, work_location, position_id, position_title, department_id, department_name, tenure_years, tenure_months")
    .eq("id", provisionedMirror.employee_id)
    .maybeSingle()
    .returns<Pick<EmployeeProfile, "id" | "identity_type" | "identity_number" | "join_date" | "work_location" | "position_id" | "position_title" | "department_id" | "department_name" | "tenure_years" | "tenure_months">>();

  if (d3EmployeeError || !d3Employee) {
    console.error("Employee edit D3 extension query failed", {
      code: d3EmployeeError?.code,
      message: d3EmployeeError?.message,
    });
    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-xl border border-[#D9E2FC] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#121B2E]">{copy.title}</h1>
          <p className="mt-2 text-slate-600"><LocalizedText id="Data tambahan pegawai belum tersinkronisasi ke D3." en="Additional employee data has not been synchronized to D3 yet." /></p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href={`/employees/${encodeURIComponent(employeeId)}`}>
            <LocalizedText id="← Kembali ke Profil Pegawai" en="← Back to Employee Profile" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  const employee: EmployeeProfile = {
    id: d3Employee.id,
    b2_register_id: b2Employee.id,
    d3_employee_id: d3Employee.id,
    employee_id: b2Employee.employee_id,
    full_name: b2Employee.full_name,
    email: b2Employee.email,
    phone: b2Employee.phone,
    identity_type: d3Employee.identity_type,
    identity_number: d3Employee.identity_number,
    join_date: d3Employee.join_date ?? b2Employee.created_at.slice(0, 10),
    employment_status: b2Employee.employment_status?.toUpperCase() ?? null,
    work_location: d3Employee.work_location,
    position_id: b2Employee.position_id ?? d3Employee.position_id,
    position_title: d3Employee.position_title,
    department_id: b2Employee.departement_id ?? d3Employee.department_id,
    department_name: d3Employee.department_name,
    tenure_years: d3Employee.tenure_years,
    tenure_months: d3Employee.tenure_months,
  };

  const { data: activeOptionsData, error: optionsError } = await supabase
    .rpc("d3_active_d1_position_options")
    .returns<D1PositionOption[]>();
  const activeOptions: D1PositionOption[] = Array.isArray(activeOptionsData) ? activeOptionsData : [];

  const positionsById = new Map(
    activeOptions.map((option) => [option.position_id, {
      id: option.position_id,
      code: option.position_code,
      title: option.position_title,
      department_id: option.department_id,
    }])
  );
  const departmentsById = new Map(
    activeOptions.map((option) => [option.department_id, {
      id: option.department_id,
      code: option.department_code,
      name: option.department_name,
    }])
  );

  // A legacy assignment remains visible so HR can edit other profile fields without
  // silently replacing a position that predates the D1 master mapping.
  const needsLegacyPosition = Boolean(employee.position_id && !positionsById.has(employee.position_id));
  const { data: legacyPosition, error: legacyPositionError } = needsLegacyPosition
    ? await supabase
      .from("d3_positions")
      .select("id, code, title, department_id")
      .eq("id", employee.position_id ?? "")
      .maybeSingle()
      .returns<PositionOption>()
    : { data: null, error: null };
  if (legacyPosition) positionsById.set(legacyPosition.id, legacyPosition);

  const needsLegacyDepartment = Boolean(employee.department_id && !departmentsById.has(employee.department_id));
  const { data: legacyDepartment, error: legacyDepartmentError } = needsLegacyDepartment
    ? await supabase
      .from("d3_departments")
      .select("id, code, name")
      .eq("id", employee.department_id ?? "")
      .maybeSingle()
      .returns<DepartmentOption>()
    : { data: null, error: null };
  if (legacyDepartment) departmentsById.set(legacyDepartment.id, legacyDepartment);

  const departmentsResult = { data: [...departmentsById.values()].sort((a, b) => a.name.localeCompare(b.name)), error: legacyDepartmentError };
  const positionsResult = { data: [...positionsById.values()].sort((a, b) => a.title.localeCompare(b.title)), error: legacyPositionError };

  if (optionsError || departmentsResult.error || positionsResult.error) {
    console.error("Employee edit lookup query failed", {
      options: optionsError?.code,
      departments: departmentsResult.error?.code,
      positions: positionsResult.error?.code,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-bold">{copy.title}</h1>
          <p className="mt-2"><LocalizedText id="Pilihan posisi atau departemen belum dapat dimuat. Silakan coba lagi nanti." en="Position or department options could not be loaded. Please try again later." /></p>
          <Link
            className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]"
            href={`/employees/${encodeURIComponent(employee.employee_id)}`}
          >
            <LocalizedText id="← Kembali ke Profil Pegawai" en="← Back to Employee Profile" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  return (
    <HrmsShell userEmail={user.email} userRole={userRole}>
      <section className="mx-auto max-w-6xl space-y-7">
        <Link className="inline-flex text-sm font-semibold text-[#1E3765] hover:text-[#155DFC]" href={`/employees/${encodeURIComponent(employee.employee_id)}`}>{copy.back}</Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1E3765]">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.4px] text-[#121b2e]">{copy.title}</h1>
          <p className="mt-1 text-sm text-[#4d5f81]"><LocalizedText id={`Perbarui informasi profil untuk ${employee.full_name}.`} en={`Update profile information for ${employee.full_name}.`} /></p>
        </header>

        <EmployeeEditForm
          employee={employee}
          departments={departmentsResult.data}
          positions={positionsResult.data}
        />
      </section>
    </HrmsShell>
  );
}
