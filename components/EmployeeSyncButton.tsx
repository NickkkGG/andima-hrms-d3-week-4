"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncEmployeesFromB2, type EmployeeSyncResult } from "@/app/employees/actions";

export default function EmployeeSyncButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<EmployeeSyncResult | null>(null);
  const router = useRouter();

  const syncEmployees = () => {
    setResult(null);
    startTransition(async () => {
      const nextResult = await syncEmployeesFromB2();
      setResult(nextResult);
      if (nextResult.inserted > 0 || nextResult.updated > 0) {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <button
        className="inline-flex h-9 items-center justify-center rounded-md bg-[#155DFC] px-3 text-xs font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition hover:bg-[#0D4FDB] disabled:cursor-not-allowed disabled:bg-[#9BB8FC]"
        type="button"
        onClick={syncEmployees}
        disabled={isPending}
      >
        {isPending ? "Menyinkronkan..." : "Sinkronkan Pegawai dari B2"}
      </button>
      {result && (
        <p
          className={`max-w-xs text-right text-[11px] font-medium ${
            result.ok ? "text-emerald-700" : "text-amber-700"
          }`}
          role="status"
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
