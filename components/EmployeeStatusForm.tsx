"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import HrmsStatusPill, { hrmsStatusLabel } from "@/components/hrms/HrmsStatusPill";
import { updateEmployeeEmploymentStatus } from "@/app/employees/actions";
import { employmentStatuses, type EmploymentStatus } from "@/types/employee";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { buttonClass, cardClass, inputClass, labelClass } from "@/components/ui/styles";

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
        setErrorMessage(result.message[language]);
        setIsSubmitting(false);
        return;
      }

      const updatedEmployeeId = result.employeeId;
      setSuccessMessage(`${result.message[language]} ${copy.redirect}`);
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
      <section className={`p-5 sm:p-6 ${cardClass}`}>
        <h2 className="text-base font-bold text-slate-900">{copy.title}</h2>
        <dl className="mt-5 grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{language === "id" ? "ID Pegawai" : "Employee ID"}</dt>
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

        <label className="mt-6 block">
          <span className={labelClass}>{copy.new} <span className="text-red-600">*</span></span>
          <select
            className={inputClass(errorMessage ? "border-red-500! focus:border-red-600! focus:ring-red-100!" : "")}
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value as EmploymentStatus | "")}
            disabled={isSubmitting || isFinalStatus}
            required
          >
            <option value="">{copy.select}</option>
            {selectableStatuses.map((status) => (
              <option key={status} value={status}>
                {hrmsStatusLabel(status, language)}
              </option>
            ))}
          </select>
          {isFinalStatus
            ? <p className="mt-2 text-xs font-medium text-amber-700">{copy.finalized}</p>
            : isUnchanged && <p className="mt-2 text-xs font-medium text-slate-500">{copy.unchanged}</p>}
        </label>
      </section>

      {errorMessage && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700" role="status">
          {successMessage}
        </p>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
        <Link
          className={buttonClass("secondary")}
          href={profileUrl}
        >
          {copy.cancel}
        </Link>
        <button className={buttonClass("primary")} type="submit" disabled={isSubmitting || isUnchanged || isFinalStatus}>
          {isSubmitting ? t("saving") : copy.save}
        </button>
      </div>
    </form>
  );
}
