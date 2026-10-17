import HrmsShell from "@/components/hrms/HrmsShell";
import { getFeedbackContext } from "@/utils/feedback-reward";

export default async function FeedbackRewardLayout({ children }: { children: React.ReactNode }) {
  const { user, access } = await getFeedbackContext();
  return (
    <HrmsShell
      userEmail={user.email}
      userRole={access.app_role}
      pageTitle="Feedback & Reward"
      contentClassName="bg-[#F8FBFF] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
    >
      <div className="mx-auto w-full max-w-[1240px]">{children}</div>
    </HrmsShell>
  );
}
