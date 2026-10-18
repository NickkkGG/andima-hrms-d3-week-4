import { notFound } from "next/navigation";
import { CreateRecordWizard } from "@/components/feedback-reward/FeedbackRewardUI";
import { FeedbackRewardHeader } from "@/components/feedback-reward/FeedbackRewardChrome";
import { getEmployeeOptions, getFeedbackContext } from "@/utils/feedback-reward";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function NewFeedbackPage() {
  const language = await getServerLanguage();
  const { canCreate } = await getFeedbackContext();
  if (!canCreate) notFound();
  const employees = await getEmployeeOptions();
  const copy = language === "id" ? { back: "Kembali ke Dashboard", title: "Beri umpan balik", description: "Catat perkembangan dan tindak lanjut pegawai melalui formulir bertahap." } : { back: "Back to Dashboard", title: "Give feedback", description: "Record employee growth and follow-up through a step-by-step form." };
  return <section className="mx-auto max-w-3xl space-y-5"><FeedbackRewardHeader eyebrow="HRMS · Feedback" backHref="/feedback-reward/feedback" backLabel={copy.back} title={copy.title} description={copy.description} /><CreateRecordWizard kind="feedback" employees={employees} /></section>;
}
