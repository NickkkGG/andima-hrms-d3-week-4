"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/CustomButton";
import {
  employmentStatuses,
  type DepartmentOption,
  type EmploymentStatus,
  type PositionOption,
} from "@/types/employee";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface EmployeeCreateFormProps {
  departments: DepartmentOption[];
  positions: PositionOption[];
}

interface EmployeeCreateResult {
  employee_id: string;
}

interface EmployeeFormState {
  employeeId: string;
  fullName: string;
  email: string;
  phone: string;
  identityType: string;
  identityNumber: string;
  join_date: string;
  employmentStatus: EmploymentStatus | "";
  positionId: string;
  departmentId: string;
  workLocation: string;
}

const initialFormState: EmployeeFormState = {
  employeeId: "",
  fullName: "",
  email: "",
  phone: "",
  identityType: "",
  identityNumber: "",
  join_date: "",
  employmentStatus: "",
  positionId: "",
  departmentId: "",
  workLocation: "",
};

function fieldClassName(hasError: boolean) {
  return `mt-1 h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-[#172033] outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 ${
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-600"
      : "border-[#BCD4EE] focus:border-[#0C68D5] focus:ring-[#0C68D5]/10"
  }`;
}

export default function EmployeeCreateForm({ departments, positions }: EmployeeCreateFormProps) {
  const { language, t } = useLanguage();
  const copy = language === "id" ? { required: "wajib diisi", selectStatus: "Pilih status", selectDepartment: "Pilih departemen", selectPosition: "Pilih posisi", chooseDepartmentFirst: "Pilih departemen terlebih dahulu", title: "Tambah Pegawai Baru", description: "Lengkapi seluruh kolom wajib untuk membuat profil pegawai baru.", employeeName: "Nama pegawai", identity: "Informasi identitas", identityNumber: "Nomor identitas", phone: "Nomor telepon", joinDate: "Tanggal bergabung", employmentStatus: "Status kepegawaian", department: "Departemen", workLocation: "Lokasi kerja", position: "Posisi", save: "Simpan", cancel: "Batal", idRequired: "ID pegawai wajib diisi.", nameRequired: "Nama lengkap wajib diisi.", identityRequired: "Nomor identitas wajib diisi.", phoneRequired: "Nomor telepon wajib diisi.", emailRequired: "Email wajib diisi.", emailInvalid: "Format email tidak valid.", dateRequired: "Tanggal bergabung wajib diisi.", statusRequired: "Status kepegawaian wajib dipilih.", departmentRequired: "Departemen wajib dipilih.", positionRequired: "Posisi wajib dipilih.", locationRequired: "Lokasi kerja wajib diisi.", positionMismatch: "Posisi yang dipilih tidak sesuai dengan departemen.", duplicateId: "ID pegawai sudah digunakan. Gunakan ID lain.", duplicateEmail: "Email sudah digunakan.", duplicate: "ID pegawai atau email sudah digunakan.", unauthorized: "Anda tidak memiliki izin untuk menambahkan pegawai.", saveFailed: "Data pegawai belum dapat disimpan. Silakan coba lagi.", success: "Pegawai berhasil ditambahkan. Mengarahkan ke profil pegawai..." } : { required: "is required", selectStatus: "Select status", selectDepartment: "Select department", selectPosition: "Select position", chooseDepartmentFirst: "Select a department first", title: "Add a New Employee", description: "Fill in all required fields to create a new employee profile.", employeeName: "Employee name", identity: "Identity information", identityNumber: "Identity number", phone: "Phone number", joinDate: "Join date", employmentStatus: "Employment status", department: "Department", workLocation: "Work location", position: "Position", save: "Save", cancel: "Cancel", idRequired: "Employee ID is required.", nameRequired: "Full name is required.", identityRequired: "Identity number is required.", phoneRequired: "Phone number is required.", emailRequired: "Email is required.", emailInvalid: "Invalid email format.", dateRequired: "Join date is required.", statusRequired: "Employment status is required.", departmentRequired: "Department is required.", positionRequired: "Position is required.", locationRequired: "Work location is required.", positionMismatch: "The selected position does not belong to the selected department.", duplicateId: "Employee ID is already in use. Choose another ID.", duplicateEmail: "Email is already in use.", duplicate: "Employee ID or email is already in use.", unauthorized: "You do not have permission to add employees.", saveFailed: "Employee data could not be saved. Please try again.", success: "Employee added successfully. Redirecting to the employee profile..." };
  const [formData, setFormData] = useState<EmployeeFormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const availablePositions = useMemo(
    () => positions.filter((position) => position.department_id === formData.departmentId),
    [formData.departmentId, positions]
  );

  const updateField = <K extends keyof EmployeeFormState>(field: K, value: EmployeeFormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.employeeId.trim()) return copy.idRequired;
    if (!formData.fullName.trim()) return copy.nameRequired;
    if (!formData.identityNumber.trim()) return copy.identityRequired;
    if (!formData.phone.trim()) return copy.phoneRequired;
    if (!formData.email.trim()) return copy.emailRequired;
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return copy.emailInvalid;
    if (!formData.join_date) return copy.dateRequired;
    if (!formData.employmentStatus) return copy.statusRequired;
    if (!formData.departmentId) return copy.departmentRequired;
    if (!formData.positionId) return copy.positionRequired;
    if (!formData.workLocation.trim()) return copy.locationRequired;

    const position = positions.find((item) => item.id === formData.positionId);
    if (!position || position.department_id !== formData.departmentId) {
      return copy.positionMismatch;
    }

    return null;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const employeeId = formData.employeeId.trim();
      const { error } = await supabase
        .from("d3_employee")
        .insert({
          employee_id: employeeId,
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          identity_type: formData.identityType.trim() || null,
          identity_number: formData.identityNumber.trim() || null,
          join_date: formData.join_date,
          employment_status: formData.employmentStatus,
          position_id: formData.positionId,
          department_id: formData.departmentId,
          work_location: formData.workLocation.trim(),
        })
        .select("employee_id")
        .single()
        .returns<EmployeeCreateResult>();

      if (error) {
        const uniqueErrorSource = `${error.message} ${error.details ?? ""}`.toLowerCase();

        if (error.code === "23505" && uniqueErrorSource.includes("employee_id")) {
          setErrorMessage(copy.duplicateId);
        } else if (error.code === "23505" && uniqueErrorSource.includes("email")) {
          setErrorMessage(copy.duplicateEmail);
        } else if (error.code === "23505") {
          setErrorMessage(copy.duplicate);
        } else if (error.code === "42501") {
          setErrorMessage(copy.unauthorized);
        } else {
          setErrorMessage(copy.saveFailed);
        }

        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(copy.success);
      window.setTimeout(() => {
        router.replace(`/employees/${encodeURIComponent(employeeId)}`);
        router.refresh();
      }, 700);
    } catch {
      setErrorMessage(copy.saveFailed);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isSubmitting}>
        <section>
          <div className="border-b-2 border-[#1E3765]/70 pb-3">
            <h2 className="text-[30px] font-bold tracking-tight text-[#1E3765] sm:text-[38px]">{copy.title}</h2>
            <p className="text-sm font-semibold text-[#1E3765] sm:text-lg">{copy.description}</p>
          </div>
          <div className="mt-3 grid gap-x-5 gap-y-2 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#1E3765] md:col-span-2">Employee ID <span className="text-[#A70407]">*</span><input placeholder="e.g. EMP - XXX" className={fieldClassName(Boolean(errorMessage && !formData.employeeId.trim()))} value={formData.employeeId} onChange={(event) => updateField("employeeId", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#1E3765] md:col-span-2">{copy.employeeName} <span className="text-[#A70407]">*</span><input placeholder={copy.employeeName} className={fieldClassName(Boolean(errorMessage && !formData.fullName.trim()))} value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#1E3765] md:col-span-2">{copy.identity} <span className="text-[#A70407]">*</span><input placeholder={copy.identityNumber} className={fieldClassName(Boolean(errorMessage && !formData.identityNumber.trim()))} value={formData.identityNumber} onChange={(event) => updateField("identityNumber", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#1E3765]">{copy.phone} <span className="text-[#A70407]">*</span><input placeholder="xxxx-xxxx-xxxx" className={fieldClassName(Boolean(errorMessage && !formData.phone.trim()))} type="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#121B2E]">Email <span className="text-[#E5484D]">*</span><input className={fieldClassName(Boolean(errorMessage && !formData.email.trim()))} type="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.joinDate} <span className="text-[#E5484D]">*</span><input className={fieldClassName(Boolean(errorMessage && !formData.join_date))} type="date" name="join_date" value={formData.join_date} onChange={(event) => updateField("join_date", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.employmentStatus} <span className="text-[#E5484D]">*</span><select className={fieldClassName(Boolean(errorMessage && !formData.employmentStatus))} value={formData.employmentStatus} onChange={(event) => updateField("employmentStatus", event.target.value as EmploymentStatus | "")} required><option value="">{copy.selectStatus}</option>{employmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.department} <span className="text-[#E5484D]">*</span><select className={fieldClassName(Boolean(errorMessage && !formData.departmentId))} value={formData.departmentId} onChange={(event) => { const departmentId = event.target.value; setFormData((current) => ({ ...current, departmentId, positionId: current.positionId && positions.find((position) => position.id === current.positionId)?.department_id === departmentId ? current.positionId : "" })); }} required><option value="">{copy.selectDepartment}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}</select></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.workLocation} <span className="text-[#E5484D]">*</span><input className={fieldClassName(Boolean(errorMessage && !formData.workLocation.trim()))} value={formData.workLocation} onChange={(event) => updateField("workLocation", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#121B2E] md:col-span-2">{copy.position} <span className="text-[#E5484D]">*</span><select className={fieldClassName(Boolean(errorMessage && !formData.positionId))} value={formData.positionId} onChange={(event) => updateField("positionId", event.target.value)} disabled={!formData.departmentId} required><option value="">{formData.departmentId ? copy.selectPosition : copy.chooseDepartmentFirst}</option>{availablePositions.map((position) => <option key={position.id} value={position.id}>{position.title} ({position.code})</option>)}</select></label>
          </div>
        </section>
      </fieldset>

      {errorMessage && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
          {successMessage}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[#D9E2FC] pt-6 sm:flex-row sm:justify-end">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-xl border border-[#BCD4EE] bg-white px-5 text-sm font-bold text-[#0B2548] transition hover:border-[#0C68D5] hover:bg-[#EAF2FC]"
          href="/employees"
        >
          {copy.cancel}
        </Link>
        <CustomButton type="submit" fullWidth={false} disabled={isSubmitting}>
          {isSubmitting ? t("saving") : copy.save}
        </CustomButton>
      </div>
    </form>
  );
}
