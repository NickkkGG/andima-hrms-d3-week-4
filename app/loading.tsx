import { PageSkeleton } from "@/components/hrms/Skeleton";

// Route-level loading for every server-rendered page without its own loading
// file (home, employee profile pages). It uses the same skeleton as the
// client-side pages so loading looks the same across D3.
export default function GlobalLoading() {
  return <PageSkeleton withTopBar />;
}
