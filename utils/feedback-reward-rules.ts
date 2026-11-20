// Shared Feedback & Reward rules for the form (client) and the server actions.
// The matching CHECK constraints live in
// supabase/migrations/20261120090000_d3_input_length_guards.sql.

export const FEEDBACK_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  contentMin: 10,
  contentMax: 2000,
  followUpMax: 1000,
  progressNoteMax: 1000,
  approvalReasonMin: 5,
  approvalReasonMax: 500,
  maxPastDays: 365,
  maxFutureDays: 365,
} as const;

export const FEEDBACK_TYPES = ["APPRECIATION", "IMPROVEMENT", "PERFORMANCE_NOTE"] as const;
export const FEEDBACK_CATEGORIES = ["DISCIPLINE", "TEAMWORK", "COMMUNICATION", "WORKPLACE_SAFETY", "QUALITY", "SERVICE", "OTHER"] as const;
export const REWARD_TYPES = ["EMPLOYEE_OF_THE_MONTH", "SAFETY_CHAMPION", "SERVICE_EXCELLENCE", "BEST_ATTENDANCE", "SPECIAL_CONTRIBUTION", "OTHER"] as const;

export type FeedbackActionCode =
  | "forbidden"
  | "invalid_input"
  | "invalid_employee"
  | "self_record"
  | "invalid_date"
  | "invalid_title"
  | "invalid_content"
  | "invalid_follow_up"
  | "invalid_target_date"
  | "invalid_status"
  | "invalid_note"
  | "invalid_reason"
  | "invalid_transition"
  | "not_found"
  | "save_failed";

// Messages for the detail pages. They are looked up by code, so a crafted URL
// can only ever show one of these texts, never arbitrary text.
export const feedbackActionMessages: Record<"id" | "en", Record<FeedbackActionCode | "saved", string>> = {
  id: {
    saved: "Perubahan tersimpan.",
    forbidden: "Akses ditolak. Akun Anda tidak memiliki izin untuk tindakan ini.",
    invalid_input: "Isian tidak valid atau melebihi batas yang diizinkan.",
    invalid_employee: "Pilih pegawai dari daftar.",
    self_record: "Anda tidak dapat memproses data untuk diri sendiri.",
    invalid_date: "Tanggal tidak valid.",
    invalid_title: `Judul harus ${FEEDBACK_LIMITS.titleMin}–${FEEDBACK_LIMITS.titleMax} karakter.`,
    invalid_content: `Isi harus ${FEEDBACK_LIMITS.contentMin}–${FEEDBACK_LIMITS.contentMax} karakter.`,
    invalid_follow_up: `Tindak lanjut maksimal ${FEEDBACK_LIMITS.followUpMax} karakter.`,
    invalid_target_date: "Target tanggal tidak valid.",
    invalid_status: "Status tidak valid.",
    invalid_note: `Catatan progres maksimal ${FEEDBACK_LIMITS.progressNoteMax} karakter.`,
    invalid_reason: `Alasan keputusan harus ${FEEDBACK_LIMITS.approvalReasonMin}–${FEEDBACK_LIMITS.approvalReasonMax} karakter.`,
    invalid_transition: "Perubahan status ini tidak sesuai urutan yang diizinkan.",
    not_found: "Data tidak ditemukan atau tidak dapat diakses.",
    save_failed: "Data belum dapat disimpan. Coba lagi.",
  },
  en: {
    saved: "Changes saved.",
    forbidden: "Access denied. Your account is not allowed to do this.",
    invalid_input: "The input is invalid or exceeds the allowed limit.",
    invalid_employee: "Choose an employee from the list.",
    self_record: "You cannot process a record for yourself.",
    invalid_date: "The date is invalid.",
    invalid_title: `The title must be ${FEEDBACK_LIMITS.titleMin}–${FEEDBACK_LIMITS.titleMax} characters.`,
    invalid_content: `The details must be ${FEEDBACK_LIMITS.contentMin}–${FEEDBACK_LIMITS.contentMax} characters.`,
    invalid_follow_up: `The follow-up can be at most ${FEEDBACK_LIMITS.followUpMax} characters.`,
    invalid_target_date: "The target date is invalid.",
    invalid_status: "The status is invalid.",
    invalid_note: `The progress note can be at most ${FEEDBACK_LIMITS.progressNoteMax} characters.`,
    invalid_reason: `The decision reason must be ${FEEDBACK_LIMITS.approvalReasonMin}–${FEEDBACK_LIMITS.approvalReasonMax} characters.`,
    invalid_transition: "This status change is not allowed in the current order.",
    not_found: "The record was not found or is not accessible.",
    save_failed: "The data could not be saved. Please try again.",
  },
};

export function feedbackActionNotice(language: "id" | "en", code: string | undefined) {
  if (!code) return null;
  const messages = feedbackActionMessages[language];
  const text = (messages as Record<string, string>)[code] ?? messages.save_failed;
  return { type: code === "saved" ? ("success" as const) : ("error" as const), text };
}
