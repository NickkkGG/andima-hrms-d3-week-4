"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, UserRound } from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/feedback-reward/FeedbackRewardUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import type { Feedback } from "@/types/feedback-reward";

export function FeedbackListView({ records }: { records: Feedback[] }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Belum ada umpan balik yang sesuai", detail: "Buka detail", employee: "Pegawai tidak tersedia", target: "Target" } : { empty: "No matching feedback yet", detail: "Open detail", employee: "Employee unavailable", target: "Target" };
  if (!records.length) return <EmptyState title={copy.empty} description={language === "id" ? "Coba ubah kata kunci atau filter yang digunakan." : "Try adjusting the search keyword or selected filters."} />;
  return <div className="grid gap-3">{records.map((record) => <Link key={record.id} href={`/feedback-reward/feedback/${record.id}`} className="group rounded-2xl border border-[#D7E4F4] bg-white p-4 shadow-[0_6px_18px_rgba(13,47,91,0.04)] transition hover:-translate-y-0.5 hover:border-[#8EB6E1] hover:shadow-[0_12px_24px_rgba(13,47,91,0.1)] sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1B67C9]">{record.feedback_type.replaceAll("_", " ")} · {record.category.replaceAll("_", " ")}</p><h2 className="mt-1 truncate font-[family-name:var(--font-poppins)] text-lg font-bold text-[#102B52]">{record.title}</h2></div><StatusBadge status={record.follow_up_status} /></div><p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-[#60718B]">{record.feedback_text}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E8EEF6] pt-3 text-xs text-[#71819A]"><span className="inline-flex items-center gap-1.5 font-semibold text-[#425673]"><UserRound size={13} />{record.employee?.full_name ?? copy.employee}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{record.date}</span>{record.target_date && <span>{copy.target}: {record.target_date}</span>}<span className="ml-auto inline-flex items-center gap-1 font-bold text-[#1B67C9] group-hover:text-[#113665]">{copy.detail}<ArrowRight size={14} /></span></div></Link>)}</div>;
}
