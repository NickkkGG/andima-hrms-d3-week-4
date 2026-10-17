"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface HrmsStatusPillProps {
  value: string | null;
}

function statusClass(value: string) {
  const normalized = value.toUpperCase();

  if (["PERMANENT", "VALID", "PRESENT"].includes(normalized)) return "border-emerald-600/45 bg-emerald-50/40 text-emerald-700";
  if (["CONTRACT", "PROBATION", "INTERN", "EXPIRING", "LATE"].includes(normalized)) return "border-amber-600/45 bg-amber-50/40 text-amber-700";
  if (["RESIGNED", "TERMINATED", "EXPIRED", "ABSENT"].includes(normalized)) return "border-rose-600/45 bg-rose-50/40 text-rose-700";

  return "border-slate-500/30 bg-slate-50 text-slate-700";
}

export default function HrmsStatusPill({ value }: HrmsStatusPillProps) {
  const { language } = useLanguage();
  const fallback = language === "id" ? "Belum tersedia" : "Not available";
  const labels = language === "id"
    ? { PERMANENT: "Tetap", CONTRACT: "Kontrak", PROBATION: "Masa percobaan", INTERN: "Magang", RESIGNED: "Mengundurkan diri", TERMINATED: "Diberhentikan", VALID: "Valid", PRESENT: "Hadir", LATE: "Terlambat", ABSENT: "Tidak hadir", EXPIRING: "Akan berakhir", EXPIRED: "Kedaluwarsa" }
    : { PERMANENT: "Permanent", CONTRACT: "Contract", PROBATION: "Probation", INTERN: "Intern", RESIGNED: "Resigned", TERMINATED: "Terminated", VALID: "Valid", PRESENT: "Present", LATE: "Late", ABSENT: "Absent", EXPIRING: "Expiring", EXPIRED: "Expired" };
  const normalized = value?.toUpperCase() ?? "";
  const label = labels[normalized as keyof typeof labels] ?? value ?? fallback;

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] ${statusClass(label)}`}>{label}</span>;
}
