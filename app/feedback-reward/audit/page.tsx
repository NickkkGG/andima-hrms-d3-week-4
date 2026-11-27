import { History } from "lucide-react";
import { FeedbackPagination, FeedbackRewardHeader } from "@/components/feedback-reward/FeedbackRewardChrome";
import { RecordList } from "@/components/feedback-reward/RecordList";
import { getAudit, type SearchParams } from "@/utils/feedback-reward";
import { pageMetadata } from "@/lib/page-metadata";
import { localizedCopy } from "@/lib/i18n-copy";
import { paginationClass } from "@/components/ui/pagination";
import { cardClass } from "@/components/ui/styles";

export const generateMetadata = () => pageMetadata("auditTrail");

export default async function AuditTrailPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams; const data = await getAudit(params); const totalPages = Math.max(1, Math.ceil(data.count / data.pageSize)); const start = data.count === 0 ? 0 : (data.page - 1) * data.pageSize + 1; const end = Math.min(data.page * data.pageSize, data.count);
  const copyText = { id: { back: "Kembali ke ringkasan", title: "Riwayat audit", desc: "Lacak aktivitas feedback dan reward yang tercatat di dalam sistem.", showing: "Menampilkan", of: "dari", records: "catatan", previous: "Sebelumnya", next: "Berikutnya" }, en: { back: "Back to overview", title: "Audit trail", desc: "Track feedback and reward activity recorded by the system.", showing: "Showing", of: "of", records: "records", previous: "Previous", next: "Next" } }; const copy = localizedCopy(copyText);
  const hrefForPage = (page: number) => { const query = new URLSearchParams(); query.set("page", String(page)); for (const key of ["module", "period"]) { const value = typeof params[key] === "string" ? params[key] : ""; if (value) query.set(key, value); } return `/feedback-reward/audit?${query.toString()}`; };
  return <section className="space-y-5"><FeedbackRewardHeader eyebrow="HRMS · Audit" backHref="/feedback-reward" backLabel={copy.back} title={copy.title} description={copy.desc} action={<span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><History size={20} /></span>} /><div className={`${cardClass} p-4 sm:p-5`}><RecordList records={data.records} audit /></div><div className={paginationClass.nav}><p className={paginationClass.info}>{copy.showing} <strong className={paginationClass.number}>{start}–{end}</strong> {copy.of} <strong className={paginationClass.number}>{data.count}</strong> {copy.records}</p><FeedbackPagination page={data.page} totalPages={totalPages} previousLabel={copy.previous} nextLabel={copy.next} hrefForPage={hrefForPage} /></div></section>;
}
