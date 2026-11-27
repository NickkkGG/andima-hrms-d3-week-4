"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis } from "lucide-react";
import { setEmployeeDirectoryVisibility } from "@/app/employees/actions";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { buttonClass } from "@/components/ui/styles";

interface EmployeeDirectoryVisibilityButtonProps {
  employeeUuid: string;
  initiallyHidden: boolean;
}

export default function EmployeeDirectoryVisibilityButton({
  employeeUuid,
  initiallyHidden,
}: EmployeeDirectoryVisibilityButtonProps) {
  const { language, t } = useLanguage();
  const copy = language === "id" ? { restore: "menampilkan kembali pegawai di Direktori Pegawai", hide: "menyembunyikan pegawai dari Direktori Pegawai", confirm: "Yakin ingin", more: "Tindakan lainnya", show: "Tampilkan di Direktori Pegawai", hideButton: "Sembunyikan dari Direktori Pegawai" } : { restore: "restore this employee to the Employee Directory", hide: "hide this employee from the Employee Directory", confirm: "Are you sure you want to", more: "More actions", show: "Show in Employee Directory", hideButton: "Hide from Employee Directory" };
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(initiallyHidden);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    const action = isHidden ? copy.restore : copy.hide;
    if (!window.confirm(`${copy.confirm} ${action}?`)) return;
    setIsSubmitting(true);
    setMessage(null);

    const result = await setEmployeeDirectoryVisibility(employeeUuid, !isHidden);
    setIsSubmitting(false);
    setMessage(result.message[language]);

    if (result.ok) {
      setIsHidden(!isHidden);
      router.refresh();
    }
  }

  return (
    <details className="relative flex flex-col items-stretch gap-1.5 sm:items-end">
      <summary className={buttonClass("secondary", "md", "list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3B6FF5]/40")}><Ellipsis className="size-4" aria-hidden="true" />{copy.more}</summary>
      <div className="absolute right-0 top-11 z-10 min-w-64 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
        <button
        className={
          isHidden
            ? "inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-xs transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            : buttonClass("dangerOutline", "md", "w-full")
        }
        disabled={isSubmitting}
        onClick={handleClick}
        type="button"
      >
        {isSubmitting
          ? t("saving")
          : isHidden
            ? copy.show
            : copy.hideButton}
      </button>
      </div>
      {message && <p aria-live="polite" className={`max-w-72 text-right text-xs font-medium ${isHidden ? "text-emerald-700" : "text-red-700"}`}>{message}</p>}
    </details>
  );
}
