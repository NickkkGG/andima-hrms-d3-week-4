import Link from "next/link";
import { redirect } from "next/navigation";
import { Link2, Mail, MapPin, Phone } from "lucide-react";
import EmployeeDirectoryVisibilityButton from "@/components/EmployeeDirectoryVisibilityButton";
import HrmsShell from "@/components/hrms/HrmsShell";
import HrmsStatusPill from "@/components/hrms/HrmsStatusPill";
import type {
  EmployeeAttendance,
  EmployeeCertification,
  EmployeeFeedbackReward,
  EmployeeProfile,
  EmployeeSkill,
} from "@/types/employee";
import { canManageEmployeeProfiles, getD3AppRole } from "@/utils/employee-access";
import { createClient } from "@/utils/supabase/server";
import { getServerLanguage } from "@/lib/i18n-server";

interface EmployeeProfilePageProps {
  params: Promise<{ employeeId: string }>;
}

interface B2EmployeeProfileRow {
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

function displayValue(value: string | null, language: "id" | "en" = "id") {
  return value || (language === "id" ? "Belum tersedia" : "Not available");
}

function formatDate(value: string | null, language: "id" | "en" = "id") {
  if (!value) return language === "id" ? "Belum tersedia" : "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTime(value: string | null, language: "id" | "en" = "id") {
  if (!value) return language === "id" ? "Belum tersedia" : "Not available";

  if (value.includes("T") || value.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
      }).format(date);
    }
  }

  const match = value.match(/(\d{2}:\d{2})/);
  return match ? match[1] : value;
}

function formatTenure(years: number | null, months: number | null, joinDate: string | null, language: "id" | "en" = "id") {
  if (!joinDate || years === null || months === null) return language === "id" ? "Belum tersedia" : "Not available";
  if (years === 0 && months === 0) return language === "id" ? "Kurang dari 1 bulan" : "Less than 1 month";

  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${language === "id" ? "tahun" : years === 1 ? "year" : "years"}`);
  if (months > 0) parts.push(`${months} ${language === "id" ? "bulan" : months === 1 ? "month" : "months"}`);

  return parts.length > 0 ? parts.join(" ") : language === "id" ? "Belum tersedia" : "Not available";
}

function initials(fullName: string) {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("") || "EP";
}

function ProfileSection({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[10px] border border-[rgba(87,138,252,0.22)] bg-white p-5 shadow-[3px_3px_16px_rgba(87,138,252,0.16)] sm:p-6 ${className}`}>
      <h2 className="text-lg font-bold tracking-tight text-[#121B2E]">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function EmptyState({ children = "Belum tersedia" }: { children?: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-lg border border-dashed border-[#D9E2FC] bg-[#F7F9FC] px-4 py-4 text-sm text-slate-500"><span className="flex size-8 items-center justify-center rounded-full bg-[#EEF4FF] text-[#155DFC]" aria-hidden="true">○</span><span>{children}</span></div>;
}

function logRelatedQueryError(source: string, error: { code: string; message: string }) {
  console.error("Employee profile related query failed", {
    source,
    code: error.code,
    message: error.message,
  });
}

export default async function EmployeeProfilePage({ params }: EmployeeProfilePageProps) {
  const language = await getServerLanguage();
  const copy = language === "id" ? { directory: "← Direktori pegawai", profile: "Profil pegawai", edit: "Edit profil", status: "Ubah status", unavailable: "Belum tersedia", joined: "Bergabung", tenure: "Masa kerja", connected: "Data kehadiran, sertifikasi, umpan balik, dan reward terhubung melalui ID Pegawai ini.", contact: "Informasi kontak", phone: "Telepon", location: "Lokasi kerja", identity: "Identitas", skills: "Keahlian & kompetensi", noSkills: "Belum ada data keahlian atau kompetensi.", certifications: "Sertifikasi", noCertifications: "Belum ada data sertifikasi.", issued: "Diterbitkan", expires: "Berakhir", credential: "ID kredensial", attendance: "Kehadiran", noAttendance: "Belum ada data kehadiran.", present: "Hadir", late: "Terlambat", absent: "Tidak hadir", feedback: "Umpan balik & reward", noFeedback: "Belum ada data umpan balik atau reward." } : { directory: "← Employee directory", profile: "Employee profile", edit: "Edit profile", status: "Change status", unavailable: "Not available", joined: "Joined", tenure: "Tenure", connected: "Attendance, certifications, feedback, and rewards are linked through this Employee ID.", contact: "Contact information", phone: "Phone", location: "Work location", identity: "Identity", skills: "Skills & competencies", noSkills: "No skill or competency data yet.", certifications: "Certifications", noCertifications: "No certification data yet.", issued: "Issued", expires: "Expires", credential: "Credential ID", attendance: "Attendance", noAttendance: "No attendance data yet.", present: "Present", late: "Late", absent: "Absent", feedback: "Feedback & reward", noFeedback: "No feedback or reward data yet." };
  const { employeeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const userRole = await getD3AppRole(supabase, user.id);
  const canManageEmployees = canManageEmployeeProfiles(userRole);

  const { data: b2Employee, error: employeeError } = await supabase
    .from("b2_register")
    .select("id, employee_id, full_name, email, phone, employment_status, position_id, departement_id, created_at")
    .eq("employee_id", employeeId)
    .eq("is_active", true)
    .maybeSingle()
    .returns<B2EmployeeProfileRow>();

  if (employeeError) {
    console.error("Employee profile query failed", {
      code: employeeError.code,
      message: employeeError.message,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-bold">Employee Profile</h1>
          <p className="mt-2">Profil pegawai belum dapat dimuat. Silakan coba lagi nanti.</p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            ← Employee Directory
          </Link>
        </section>
      </HrmsShell>
    );
  }

  if (!b2Employee) {
    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-7xl rounded-xl border border-[#D9E2FC] bg-white p-6 shadow-sm">
          <h1 className="text-xl font-bold text-[#121B2E]">Employee Profile</h1>
          <p className="mt-2 text-slate-600">Data pegawai tidak ditemukan.</p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            ← Employee Directory
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
    console.error("Employee profile B2 source query failed", {
      code: b2SourceError.code,
      message: b2SourceError.message,
    });

    return (
      <HrmsShell userEmail={user.email} userRole={userRole}>
        <section className="mx-auto max-w-7xl rounded-xl border border-red-200 bg-white p-6 text-red-700 shadow-sm">
          <h1 className="text-xl font-bold">Employee Profile</h1>
          <p className="mt-2">Sumber data employee belum dapat diverifikasi. Silakan coba lagi nanti.</p>
          <Link className="mt-4 inline-block text-sm font-semibold text-[#1E3765] hover:text-[#0F2342]" href="/employees">
            ← Employee Directory
          </Link>
        </section>
      </HrmsShell>
    );
  }

  const { data: d3Employee, error: d3EmployeeError } = b2Source
    ? await supabase
      .from("d3_view_employee_360")
      .select("id, identity_type, identity_number, join_date, work_location, position_id, position_title, department_id, department_name, tenure_years, tenure_months")
      .eq("id", b2Source.employee_id)
      .maybeSingle()
      .returns<Pick<EmployeeProfile, "id" | "identity_type" | "identity_number" | "join_date" | "work_location" | "position_id" | "position_title" | "department_id" | "department_name" | "tenure_years" | "tenure_months">>()
    : { data: null, error: null };

  if (d3EmployeeError) {
    console.error("Employee profile D3 extension query failed", {
      code: d3EmployeeError.code,
      message: d3EmployeeError.message,
    });
  }

  const employee: EmployeeProfile = {
    id: d3Employee?.id ?? b2Employee.id,
    b2_register_id: b2Employee.id,
    d3_employee_id: d3Employee?.id ?? null,
    employee_id: b2Employee.employee_id,
    full_name: b2Employee.full_name,
    email: b2Employee.email,
    phone: b2Employee.phone,
    identity_type: d3Employee?.identity_type ?? null,
    identity_number: d3Employee?.identity_number ?? null,
    join_date: d3Employee?.join_date ?? b2Employee.created_at.slice(0, 10),
    employment_status: b2Employee.employment_status?.toUpperCase() ?? null,
    work_location: d3Employee?.work_location ?? null,
    position_id: b2Employee.position_id ?? d3Employee?.position_id ?? null,
    position_title: d3Employee?.position_title ?? null,
    department_id: b2Employee.departement_id ?? d3Employee?.department_id ?? null,
    department_name: d3Employee?.department_name ?? null,
    tenure_years: d3Employee?.tenure_years ?? null,
    tenure_months: d3Employee?.tenure_months ?? null,
  };

  let isHiddenFromDirectory = false;
  if (canManageEmployees && employee.d3_employee_id) {
    const { data: visibility, error: visibilityError } = await supabase
      .from("d3_employee_directory_hidden")
      .select("employee_id")
      .eq("employee_id", employee.d3_employee_id ?? "")
      .maybeSingle();

    if (visibilityError) {
      logRelatedQueryError("d3_employee_directory_hidden", visibilityError);
    } else {
      isHiddenFromDirectory = Boolean(visibility);
    }
  }

  const d3EmployeeId = employee.d3_employee_id;
  const b2RegisterId = employee.b2_register_id;
  const [skillsResult, certificationsResult, attendancesResult, feedbackRewardsResult] = await Promise.all([
    d3EmployeeId
      ? supabase
      .from("d3_employee_skills")
      .select("competency_id, proficiency_level, evidence_notes, competencies:d3_competencies(name)")
      .eq("employee_id", d3EmployeeId)
      .returns<EmployeeSkill[]>()
      : Promise.resolve({ data: [] as EmployeeSkill[], error: null }),
    d3EmployeeId
      ? supabase
      .from("view_employee_certifications")
      .select("title, issuing_organization, issue_date, expiry_date, credential_id, status")
      .eq("employee_id", d3EmployeeId)
      .returns<EmployeeCertification[]>()
      : Promise.resolve({ data: [] as EmployeeCertification[], error: null }),
    b2RegisterId
      ? supabase
      .from("d3_attendances")
      .select("date, clock_in, clock_out, status, notes")
      .eq("b2_register_id", b2RegisterId)
      .order("date", { ascending: false })
      .returns<EmployeeAttendance[]>()
      : Promise.resolve({ data: [] as EmployeeAttendance[], error: null }),
    d3EmployeeId
      ? supabase
      .from("feedback_rewards")
      .select("type, category, title, message, points, created_at")
      .eq("receiver_id", d3EmployeeId)
      .order("created_at", { ascending: false })
      .returns<EmployeeFeedbackReward[]>()
      : Promise.resolve({ data: [] as EmployeeFeedbackReward[], error: null }),
  ]);

  if (skillsResult.error) logRelatedQueryError("d3_employee_skills", skillsResult.error);
  if (certificationsResult.error) logRelatedQueryError("view_employee_certifications", certificationsResult.error);
  if (attendancesResult.error) logRelatedQueryError("d3_attendances", attendancesResult.error);
  if (feedbackRewardsResult.error) logRelatedQueryError("feedback_rewards", feedbackRewardsResult.error);

  const skills = skillsResult.data ?? [];
  const certifications = certificationsResult.data ?? [];
  const attendances = attendancesResult.data ?? [];
  const feedbackRewards = feedbackRewardsResult.data ?? [];
  const tenure = formatTenure(employee.tenure_years, employee.tenure_months, employee.join_date, language);
  const attendanceSummary = attendances.reduce(
    (summary, attendance) => {
      const status = attendance.status?.toUpperCase() ?? "";
      if (status.includes("LATE") || status.includes("TERLAMBAT")) summary.late += 1;
      else if (status.includes("ABSENT") || status.includes("ALPHA")) summary.absent += 1;
      else if (status.includes("PRESENT") || status.includes("HADIR")) summary.present += 1;
      return summary;
    },
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <HrmsShell userEmail={user.email} userRole={userRole}>
      <section className="mx-auto max-w-[1240px] space-y-6 xl:space-y-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="text-sm font-semibold text-[#1E3765] transition hover:text-[#155DFC]" href="/employees">{copy.directory}</Link>
            <h1 className="mt-4 text-4xl font-extrabold tracking-[-0.04em] text-[#121B2E] sm:text-[42px]">{copy.profile}</h1>
          </div>
          {canManageEmployees && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Link className="inline-flex h-11 items-center justify-center rounded-[15px] border border-[#155DFC] bg-[#EEF4FF] px-5 text-sm font-bold text-[#155DFC] transition hover:bg-[#DCE8FF]" href={`/employees/${encodeURIComponent(employee.employee_id)}/edit`}>
                {copy.edit}
              </Link>
              <Link className="inline-flex h-11 items-center justify-center rounded-[15px] bg-[#155DFC] px-5 text-sm font-bold text-white shadow-[3px_3px_14px_rgba(87,138,252,0.4)] transition hover:bg-[#0D4FDB]" href={`/employees/${encodeURIComponent(employee.employee_id)}/status`}>
                {copy.status}
              </Link>
              {employee.d3_employee_id && <EmployeeDirectoryVisibilityButton employeeUuid={employee.d3_employee_id} initiallyHidden={isHiddenFromDirectory} />}
            </div>
          )}
        </div>

        <header className="rounded-[10px] border border-[rgba(87,138,252,0.3)] bg-white p-6 shadow-[3px_3px_20px_rgba(87,138,252,0.5)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
              <span className="flex size-[90px] shrink-0 items-center justify-center rounded-full bg-[#1E3765] text-3xl font-extrabold tracking-tight text-white shadow-[0_0_0_8px_rgba(87,138,252,0.16)]">{initials(employee.full_name)}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-3xl font-extrabold tracking-[-0.04em] text-[#121B2E] sm:text-[38px]">{employee.full_name}</h2>
                  <HrmsStatusPill value={employee.employment_status} />
                </div>
                <p className="mt-2 text-base font-medium text-[#1E3765]">{[employee.position_title, employee.department_name, employee.work_location].filter(Boolean).join(" · ") || copy.unavailable}</p>
                <p className="mt-3 text-sm font-semibold text-[#121B2E]">ID {employee.employee_id} <span className="px-1.5 text-[#577CFC]">·</span> {copy.joined} {formatDate(employee.join_date, language)} <span className="px-1.5 text-[#577CFC]">·</span> {copy.tenure} {tenure}</p>
                <p className="mt-4 flex max-w-2xl items-start gap-2 rounded-lg border border-[#D9E2FC] bg-[#F5F8FF] px-3 py-2 text-xs leading-5 text-[#1E3765]">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-[#155DFC]" aria-hidden="true" />
                  {copy.connected}
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-2 xl:gap-6">
          <ProfileSection title={copy.contact}>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
              <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/10 text-[#155DFC]"><Mail className="size-4" aria-hidden="true" /></span><div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Email</dt><dd className="mt-0.5 break-all text-sm font-semibold text-[#121B2E]">{displayValue(employee.email, language)}</dd></div></div>
              <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/10 text-[#155DFC]"><Phone className="size-4" aria-hidden="true" /></span><div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{copy.phone}</dt><dd className="mt-0.5 text-sm font-semibold text-[#121B2E]">{displayValue(employee.phone, language)}</dd></div></div>
              <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#155DFC]/10 text-[#155DFC]"><MapPin className="size-4" aria-hidden="true" /></span><div className="min-w-0"><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{copy.location}</dt><dd className="mt-0.5 text-sm font-semibold text-[#121B2E]">{displayValue(employee.work_location, language)}</dd></div></div>
              <div><dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{copy.identity}</dt><dd className="mt-0.5 text-sm font-semibold text-[#121B2E]">{[employee.identity_type, employee.identity_number].filter(Boolean).join(" · ") || copy.unavailable}</dd></div>
            </dl>
          </ProfileSection>

          <ProfileSection title={copy.skills}>
            {skills.length === 0 ? <EmptyState>{copy.noSkills}</EmptyState> : (
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span className="inline-flex max-w-full items-center rounded-full border border-[#577CFC]/45 bg-[#155DFC]/10 px-3 py-1.5 text-xs font-bold text-[#1E3765]" key={skill.competency_id} title={skill.evidence_notes || undefined}>
                    <span className="truncate">{displayValue(skill.competencies?.name ?? null, language)}</span>{skill.proficiency_level && <span className="ml-1.5 shrink-0 border-l border-[#577CFC]/40 pl-1.5 text-[10px] font-semibold text-[#577CFC]">{skill.proficiency_level}</span>}
                  </span>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection title={copy.certifications}>
            {certifications.length === 0 ? <EmptyState>{copy.noCertifications}</EmptyState> : (
              <div className="space-y-3">
                {certifications.map((certification, index) => (
                  <article className="flex flex-col gap-3 border-b border-[#D9E2FC] pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between" key={`${certification.credential_id ?? certification.title ?? "certification"}-${index}`}>
                    <div className="min-w-0"><h3 className="text-sm font-bold text-[#121B2E]">{displayValue(certification.title, language)}</h3><p className="mt-1 text-xs font-medium text-[#1E3765]">{displayValue(certification.issuing_organization, language)}</p><p className="mt-2 text-xs leading-5 text-slate-500">{copy.issued} {formatDate(certification.issue_date, language)} · {copy.expires} {formatDate(certification.expiry_date, language)}</p>{certification.credential_id && <p className="mt-1 text-[11px] text-slate-500">{copy.credential}: {certification.credential_id}</p>}</div>
                    <HrmsStatusPill value={certification.status} />
                  </article>
                ))}
              </div>
            )}
          </ProfileSection>

          <ProfileSection title={copy.attendance}>
            {attendances.length === 0 ? <EmptyState>{copy.noAttendance}</EmptyState> : (
              <><div className="grid grid-cols-3 gap-3 text-center"><div className="rounded-lg border border-emerald-500/20 bg-emerald-50/60 px-2 py-3"><p className="text-2xl font-extrabold text-emerald-700">{attendanceSummary.present}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{copy.present}</p></div><div className="rounded-lg border border-amber-500/20 bg-amber-50/60 px-2 py-3"><p className="text-2xl font-extrabold text-amber-700">{attendanceSummary.late}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">{copy.late}</p></div><div className="rounded-lg border border-rose-500/20 bg-rose-50/60 px-2 py-3"><p className="text-2xl font-extrabold text-rose-700">{attendanceSummary.absent}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-rose-700">{copy.absent}</p></div></div><div className="mt-5 space-y-2 border-t border-[#D9E2FC] pt-4">{attendances.map((attendance, index) => (<article className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#F5F8FF] px-3 py-2.5" key={`${attendance.date ?? "attendance"}-${index}`}><div><p className="text-xs font-bold text-[#121B2E]">{formatDate(attendance.date, language)}</p><p className="mt-0.5 text-[11px] text-slate-500">{formatTime(attendance.clock_in, language)} – {formatTime(attendance.clock_out, language)}{attendance.notes ? ` · ${attendance.notes}` : ""}</p></div><HrmsStatusPill value={attendance.status} /></article>))}</div></>
            )}
          </ProfileSection>

          <ProfileSection title={copy.feedback} className="lg:col-span-2">
            {feedbackRewards.length === 0 ? <EmptyState>{copy.noFeedback}</EmptyState> : (
              <div className="grid gap-3 sm:grid-cols-2">
                {feedbackRewards.map((feedbackReward, index) => (
                  <article className="rounded-lg border border-[#D9E2FC] bg-[#F5F8FF]/70 p-4" key={`${feedbackReward.created_at ?? "feedback"}-${index}`}><div className="flex items-start justify-between gap-3"><p className="text-sm font-bold text-[#121B2E]">{displayValue(feedbackReward.title, language)}</p><span className="shrink-0 rounded-full border border-[#577CFC]/35 bg-white px-2 py-1 text-[10px] font-bold text-[#1E3765]">{feedbackReward.points === null ? "—" : `${feedbackReward.points} pts`}</span></div><p className="mt-1 text-[11px] font-semibold text-[#577CFC]">{[feedbackReward.type, feedbackReward.category].filter(Boolean).join(" · ") || "Feedback"}</p>{feedbackReward.message && <p className="mt-2 text-sm leading-5 text-slate-600">{feedbackReward.message}</p>}</article>
                ))}
              </div>
            )}
          </ProfileSection>
        </div>
      </section>
    </HrmsShell>
  );
}
