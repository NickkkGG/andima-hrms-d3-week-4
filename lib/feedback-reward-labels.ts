import type { SupportedLanguage } from "@/lib/i18n";

// Display names for the Feedback & Reward enum values stored in the database
// (feedback type, category, reward type, visibility, audit module and action).
// The create wizard uses the same wording.
const labels: Record<string, Record<SupportedLanguage, string>> = {
  APPRECIATION: { id: "Apresiasi", en: "Appreciation" },
  IMPROVEMENT: { id: "Coaching / Perbaikan", en: "Coaching / Improvement" },
  PERFORMANCE_NOTE: { id: "Catatan kinerja", en: "Performance note" },
  DISCIPLINE: { id: "Disiplin", en: "Discipline" },
  TEAMWORK: { id: "Kerja sama", en: "Teamwork" },
  COMMUNICATION: { id: "Komunikasi", en: "Communication" },
  WORKPLACE_SAFETY: { id: "Keselamatan kerja", en: "Workplace safety" },
  QUALITY: { id: "Kualitas kerja", en: "Work quality" },
  SERVICE: { id: "Pelayanan", en: "Service" },
  OTHER: { id: "Lainnya", en: "Other" },
  EMPLOYEE_OF_THE_MONTH: { id: "Karyawan teladan", en: "Employee of the month" },
  SAFETY_CHAMPION: { id: "Safety Champion", en: "Safety Champion" },
  SERVICE_EXCELLENCE: { id: "Service Excellence", en: "Service Excellence" },
  BEST_ATTENDANCE: { id: "Kehadiran terbaik", en: "Best attendance" },
  SPECIAL_CONTRIBUTION: { id: "Kontribusi khusus", en: "Special contribution" },
  PRIVATE: { id: "Privat", en: "Private" },
  PUBLIC: { id: "Publik", en: "Public" },
  FEEDBACK: { id: "Feedback", en: "Feedback" },
  REWARD: { id: "Reward", en: "Reward" },
  CREATE: { id: "Dibuat", en: "Created" },
  UPDATE: { id: "Diperbarui", en: "Updated" },
  STATUS_CHANGE: { id: "Status diubah", en: "Status changed" },
  SUBMIT: { id: "Diajukan", en: "Submitted" },
  APPROVE: { id: "Disetujui", en: "Approved" },
  REJECT: { id: "Ditolak", en: "Rejected" },
  PUBLISH: { id: "Dipublikasikan", en: "Published" },
};

export function feedbackRewardLabel(value: string, language: SupportedLanguage) {
  return labels[value]?.[language] ?? value.replaceAll("_", " ");
}
