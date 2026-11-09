import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("attendanceHistoryCorrection");

export default function AttendanceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
