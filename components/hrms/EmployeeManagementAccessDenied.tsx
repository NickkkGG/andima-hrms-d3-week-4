"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

interface EmployeeManagementAccessDeniedProps {
  title: string;
}

export default function EmployeeManagementAccessDenied({ title }: EmployeeManagementAccessDeniedProps) {
  const { language } = useLanguage();
  const copy = language === "id" ? { message: "Anda tidak memiliki izin untuk melakukan perubahan pada data pegawai.", directory: "← Direktori pegawai" } : { message: "You do not have permission to make changes to employee data.", directory: "← Employee directory" };
  return (
    <section className="mx-auto max-w-3xl rounded-xl border border-[#D9E2FC] bg-white p-6 shadow-[0_4px_16px_rgba(15,35,66,0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF4FF] text-[#155DFC]">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-[#121B2E]">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copy.message}
          </p>
          <Link className="mt-4 inline-flex text-sm font-bold text-[#155DFC] hover:text-[#0D4FDB]" href="/employees">
            {copy.directory}
          </Link>
        </div>
      </div>
    </section>
  );
}
