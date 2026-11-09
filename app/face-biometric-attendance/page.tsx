import FaceBiometricWorkspace from "@/components/biometric/FaceBiometricWorkspace";
import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("faceBiometricAttendance");

export default function FaceBiometricAttendancePage() {
  return <FaceBiometricWorkspace mode="attendance" />;
}
