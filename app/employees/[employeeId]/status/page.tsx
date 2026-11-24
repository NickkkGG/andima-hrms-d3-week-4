import Link from "next/link";
import { redirect } from "next/navigation";
import EmployeeStatusForm from "@/components/EmployeeStatusForm";
import EmployeeManagementAccessDenied from "@/components/hrms/EmployeeManagementAccessDenied";
import HrmsShell from "@/components/hrms/HrmsShell";
import { canManageEmployeeProfiles, getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { localizedCopy } from "@/lib/i18n-copy";
import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("employmentStatus");

interface EmployeeStatusPageProps {
  params: Promise<{ employeeId: string }>;
}

interface EmployeeStatusProfile {
  id: string;
  b2_register_id: string;
  employee_id: string;
  full_name: string;
  employment_status: string | null;
}

export default async function EmployeeStatusPage({ params }: EmployeeStatusPageProps) {
  const copyText = { id: { title: "Ubah status kepegawaian", back: "← Profil pegawai", eyebrow: "MANAJEMEN PEGAWAI", description: "Perbarui status tanpa mengubah data profil atau riwayat pegawai." }, en: { title: "Change employment status", back: "← Employee profile", eyebrow: "EMPLOYEE MANAGEMENT", description: "Update status without changing employee profile data or history." } }; const copy = localizedCopy(copyText);
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

  const { data: b2Employee, error } = await supabase
    .from("b2_register")
    .select("id, employee_id, full_name, employment_status")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .maybeSingle()
    .returns<Omit<EmployeeStatusProfile, "b2_register_id">>();

  if (error) {
    console.error("Employee status profile query failed", {
      code: error.code,
      message: error.message,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-3xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-bold">{copy.title}</h1>
          <p className="mt-2"><LocalizedText id="Data pegawai belum dapat dimuat. Silakan coba lagi nanti." en="Employee data could not be loaded. Please try again later." /></p>
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
        <section className="mx-auto max-w-3xl rounded-xl border border-[#D9E2FC] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#121B2E]">{copy.title}</h1>
          <p className="mt-2 text-slate-600"><LocalizedText id="Data pegawai tidak ditemukan." en="Employee data was not found." /></p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            <LocalizedText id="← Kembali ke Daftar Pegawai" en="← Back to Employee Directory" />
          </Link>
        </section>
      </HrmsShell>
    );
  }

  const employee: EmployeeStatusProfile = {
    id: b2Employee.id,
    b2_register_id: b2Employee.id,
    employee_id: b2Employee.employee_id,
    full_name: b2Employee.full_name,
    employment_status: b2Employee.employment_status?.toUpperCase() ?? null,
  };

  return (
    <HrmsShell userEmail={user.email} userRole={userRole}>
      <section className="mx-auto max-w-4xl space-y-7">
        <Link className="inline-flex text-sm font-semibold text-[#1E3765] hover:text-[#155DFC]" href={`/employees/${encodeURIComponent(employee.employee_id)}`}>{copy.back}</Link>

        <header>
          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1E3765]">{copy.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-[-0.4px] text-[#121b2e]">{copy.title}</h1>
          <p className="mt-1 text-sm text-[#4d5f81]">{copy.description}</p>
        </header>

        <EmployeeStatusForm employee={employee} />
      </section>
    </HrmsShell>
  );
}
