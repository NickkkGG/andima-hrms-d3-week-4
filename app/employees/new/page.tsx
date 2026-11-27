import BackLink from "@/components/ui/BackLink";
import { modalClass } from "@/components/ui/styles";
import { redirect } from "next/navigation";
import EmployeeCreateForm from "@/components/EmployeeCreateForm";
import EmployeeManagementAccessDenied from "@/components/hrms/EmployeeManagementAccessDenied";
import HrmsShell from "@/components/hrms/HrmsShell";
import type { DepartmentOption, PositionOption } from "@/types/employee";
import { canManageEmployeeProfiles, getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("newEmployee");

export default async function NewEmployeePage() {
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
        <EmployeeManagementAccessDenied title={<LocalizedText id="Tambah Pegawai Baru" en="Add a New Employee" />} />
      </HrmsShell>
    );
  }

  const [departmentsResult, positionsResult] = await Promise.all([
    supabase
      .from("d3_departments")
      .select("id, code, name")
      .order("name", { ascending: true })
      .returns<DepartmentOption[]>(),
    supabase
      .from("d3_positions")
      .select("id, code, title, department_id")
      .order("title", { ascending: true })
      .returns<PositionOption[]>(),
  ]);

  if (departmentsResult.error || positionsResult.error) {
    console.error("Employee create lookup query failed", {
      departments: departmentsResult.error?.code,
      positions: positionsResult.error?.code,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-5xl rounded-2xl border border-red-200 bg-white p-6 shadow-xs">
          <h1 className="text-xl font-bold text-slate-900"><LocalizedText id="Tambah Pegawai Baru" en="Add a New Employee" /></h1>
          <p className="mt-2 text-sm text-red-700"><LocalizedText id="Pilihan posisi atau departemen belum dapat dimuat. Silakan coba lagi nanti." en="Position or department options could not be loaded. Please try again later." /></p>
          <BackLink className="mt-4" href="/employees">
            <LocalizedText id="Kembali ke Daftar Pegawai" en="Back to Employee Directory" />
          </BackLink>
        </section>
      </HrmsShell>
    );
  }

  return (
    <HrmsShell userEmail={user.email} userRole={userRole}>
      <div className={`${modalClass.overlay} overflow-y-auto`}>
        <section className={`my-auto max-w-[1185px] p-5 sm:p-8 ${modalClass.panel}`}>
          <EmployeeCreateForm departments={departmentsResult.data ?? []} positions={positionsResult.data ?? []} />
        </section>
      </div>
    </HrmsShell>
  );
}
