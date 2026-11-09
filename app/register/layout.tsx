import { pageMetadata } from "@/lib/page-metadata";

export const generateMetadata = () => pageMetadata("register");

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
