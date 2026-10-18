import { notFound } from "next/navigation";
import { CreateRecordWizard } from "@/components/feedback-reward/FeedbackRewardUI";
import { FeedbackRewardHeader } from "@/components/feedback-reward/FeedbackRewardChrome";
import { getEmployeeOptions, getFeedbackContext } from "@/utils/feedback-reward";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function NewRewardPage() {
  const language = await getServerLanguage();
  const { canCreate } = await getFeedbackContext();
  if (!canCreate) notFound();
  const employees = await getEmployeeOptions();
  const copy = language === "id" ? { back: "Kembali ke Dashboard", title: "Ajukan apresiasi", description: "Ajukan penghargaan pegawai melalui formulir bertahap." } : { back: "Back to Dashboard", title: "Submit a reward", description: "Request employee recognition through a step-by-step form." };
  return <section className="mx-auto max-w-3xl space-y-5"><FeedbackRewardHeader eyebrow="HRMS · Reward" backHref="/feedback-reward/reward" backLabel={copy.back} title={copy.title} description={copy.description} /><CreateRecordWizard kind="reward" employees={employees} /></section>;
}
