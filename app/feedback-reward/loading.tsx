import { PageSkeleton } from "@/components/hrms/Skeleton";

// Same skeleton as every other D3 page (BUG-D3-015). The HrmsShell layout
// already provides the header and padded container.
export default function FeedbackRewardLoading() {
  return <PageSkeleton contained={false} stats={3} />;
}
