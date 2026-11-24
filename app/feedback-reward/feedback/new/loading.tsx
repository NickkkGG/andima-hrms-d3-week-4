import { PageSkeleton } from "@/components/hrms/Skeleton";

export default function NewFeedbackLoading() {
  return <div className="mx-auto max-w-3xl"><PageSkeleton contained={false} layout="form" /></div>;
}
