import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("login");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
