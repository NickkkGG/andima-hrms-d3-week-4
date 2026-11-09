import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("employeeReportTicket");

export default function EmployeeReportTicketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
