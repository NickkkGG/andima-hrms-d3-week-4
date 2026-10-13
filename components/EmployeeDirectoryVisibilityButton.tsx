"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setEmployeeDirectoryVisibility } from "@/app/employees/actions";

interface EmployeeDirectoryVisibilityButtonProps {
  employeeUuid: string;
  initiallyHidden: boolean;
}

export default function EmployeeDirectoryVisibilityButton({
  employeeUuid,
  initiallyHidden,
}: EmployeeDirectoryVisibilityButtonProps) {
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(initiallyHidden);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setIsSubmitting(true);
    setMessage(null);

    const result = await setEmployeeDirectoryVisibility(employeeUuid, !isHidden);
    setIsSubmitting(false);
    setMessage(result.message);

    if (result.ok) {
      setIsHidden(!isHidden);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
      <button
        className={`inline-flex h-11 items-center justify-center rounded-[15px] border px-5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isHidden
            ? "border-[#16A37A] bg-[#ECFDF5] text-[#117A5A] hover:bg-[#DDF8EF]"
            : "border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
        }`}
        disabled={isSubmitting}
        onClick={handleClick}
        type="button"
      >
        {isSubmitting
          ? "Menyimpan…"
          : isHidden
            ? "Tampilkan di Employee Directory"
            : "Sembunyikan dari Employee Directory"}
      </button>
      {message && <p aria-live="polite" className={`max-w-72 text-right text-xs font-medium ${isHidden ? "text-[#117A5A]" : "text-rose-700"}`}>{message}</p>}
    </div>
  );
}
