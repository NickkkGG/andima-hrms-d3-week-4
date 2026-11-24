import { notFound } from "next/navigation";
import { CreateRecordWizard } from "@/components/feedback-reward/FeedbackRewardUI";
import { FeedbackRewardHeader } from "@/components/feedback-reward/FeedbackRewardChrome";
import { getEmployeeOptions, getFeedbackContext } from "@/utils/feedback-reward";
import { pageMetadata } from "@/lib/page-metadata";
import { localizedCopy } from "@/lib/i18n-copy";

export const generateMetadata = () => pageMetadata("submitReward");

export default async function NewRewardPage() {
  const { canCreate } = await getFeedbackContext();
  if (!canCreate) notFound();
  const employees = await getEmployeeOptions();
  const copyText = { id: { back: "Kembali ke Dashboard", title: "Ajukan apresiasi", description: "Ajukan penghargaan pegawai melalui formulir bertahap." }, en: { back: "Back to Dashboard", title: "Submit a reward", description: "Request employee recognition through a step-by-step form." } }; const copy = localizedCopy(copyText);
  return <section className="mx-auto max-w-3xl space-y-5"><FeedbackRewardHeader eyebrow="HRMS · Reward" backHref="/feedback-reward/reward" backLabel={copy.back} title={copy.title} description={copy.description} /><CreateRecordWizard kind="reward" employees={employees} /></section>;
}
