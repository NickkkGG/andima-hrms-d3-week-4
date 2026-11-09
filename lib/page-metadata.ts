import type { Metadata } from "next";
import { translate, type SupportedLanguage, type TranslationKey } from "@/lib/i18n";
import { getServerLanguage } from "@/lib/i18n-server";

/**
 * Browser tab title per page, in the active language. Each one matches the page's own
 * heading; module pages reuse their menu name from lib/i18n.ts.
 * New page: add an entry here, then export `generateMetadata = () => pageMetadata("key")`
 * from the page, or from a layout.tsx beside it when the page is a client component.
 */
const pageTitles = {
  login: { id: "Login", en: "Login" },
  register: { id: "Register", en: "Register" },
  notFound: { id: "Halaman tidak tersedia", en: "Page not found" },
  biometricRegistration: "biometricRegistration",
  faceBiometricAttendance: "faceBiometricAttendance",
  attendanceHistoryCorrection: "attendanceHistoryCorrection",
  attendanceProductivity: "attendanceProductivity",
  employeeReportTicket: "employeeReportTicket",
  employeeDirectory: { id: "Direktori Pegawai", en: "Employee Directory" },
  employeeProfile: { id: "Profil pegawai", en: "Employee profile" },
  newEmployee: { id: "Tambah Pegawai Baru", en: "Add a New Employee" },
  editEmployeeProfile: { id: "Edit profil pegawai", en: "Edit employee profile" },
  employmentStatus: { id: "Ubah status kepegawaian", en: "Change employment status" },
  feedbackReward: "feedbackReward",
  feedbackList: { id: "Daftar feedback", en: "Feedback list" },
  giveFeedback: "giveFeedback",
  feedbackDetails: { id: "Detail feedback", en: "Feedback details" },
  rewardList: { id: "Daftar reward", en: "Reward list" },
  submitReward: { id: "Ajukan apresiasi", en: "Submit a reward" },
  rewardDetails: { id: "Detail apresiasi", en: "Recognition details" },
  auditTrail: { id: "Riwayat audit", en: "Audit trail" },
} satisfies Record<string, TranslationKey | Record<SupportedLanguage, string>>;

export type PageTitle = keyof typeof pageTitles;

/** Title metadata for one page; the root layout's template appends " | ANDIMA HRMS". */
export async function pageMetadata(page: PageTitle): Promise<Metadata> {
  const language = await getServerLanguage();
  const title: TranslationKey | Record<SupportedLanguage, string> = pageTitles[page];
  return { title: typeof title === "string" ? translate(language, title) : title[language] };
}
