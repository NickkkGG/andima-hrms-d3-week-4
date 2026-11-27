"use client";

import { ShieldAlert } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import BackLink from "@/components/ui/BackLink";
import { cardClass } from "@/components/ui/styles";

interface EmployeeManagementAccessDeniedProps {
  title: React.ReactNode;
}

export default function EmployeeManagementAccessDenied({ title }: EmployeeManagementAccessDeniedProps) {
  const { language } = useLanguage();
  const copy = language === "id" ? { message: "Anda tidak memiliki izin untuk melakukan perubahan pada data pegawai.", directory: "Kembali ke direktori pegawai" } : { message: "You do not have permission to make changes to employee data.", directory: "Back to employee directory" };
  return (
    <section className={`mx-auto max-w-3xl p-6 ${cardClass}`}>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <ShieldAlert className="size-5" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {copy.message}
          </p>
          <BackLink className="mt-4" href="/employees">
            {copy.directory}
          </BackLink>
        </div>
      </div>
    </section>
  );
}
