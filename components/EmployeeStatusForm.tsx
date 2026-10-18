"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import CustomButton from "@/components/CustomButton";
import HrmsStatusPill from "@/components/hrms/HrmsStatusPill";
import { updateEmployeeEmploymentStatus } from "@/app/employees/actions";
import { employmentStatuses, type EmploymentStatus } from "@/types/employee";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface EmployeeStatusFormProps {
  employee: {
    id: string;
    b2_register_id: string;
    employee_id: string;
    full_name: string;
    employment_status: string | null;
  };
}

function isEmploymentStatus(value: string | null): value is EmploymentStatus {
  return employmentStatuses.includes(value as EmploymentStatus);
}

export default function EmployeeStatusForm({ employee }: EmployeeStatusFormProps) {
  const { language, t } = useLanguage();
  const copy = language === "id" ? { title: "Ubah status kepegawaian", name: "Nama pegawai", current: "Status saat ini", new: "Status baru", select: "Pilih status kepegawaian", unchanged: "Status belum berubah.", finalized: "Status RESIGNED atau TERMINATED bersifat final dan tidak dapat diubah kembali.", invalid: "Status kepegawaian tidak valid.", updateFailed: "Status kepegawaian belum dapat diperbarui. Silakan coba lagi.", redirect: "Mengarahkan ke profil pegawai...", cancel: "Batal", save: "Simpan status" } : { title: "Change employment status", name: "Employee name", current: "Current status", new: "New status", select: "Select employment status", unchanged: "Status has not changed.", finalized: "RESIGNED and TERMINATED are final statuses and cannot be changed.", invalid: "Invalid employment status.", updateFailed: "Employment status could not be updated. Please try again.", redirect: "Redirecting to the employee profile...", cancel: "Cancel", save: "Save status" };
  const currentStatus = isEmploymentStatus(employee.employment_status) ? employee.employment_status : "";
  const [selectedStatus, setSelectedStatus] = useState<EmploymentStatus | "">(currentStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const profileUrl = `/employees/${encodeURIComponent(employee.employee_id)}`;
  const isFinalStatus = currentStatus === "RESIGNED" || currentStatus === "TERMINATED";
  const selectableStatuses = isFinalStatus
    ? [currentStatus]
    : currentStatus === "PERMANENT"
    ? employmentStatuses.filter((status) => status === "PERMANENT" || status === "RESIGNED" || status === "TERMINATED")
    : employmentStatuses;
  const isUnchanged = selectedStatus === currentStatus;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (isFinalStatus) {
      setErrorMessage(copy.finalized);
      return;
    }

    if (!isEmploymentStatus(selectedStatus)) {
      setErrorMessage(copy.invalid);
      return;
    }

    if (selectedStatus === employee.employment_status) {
      setSuccessMessage(copy.unchanged);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateEmployeeEmploymentStatus(employee.b2_register_id, selectedStatus);
      if (!result.ok || !result.employeeId) {
        setErrorMessage(result.message);
        setIsSubmitting(false);
        return;
      }

      const updatedEmployeeId = result.employeeId;
      setSuccessMessage(`${result.message} ${copy.redirect}`);
      window.setTimeout(() => {
        router.replace(`/employees/${encodeURIComponent(updatedEmployeeId)}`);
        router.refresh();
      }, 500);
    } catch {
      setErrorMessage(copy.updateFailed);
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      <section className="rounded-2xl border border-[#BCD4EE] bg-white p-5 shadow-[0_8px_24px_rgba(31,77,130,0.08)] sm:p-7">
        <h2 className="text-xl font-extrabold tracking-tight text-[#121B2E]">{copy.title}</h2>
        <dl className="mt-5 grid gap-4 rounded-xl border border-[#DCE7F3] bg-[#F8FBFF] p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">Employee ID</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{employee.employee_id}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.name}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{employee.full_name}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{copy.current}</dt>
            <dd className="mt-1"><HrmsStatusPill value={employee.employment_status} /></dd>
          </div>
        </dl>

        <label className="mt-6 block text-sm font-semibold text-[#121B2E]">
          {copy.new} <span className="text-[#E5484D]">*</span>
          <select
            className={`mt-2 h-11 w-full rounded-[15px] border bg-[#155DFC]/10 px-3.5 text-sm font-medium text-[#121B2E] outline-none transition focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-500 ${
              errorMessage ? "border-red-500 focus:border-red-600 focus:ring-red-600" : "border-[#D9E2FC] focus:border-[#1E3765] focus:ring-[#1E3765]"
            }`}
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as EmploymentStatus | "")}
            disabled={isSubmitting || isFinalStatus}
            required
          >
            <option value="">{copy.select}</option>
            {selectableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          {isFinalStatus
            ? <p className="mt-2 text-xs font-medium text-amber-700">{copy.finalized}</p>
            : isUnchanged && <p className="mt-2 text-xs font-medium text-slate-500">{copy.unchanged}</p>}
        </label>
      </section>

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
          className="inline-flex h-11 items-center justify-center rounded-[15px] border border-[#155DFC] bg-[#EEF4FF] px-5 text-sm font-bold text-[#155DFC] transition hover:bg-[#DCE8FF]"
          href={profileUrl}
        >
          {copy.cancel}
        </Link>
        <CustomButton type="submit" fullWidth={false} disabled={isSubmitting || isUnchanged || isFinalStatus}>
          {isSubmitting ? t("saving") : copy.save}
        </CustomButton>
      </div>
    </form>
  );
}
