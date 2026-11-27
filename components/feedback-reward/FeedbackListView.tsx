"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/feedback-reward/FeedbackRewardUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { cardClass } from "@/components/ui/styles";
import { feedbackRewardLabel } from "@/lib/feedback-reward-labels";
import type { Feedback } from "@/types/feedback-reward";

export function FeedbackListView({ records }: { records: Feedback[] }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Belum ada umpan balik yang sesuai", detail: "Buka detail", employee: "Pegawai tidak tersedia", target: "Target" } : { empty: "No matching feedback yet", detail: "Open detail", employee: "Employee unavailable", target: "Target" };
  if (!records.length) return <EmptyState title={copy.empty} description={language === "id" ? "Coba ubah kata kunci atau filter yang digunakan." : "Try adjusting the search keyword or selected filters."} />;
  return <div className="grid gap-3">{records.map((record) => <Link key={record.id} href={`/feedback-reward/feedback/${record.id}`} className={`group ${cardClass} p-4 transition hover:border-blue-400 sm:p-5`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-blue-600">{feedbackRewardLabel(record.feedback_type, language)} · {feedbackRewardLabel(record.category, language)}</p><h2 className="mt-1 truncate font-[family-name:var(--font-poppins)] text-base font-bold text-slate-900">{record.title}</h2></div><StatusBadge status={record.follow_up_status} /></div><p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-slate-600">{record.feedback_text}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><UserRound size={13} />{record.employee?.full_name ?? copy.employee}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{record.date}</span>{record.target_date && <span>{copy.target}: {record.target_date}</span>}<span className="ml-auto inline-flex items-center gap-1 font-semibold text-blue-700 group-hover:underline">{copy.detail}<ArrowRight size={14} /></span></div></Link>)}</div>;
}
