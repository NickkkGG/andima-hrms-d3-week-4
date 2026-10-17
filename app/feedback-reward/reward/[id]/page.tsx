import Link from "next/link";
import { notFound } from "next/navigation";
import { updateRewardStatus } from "@/app/feedback-reward/actions";
import { StatusBadge, WorkflowStepper } from "@/components/feedback-reward/FeedbackRewardUI";
import { getFeedbackContext, getRecord } from "@/utils/feedback-reward";
import { dateLabel } from "@/utils/feedback-reward-format";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function RewardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [language, { access }, record] = await Promise.all([getServerLanguage(), getFeedbackContext(), getRecord("reward", (await params).id)]);
  if ("feedback_text" in record) notFound();
  const submitStatus = async (form: FormData) => { "use server"; await updateRewardStatus(form); };
  const canApprove = access.app_role === "HR" && !record.is_legacy;
  const copy = language === "id" ? { back: "Kembali ke daftar apresiasi", detail: "Detail apresiasi", employee: "Pegawai", unavailable: "Identitas tidak tersedia", reward: "Apresiasi", legacy: "Data lama", statusVisibility: "Status · Visibilitas", visibility: "Visibilitas", reason: "Alasan / pencapaian", date: "Tanggal apresiasi", proposer: "Pengaju", noProposer: "Tidak tersedia", approvalReason: "Alasan persetujuan", notAvailable: "Belum ada", approval: "Persetujuan HR", approvalReasonPlaceholder: "Alasan persetujuan", rejectionReasonPlaceholder: "Alasan penolakan", approve: "Setujui", reject: "Tolak", publish: "Publikasikan" } : { back: "Back to reward list", detail: "Reward details", employee: "Employee", unavailable: "Identity unavailable", reward: "Reward", legacy: "Legacy data", statusVisibility: "Status · Visibility", visibility: "Visibility", reason: "Reason / achievement", date: "Reward date", proposer: "Proposed by", noProposer: "Not available", approvalReason: "Approval reason", notAvailable: "Not available", approval: "HR approval", approvalReasonPlaceholder: "Reason for approval", rejectionReasonPlaceholder: "Reason for rejection", approve: "Approve", reject: "Reject", publish: "Publish" };
  return <section className="space-y-6">
    <Link className="text-sm font-semibold text-[#155cfd]" href="/feedback-reward/reward">← {copy.back}</Link>
    <h1 className="text-3xl font-bold text-slate-900">{copy.detail}</h1>
    <article className="max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div><p className="text-sm text-slate-500">{copy.employee}</p><p className="font-semibold">{record.employee?.full_name ?? copy.unavailable}</p><p className="text-sm text-slate-500">{record.employee?.employee_id ?? "-"}</p></div>
      <div><p className="text-sm text-slate-500">{copy.reward}</p><p>{record.title} · {record.reward_type}</p>{record.is_legacy && <p className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{copy.legacy}</p>}</div>
      <div><p className="text-sm text-slate-500">{copy.statusVisibility}</p><div className="mt-2 flex flex-wrap items-center gap-3"><StatusBadge status={record.status} /><WorkflowStepper status={record.status} steps={["SUBMITTED", "APPROVED", "PUBLISHED"]} /></div><p className="mt-3 text-sm text-slate-500">{copy.visibility}: <StatusBadge status={record.visibility} /></p></div>
      <div><p className="text-sm text-slate-500">{copy.reason}</p><p className="whitespace-pre-wrap">{record.reason}</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-slate-500">{copy.date}</p><p>{dateLabel(record.date)}</p></div><div><p className="text-sm text-slate-500">{copy.proposer}</p><p>{record.proposer?.full_name ?? copy.noProposer}</p></div></div>
      <div><p className="text-sm text-slate-500">{copy.approvalReason}</p><p>{record.approval_reason ?? copy.notAvailable}</p></div>
      {canApprove && record.status === "SUBMITTED" && <div className="space-y-3 rounded-lg bg-slate-50 p-4"><p className="font-bold text-[#1e3765]">{copy.approval}</p><div className="grid gap-3 sm:grid-cols-2"><form action={submitStatus} className="space-y-2"><input type="hidden" name="id" value={record.id} /><input type="hidden" name="status" value="APPROVED" /><input name="approval_reason" placeholder={copy.approvalReasonPlaceholder} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3" required /><button className="h-10 w-full rounded-md bg-[#155cfd] px-4 font-semibold text-white">{copy.approve}</button></form><form action={submitStatus} className="space-y-2"><input type="hidden" name="id" value={record.id} /><input type="hidden" name="status" value="REJECTED" /><input name="approval_reason" placeholder={copy.rejectionReasonPlaceholder} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3" required /><button className="h-10 w-full rounded-md bg-rose-600 px-4 font-semibold text-white">{copy.reject}</button></form></div></div>}
      {canApprove && record.status === "APPROVED" && <div className="rounded-lg bg-slate-50 p-4"><p className="mb-3 font-bold text-[#1e3765]">{copy.approval}</p><form action={submitStatus}><input type="hidden" name="id" value={record.id} /><input type="hidden" name="status" value="PUBLISHED" /><button className="h-10 rounded-md bg-[#155cfd] px-4 font-semibold text-white">{copy.publish}</button></form></div>}
    </article>
  </section>;
}
