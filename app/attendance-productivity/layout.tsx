import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("attendanceProductivity");

export default function AttendanceProductivityLayout({ children }: { children: React.ReactNode }) {
  return children;
}
