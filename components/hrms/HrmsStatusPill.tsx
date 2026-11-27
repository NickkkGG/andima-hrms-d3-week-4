"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { badgeClass, type BadgeTone } from "@/components/ui/styles";

interface HrmsStatusPillProps {
  value: string | null;
}

const statusLabels = {
  id: { PERMANENT: "Tetap", CONTRACT: "Kontrak", PROBATION: "Masa percobaan", INTERN: "Magang", RESIGNED: "Mengundurkan diri", TERMINATED: "Diberhentikan", VALID: "Valid", PRESENT: "Hadir", LATE: "Terlambat", ABSENT: "Tidak hadir", EXPIRING: "Akan berakhir", EXPIRED: "Kedaluwarsa" },
  en: { PERMANENT: "Permanent", CONTRACT: "Contract", PROBATION: "Probation", INTERN: "Intern", RESIGNED: "Resigned", TERMINATED: "Terminated", VALID: "Valid", PRESENT: "Present", LATE: "Late", ABSENT: "Absent", EXPIRING: "Expiring", EXPIRED: "Expired" },
} as const;

/** Display name of an employment / certification / attendance status in the active language. */
export function hrmsStatusLabel(value: string, language: "id" | "en") {
  const normalized = value.toUpperCase();
  return statusLabels[language][normalized as keyof (typeof statusLabels)["id"]] ?? value.replaceAll("_", " ");
}

// Colour follows the stored status, not the translated label, so it is the
// same in both languages.
function statusTone(value: string): BadgeTone {
  const normalized = value.toUpperCase();

  if (["PERMANENT", "VALID", "PRESENT"].includes(normalized)) return "green";
  if (["CONTRACT", "PROBATION", "INTERN", "EXPIRING", "LATE"].includes(normalized)) return "amber";
  if (["RESIGNED", "TERMINATED", "EXPIRED", "ABSENT"].includes(normalized)) return "red";

  return "slate";
}

export default function HrmsStatusPill({ value }: HrmsStatusPillProps) {
  const { language } = useLanguage();
  const label = value ? hrmsStatusLabel(value, language) : language === "id" ? "Belum tersedia" : "Not available";

  return <span className={badgeClass(statusTone(value ?? ""))}>{label}</span>;
}
