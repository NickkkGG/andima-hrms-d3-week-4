import FaceBiometricWorkspace from "@/components/biometric/FaceBiometricWorkspace";
import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("biometricRegistration");

export default function BiometricEnrollmentPage() {
  return <FaceBiometricWorkspace mode="enrollment" />;
}
