import Link from "next/link";
import { Filter, MessageSquarePlus, Search } from "lucide-react";
import ResetFilters from "@/components/feedback-reward/ResetFilters";
import { FeedbackPagination, FeedbackRewardHeader, FeedbackRewardTabs } from "@/components/feedback-reward/FeedbackRewardChrome";
import { FeedbackListView } from "@/components/feedback-reward/FeedbackListView";
import { getFeedbackContext, getRecords, param, type SearchParams } from "@/utils/feedback-reward";
import { pageMetadata } from "@/lib/page-metadata";
import { LocalizedInput, LocalizedOption, LocalizedText } from "@/components/i18n/LocalizedText";
import { localizedCopy } from "@/lib/i18n-copy";
import { buttonClass, cardClass, inputClass, searchInputClass } from "@/components/ui/styles";

export const generateMetadata = () => pageMetadata("feedbackList");

const types = ["APPRECIATION", "IMPROVEMENT", "PERFORMANCE_NOTE"] as const;
const statuses = ["NEW", "READ", "IN_PROGRESS", "COMPLETED"] as const;

export default async function FeedbackListPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { canCreate } = await getFeedbackContext();
  const copyText = { id: { title: "Daftar feedback", desc: "Temukan, tinjau, dan tindak lanjuti perkembangan pegawai dalam satu alur yang jelas.", create: "Beri feedback", search: "Cari nama atau ID pegawai", type: "Tipe", status: "Tindak lanjut", all: "Semua", from: "Dari tanggal", until: "Sampai tanggal", apply: "Terapkan", reset: "Reset", found: "feedback ditemukan", previous: "Sebelumnya", next: "Berikutnya", typeLabels: ["Apresiasi", "Coaching / Perbaikan", "Catatan kinerja"], statusLabels: ["Baru", "Sudah dibaca", "Ditindaklanjuti", "Selesai"] }, en: { title: "Feedback list", desc: "Find, review, and follow up on employee development through one clear workflow.", create: "Give feedback", search: "Search name or employee ID", type: "Type", status: "Follow-up", all: "All", from: "From date", until: "Until date", apply: "Apply", reset: "Reset", found: "feedback records found", previous: "Previous", next: "Next", typeLabels: ["Appreciation", "Coaching / improvement", "Performance note"], statusLabels: ["New", "Read", "In progress", "Completed"] } }; const copy = localizedCopy(copyText);
  const params = await searchParams; const data = await getRecords("feedback", params); const totalPages = Math.max(1, Math.ceil(data.count / data.pageSize));
  const hrefForPage = (page: number) => { const query = new URLSearchParams(); query.set("page", String(page)); for (const key of ["search", "feedback_type", "follow_up_status", "date_from", "date_to"]) { const current = param(params, key); if (current) query.set(key, current); } return `/feedback-reward/feedback?${query.toString()}`; };
  const field = inputClass("font-normal"); const filterLabel = "grid gap-1.5 text-xs font-semibold text-slate-700";
  if (!canCreate) return (
    <section className="space-y-5">
      <FeedbackRewardHeader eyebrow="HRMS · Feedback" title={<LocalizedText id="Feedback saya" en="My feedback" />} description={<LocalizedText id="Lihat feedback dan tindak lanjut yang ditujukan kepada Anda." en="View feedback and follow-ups addressed to you." />} />
      <FeedbackRewardTabs active="feedback" />
      <p className="text-sm font-semibold text-[#60718B]"><strong className="text-[#121b2e]">{data.count}</strong> {copy.found}</p>
      <FeedbackListView records={data.records as never[]} />
      <FeedbackPagination page={data.page} totalPages={totalPages} previousLabel={copy.previous} nextLabel={copy.next} hrefForPage={hrefForPage} />
    </section>
  );
  return <section className="space-y-5"><FeedbackRewardHeader eyebrow="HRMS · Feedback" title={copy.title} description={copy.desc} action={<Link href="/feedback-reward/feedback/new" className={buttonClass("primary")}><MessageSquarePlus size={16} />{copy.create}</Link>} /><FeedbackRewardTabs active="feedback" /><form key={JSON.stringify(["search", "feedback_type", "follow_up_status", "date_from", "date_to"].map((key) => param(params, key)))} className={`grid gap-4 ${cardClass} p-4 sm:grid-cols-2 xl:grid-cols-6`}><label className={`${filterLabel} xl:col-span-2`}>{copy.search}<span className="relative"><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><LocalizedInput name="search" defaultValue={param(params, "search")} placeholderId={copyText.id.search} placeholderEn={copyText.en.search} className={`${searchInputClass} font-normal`} /></span></label><label className={filterLabel}>{copy.type}<select name="feedback_type" defaultValue={param(params, "feedback_type")} className={field}><LocalizedOption value="" id={copyText.id.all} en={copyText.en.all} />{types.map((value, index) => <LocalizedOption key={value} value={value} id={copyText.id.typeLabels[index]} en={copyText.en.typeLabels[index]} />)}</select></label><label className={filterLabel}>{copy.status}<select name="follow_up_status" defaultValue={param(params, "follow_up_status")} className={field}><LocalizedOption value="" id={copyText.id.all} en={copyText.en.all} />{statuses.map((value, index) => <LocalizedOption key={value} value={value} id={copyText.id.statusLabels[index]} en={copyText.en.statusLabels[index]} />)}</select></label><label className={filterLabel}>{copy.from}<input type="date" name="date_from" defaultValue={param(params, "date_from")} className={field} /></label><label className={filterLabel}>{copy.until}<input type="date" name="date_to" defaultValue={param(params, "date_to")} className={field} /></label><div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4 sm:col-span-2 xl:col-span-6"><ResetFilters href="/feedback-reward/feedback" /><button className={buttonClass("primary")}><Filter size={15} />{copy.apply}</button></div></form><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-500"><strong className="text-slate-900">{data.count}</strong> {copy.found}</p></div><FeedbackListView records={data.records as never[]} /><FeedbackPagination page={data.page} totalPages={totalPages} previousLabel={copy.previous} nextLabel={copy.next} hrefForPage={hrefForPage} /></section>;
}
