import Link from "next/link";
import { notFound } from "next/navigation";
import { CreateRecordWizard } from "@/components/feedback-reward/FeedbackRewardUI";
import { getEmployeeOptions, getFeedbackContext } from "@/utils/feedback-reward";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function NewFeedbackPage() {
  const language = await getServerLanguage();
  const { canCreate } = await getFeedbackContext();
  if (!canCreate) notFound();
  const employees = await getEmployeeOptions();
  const copy = language === "id" ? { back: "Kembali ke Dashboard", title: "Beri umpan balik", description: "Catat perkembangan dan tindak lanjut pegawai melalui formulir bertahap." } : { back: "Back to Dashboard", title: "Give feedback", description: "Record employee growth and follow-up through a step-by-step form." };
  return <section className="mx-auto max-w-3xl space-y-6"><header><Link className="text-sm font-bold text-[#155cfd]" href="/feedback-reward">← {copy.back}</Link><h1 className="mt-3 text-3xl font-bold text-[#121b2e]">{copy.title}</h1><p className="mt-2 text-slate-600">{copy.description}</p></header><CreateRecordWizard kind="feedback" employees={employees} /></section>;
}
