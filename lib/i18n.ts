export const languageCookieName = "andima-hrms-language";

export type SupportedLanguage = "id" | "en";

export function normalizeLanguage(value: string | undefined | null): SupportedLanguage {
  return value === "en" ? "en" : "id";
}

/** Shared copy used by client components and server-rendered pages. */
export const messages = {
  id: {
    language: "Bahasa", indonesian: "Indonesia", english: "English", attendance: "Presensi", hrms: "HRMS",
    employeeProfileManagement: "Manajemen Profil Karyawan", biometricRegistration: "Registrasi Biometrik",
    faceBiometricAttendance: "Presensi Biometrik Wajah", attendanceHistoryCorrection: "Riwayat & Koreksi Presensi",
    attendanceProductivity: "Presensi & Produktivitas", feedbackReward: "Umpan Balik & Apresiasi",
    employeeReportTicket: "Laporan & Tiket Karyawan", employee: "Karyawan", manager: "Manajer", hrmsUser: "Pengguna HRMS",
    logout: "Keluar", signingOut: "Keluar...", openNavigation: "Buka navigasi", closeNavigation: "Tutup navigasi",
    d3: "D3", myAttendance: "Presensi Saya", reportTicket: "Laporan & Tiket", back: "Kembali", cancel: "Batal",
    save: "Simpan", saving: "Menyimpan...", edit: "Ubah", add: "Tambah", delete: "Hapus", close: "Tutup",
    search: "Cari", filter: "Filter", reset: "Atur ulang", loading: "Memuat...", noData: "Belum ada data.",
    requiredField: "Kolom ini wajib diisi.", changesDiscarded: "Perubahan yang belum disimpan akan hilang. Lanjutkan?",
    dashboard: "Dashboard", feedback: "Umpan balik", reward: "Apresiasi", notifications: "Notifikasi",
    viewAll: "Lihat semua", auditTrail: "Lihat riwayat audit", latestFeedback: "Umpan balik terbaru",
    latestReward: "Apresiasi terbaru", activeFeedback: "Umpan balik aktif", myRewards: "Apresiasi saya",
    unread: "belum dibaca", total: "total", giveFeedback: "Beri umpan balik", submitReward: "Ajukan apresiasi",
    startFeedback: "Mulai memberi umpan balik", startReward: "Mulai ajukan apresiasi",
    noFeedback: "Belum ada umpan balik", noReward: "Belum ada apresiasi", noNotifications: "Belum ada notifikasi.",
    feedbackGiver: "Pemberi umpan balik", target: "Target", new: "Baru", read: "Sudah dibaca",
    inProgress: "Ditindaklanjuti", completed: "Selesai", submitted: "Diajukan", approved: "Disetujui HR",
    published: "Dipublikasikan", rejected: "Ditolak", feedbackSaved: "Umpan balik berhasil disimpan.",
    rewardSaved: "Apresiasi berhasil disimpan.", saveFailed: "Gagal menyimpan data.", next: "Lanjut",
  },
  en: {
    language: "Language", indonesian: "Indonesian", english: "English", attendance: "Attendance", hrms: "HRMS",
    employeeProfileManagement: "Employee Profile Management", biometricRegistration: "Biometric Registration",
    faceBiometricAttendance: "Face Biometric Attendance", attendanceHistoryCorrection: "Attendance History & Correction",
    attendanceProductivity: "Attendance & Productivity", feedbackReward: "Feedback & Reward",
    employeeReportTicket: "Employee Report & Ticket", employee: "Employee", manager: "Manager", hrmsUser: "HRMS User",
    logout: "Logout", signingOut: "Signing out...", openNavigation: "Open navigation", closeNavigation: "Close navigation",
    d3: "D3", myAttendance: "My Attendance", reportTicket: "Report & Ticket", back: "Back", cancel: "Cancel",
    save: "Save", saving: "Saving...", edit: "Edit", add: "Add", delete: "Delete", close: "Close",
    search: "Search", filter: "Filter", reset: "Reset", loading: "Loading...", noData: "No data yet.",
    requiredField: "This field is required.", changesDiscarded: "Your unsaved changes will be lost. Continue?",
    dashboard: "Dashboard", feedback: "Feedback", reward: "Reward", notifications: "Notifications",
    viewAll: "View all", auditTrail: "View audit trail", latestFeedback: "Latest feedback",
    latestReward: "Latest reward", activeFeedback: "Active feedback", myRewards: "My rewards",
    unread: "unread", total: "total", giveFeedback: "Give feedback", submitReward: "Submit reward",
    startFeedback: "Start giving feedback", startReward: "Start a reward request",
    noFeedback: "No feedback yet", noReward: "No rewards yet", noNotifications: "No notifications yet.",
    feedbackGiver: "Feedback giver", target: "Target", new: "New", read: "Read",
    inProgress: "In progress", completed: "Completed", submitted: "Submitted", approved: "HR approved",
    published: "Published", rejected: "Rejected", feedbackSaved: "Feedback saved successfully.",
    rewardSaved: "Reward saved successfully.", saveFailed: "Unable to save the data.", next: "Next",
  },
} as const;

export type TranslationKey = keyof typeof messages.id;

export function translate(language: SupportedLanguage, key: TranslationKey): string {
  return messages[language][key];
}

export function pageTitleKey(title: string): TranslationKey | null {
  const titleMap: Record<string, TranslationKey> = {
    "Employee Profile Management": "employeeProfileManagement", "Biometric Registration": "biometricRegistration",
    "Face Biometric Attendance": "faceBiometricAttendance", "Attendance & Correction": "attendanceHistoryCorrection",
    "Attendance & Productivity": "attendanceProductivity", "Feedback & Reward": "feedbackReward",
    "Employee Report & Ticket": "employeeReportTicket", "My Attendance": "myAttendance",
  };
  return titleMap[title] ?? null;
}
