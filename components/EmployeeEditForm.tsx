"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/CustomButton";
import type { DepartmentOption, EmployeeProfile, PositionOption } from "@/types/employee";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface EmployeeEditFormProps {
  employee: EmployeeProfile;
  departments: DepartmentOption[];
  positions: PositionOption[];
}

interface EmployeeEditFormState {
  fullName: string;
  email: string;
  phone: string;
  positionId: string;
  departmentId: string;
  workLocation: string;
}

interface EmployeeUpdateResult {
  employee_id: string;
}

function fieldClassName(hasError: boolean) {
  return `mt-2 h-11 w-full rounded-xl border bg-white px-3.5 text-sm font-medium text-[#172033] outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${
    hasError
      ? "border-red-500 focus:border-red-600 focus:ring-red-600"
      : "border-[#BCD4EE] focus:border-[#0C68D5] focus:ring-[#0C68D5]/10"
  }`;
}

export default function EmployeeEditForm({ employee, departments, positions }: EmployeeEditFormProps) {
  const { language, t } = useLanguage();
  const copy = language === "id" ? { basic: "Data dasar", basicDescription: "Data identitas dan kontak pegawai.", name: "Nama pegawai", fromB2: "Data dari registrasi B2, tidak dapat diubah.", phone: "Nomor telepon", joinDate: "Tanggal bergabung", work: "Informasi pekerjaan", workDescription: "Departemen dan posisi mengikuti master data yang tersedia.", department: "Departemen", position: "Posisi", location: "Lokasi kerja", selectDepartment: "Pilih departemen", selectPosition: "Pilih posisi", chooseDepartment: "Pilih departemen terlebih dahulu", cancel: "Batal", saveChanges: "Simpan perubahan", unsaved: "Perubahan yang belum disimpan akan hilang. Lanjutkan?", nameRequired: "Nama lengkap wajib diisi.", emailRequired: "Email wajib diisi.", emailInvalid: "Format email tidak valid.", departmentRequired: "Departemen wajib dipilih.", positionRequired: "Posisi wajib dipilih.", locationRequired: "Lokasi kerja wajib diisi.", mismatch: "Posisi yang dipilih tidak sesuai dengan departemen.", unauthorized: "Anda tidak memiliki izin untuk mengubah data pegawai.", duplicateEmail: "Email sudah digunakan.", updateFailed: "Profil pegawai belum dapat diperbarui. Silakan coba lagi.", success: "Profil pegawai berhasil diperbarui. Mengarahkan ke profil pegawai..." } : { basic: "Basic information", basicDescription: "Employee identity and contact data.", name: "Employee name", fromB2: "Data from B2 registration cannot be changed.", phone: "Phone number", joinDate: "Join date", work: "Work information", workDescription: "Department and position follow the available master data.", department: "Department", position: "Position", location: "Work location", selectDepartment: "Select department", selectPosition: "Select position", chooseDepartment: "Select a department first", cancel: "Cancel", saveChanges: "Save changes", unsaved: "Your unsaved changes will be lost. Continue?", nameRequired: "Full name is required.", emailRequired: "Email is required.", emailInvalid: "Invalid email format.", departmentRequired: "Department is required.", positionRequired: "Position is required.", locationRequired: "Work location is required.", mismatch: "The selected position does not belong to the selected department.", unauthorized: "You do not have permission to edit employee data.", duplicateEmail: "Email is already in use.", updateFailed: "Employee profile could not be updated. Please try again.", success: "Employee profile updated successfully. Redirecting to the employee profile..." };
  const [formData, setFormData] = useState<EmployeeEditFormState>({
    fullName: employee.full_name ?? "",
    email: employee.email ?? "",
    phone: employee.phone ?? "",
    positionId: employee.position_id ?? "",
    departmentId: employee.department_id ?? "",
    workLocation: employee.work_location ?? "",
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const profileUrl = `/employees/${encodeURIComponent(employee.employee_id)}`;
  const isDirty = formData.fullName !== (employee.full_name ?? "") || formData.email !== (employee.email ?? "") || formData.phone !== (employee.phone ?? "") || formData.positionId !== (employee.position_id ?? "") || formData.departmentId !== (employee.department_id ?? "") || formData.workLocation !== (employee.work_location ?? "");

  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const availablePositions = useMemo(
    () => positions.filter((position) => position.department_id === formData.departmentId),
    [formData.departmentId, positions]
  );

  const updateField = <K extends keyof EmployeeEditFormState>(field: K, value: EmployeeEditFormState[K]) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return copy.nameRequired;
    if (!formData.email.trim()) return copy.emailRequired;
    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) return copy.emailInvalid;
    if (!formData.departmentId) return copy.departmentRequired;
    if (!formData.positionId) return copy.positionRequired;
    if (!formData.workLocation.trim()) return copy.locationRequired;

    const position = positions.find((item) => item.id === formData.positionId);
    if (!position || position.department_id !== formData.departmentId) {
      return copy.mismatch;
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
      const { data, error } = await supabase
        .from("d3_employee")
        .update({
          full_name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          position_id: formData.positionId,
          department_id: formData.departmentId,
          work_location: formData.workLocation.trim(),
        })
        .eq("id", employee.id)
        .select("employee_id")
        .maybeSingle()
        .returns<EmployeeUpdateResult>();

      if (error) {
        if (error.code === "42501") {
          setErrorMessage(copy.unauthorized);
        } else if (error.code === "23505") {
          setErrorMessage(copy.duplicateEmail);
        } else {
          setErrorMessage(copy.updateFailed);
        }

        setIsSubmitting(false);
        return;
      }

      if (!data) {
        setErrorMessage(copy.unauthorized);
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(copy.success);
      window.setTimeout(() => {
        router.replace(`/employees/${encodeURIComponent(data.employee_id)}`);
        router.refresh();
      }, 500);
    } catch {
      setErrorMessage(copy.updateFailed);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <fieldset disabled={isSubmitting}>
        <section className="rounded-2xl border border-[#BCD4EE] bg-white p-5 shadow-[0_8px_24px_rgba(31,77,130,0.08)] sm:p-7">
          <div className="flex flex-col gap-1 border-b border-[#D9E2FC] pb-5"><h2 className="text-xl font-extrabold tracking-tight text-[#121B2E]">{copy.basic}</h2><p className="text-sm text-slate-500">{copy.basicDescription}</p></div>
          <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#121B2E]">{copy.name} <span className="text-[#E5484D]">*</span><input className={fieldClassName(Boolean(errorMessage && !formData.fullName.trim()))} value={formData.fullName} onChange={(event) => updateField("fullName", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#121B2E]">Employee ID<input className={fieldClassName(false)} value={employee.employee_id} disabled /><span className="mt-1 block text-xs font-normal text-slate-500">{copy.fromB2}</span></label>
            <label className="text-sm font-semibold text-[#121B2E]">Email <span className="text-[#E5484D]">*</span><input className={fieldClassName(Boolean(errorMessage && !formData.email.trim()))} type="email" value={formData.email} onChange={(event) => updateField("email", event.target.value)} required /></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.phone}<input className={fieldClassName(false)} type="tel" value={formData.phone} onChange={(event) => updateField("phone", event.target.value)} /></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.joinDate}<input className={fieldClassName(false)} type="date" value={employee.join_date?.slice(0, 10) ?? ""} disabled /><span className="mt-1 block text-xs font-normal text-slate-500">{copy.fromB2}</span></label>
          </div>
        </section>
        <section className="mt-6 rounded-2xl border border-[#BCD4EE] bg-white p-5 shadow-[0_8px_24px_rgba(31,77,130,0.08)] sm:p-7">
          <div className="flex flex-col gap-1 border-b border-[#D9E2FC] pb-5"><h2 className="text-xl font-extrabold tracking-tight text-[#121B2E]">{copy.work}</h2><p className="text-sm text-slate-500">{copy.workDescription}</p></div>
          <div className="mt-6 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <label className="text-sm font-semibold text-[#121B2E]">{copy.department} <span className="text-[#E5484D]">*</span><select className={fieldClassName(Boolean(errorMessage && !formData.departmentId))} value={formData.departmentId} onChange={(event) => { const departmentId = event.target.value; setFormData((current) => ({ ...current, departmentId, positionId: current.positionId && positions.find((position) => position.id === current.positionId)?.department_id === departmentId ? current.positionId : "" })); }} required><option value="">{copy.selectDepartment}</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.name} ({department.code})</option>)}</select></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.position} <span className="text-[#E5484D]">*</span><select className={fieldClassName(Boolean(errorMessage && !formData.positionId))} value={formData.positionId} onChange={(event) => updateField("positionId", event.target.value)} disabled={!formData.departmentId} required><option value="">{formData.departmentId ? copy.selectPosition : copy.chooseDepartment}</option>{availablePositions.map((position) => <option key={position.id} value={position.id}>{position.title} ({position.code})</option>)}</select></label>
            <label className="text-sm font-semibold text-[#121B2E]">{copy.location} <span className="text-[#E5484D]">*</span><input className={fieldClassName(Boolean(errorMessage && !formData.workLocation.trim()))} value={formData.workLocation} onChange={(event) => updateField("workLocation", event.target.value)} required /></label>
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

      <div className="sticky bottom-0 z-10 flex flex-col-reverse gap-3 border-t border-[#D9E2FC] bg-[#F7F9FC]/95 py-4 backdrop-blur sm:flex-row sm:justify-end">
        <Link
          className="inline-flex h-11 items-center justify-center rounded-[15px] border border-[#155DFC] bg-[#EEF4FF] px-5 text-sm font-bold text-[#155DFC] transition hover:bg-[#DCE8FF]"
          href={profileUrl}
          onClick={(event) => { if (isDirty && !window.confirm(copy.unsaved)) event.preventDefault(); }}
        >
          {copy.cancel}
        </Link>
        <CustomButton type="submit" fullWidth={false} disabled={isSubmitting}>
          {isSubmitting ? t("saving") : copy.saveChanges}
        </CustomButton>
      </div>
    </form>
  );
}
