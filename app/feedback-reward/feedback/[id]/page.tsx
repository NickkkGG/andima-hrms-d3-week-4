import Link from "next/link";
import { notFound } from "next/navigation";
import { updateFeedbackProgress } from "@/app/feedback-reward/actions";
import { WorkflowStepper } from "@/components/feedback-reward/FeedbackRewardUI";
import { getFeedbackContext, getRecord } from "@/utils/feedback-reward";
import { dateLabel } from "@/utils/feedback-reward-format";
import { getServerLanguage } from "@/lib/i18n-server";

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [language, { access }, record] = await Promise.all([getServerLanguage(), getFeedbackContext(), getRecord("feedback", (await params).id)]);
  if (!("feedback_text" in record)) notFound();
  const submitProgress = async (form: FormData) => { "use server"; await updateFeedbackProgress(form); };
  const copy = language === "id" ? { back: "Kembali", detail: "Detail umpan balik", employee: "Pegawai", unavailable: "Identitas tidak tersedia", titleTypeCategory: "Judul · Tipe · Kategori", feedback: "Umpan balik", status: "Status tindak lanjut", noFollowUp: "Tidak ada tindak lanjut tambahan.", progress: "Progres", date: "Tanggal umpan balik", givenBy: "Diberikan oleh", note: "Catatan progres", save: "Simpan progres", new: "Baru", read: "Sudah dibaca", inProgress: "Ditindaklanjuti", completed: "Selesai" } : { back: "Back", detail: "Feedback details", employee: "Employee", unavailable: "Identity unavailable", titleTypeCategory: "Title · Type · Category", feedback: "Feedback", status: "Follow-up status", noFollowUp: "No additional follow-up.", progress: "Progress", date: "Feedback date", givenBy: "Given by", note: "Progress note", save: "Save progress", new: "New", read: "Read", inProgress: "In progress", completed: "Completed" };
  return <section className="space-y-6">
    <Link className="text-sm font-semibold text-[#155cfd]" href={access.app_role === "EMPLOYEE" ? "/feedback-reward" : "/feedback-reward/feedback"}>← {copy.back}</Link>
    <h1 className="text-3xl font-bold text-slate-900">{copy.detail}</h1>
    <article className="max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6">
      <div><p className="text-sm text-slate-500">{copy.employee}</p><p className="font-semibold">{record.employee?.full_name ?? copy.unavailable}</p></div>
      <div><p className="text-sm text-slate-500">{copy.titleTypeCategory}</p><p>{record.title} · {record.feedback_type} · {record.category}</p></div>
      <div><p className="text-sm text-slate-500">{copy.feedback}</p><p className="whitespace-pre-wrap">{record.feedback_text}</p></div>
      <div><p className="text-sm text-slate-500">{copy.status}</p><div className="mt-2"><WorkflowStepper status={record.follow_up_status} steps={["NEW", "READ", "IN_PROGRESS", "COMPLETED"]} /></div><p className="mt-3 text-sm text-slate-600">{record.follow_up_text ?? copy.noFollowUp}</p>{record.progress_note && <p className="mt-2 text-sm text-slate-600">{copy.progress}: {record.progress_note}</p>}</div>
      <div className="grid gap-4 sm:grid-cols-2"><div><p className="text-sm text-slate-500">{copy.date}</p><p>{dateLabel(record.date)}</p></div><div><p className="text-sm text-slate-500">{copy.givenBy}</p><p>{record.giver?.full_name ?? copy.unavailable}</p></div></div>
      <form action={submitProgress} className="grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_2fr_auto]"><input type="hidden" name="id" value={record.id} /><select name="status" defaultValue={record.follow_up_status} className="h-10 rounded-md border border-slate-300 bg-white px-3"><option value="NEW">{copy.new}</option><option value="READ">{copy.read}</option><option value="IN_PROGRESS">{copy.inProgress}</option>{access.app_role !== "EMPLOYEE" && <option value="COMPLETED">{copy.completed}</option>}</select><input name="progress_note" defaultValue={record.progress_note ?? ""} placeholder={copy.note} className="h-10 rounded-md border border-slate-300 bg-white px-3" /><button className="h-10 rounded-md bg-[#155cfd] px-4 font-semibold text-white">{copy.save}</button></form>
    </article>
  </section>;
}
