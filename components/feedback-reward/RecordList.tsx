"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Gift, History, UserRound } from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/feedback-reward/FeedbackRewardUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { dateLabel } from "@/utils/feedback-reward-format";
import type { AuditEntry, EmployeeIdentity, Feedback, Reward } from "@/types/feedback-reward";

const person = (employee: EmployeeIdentity | null, fallback: string) => employee ? `${employee.full_name} · ${employee.employee_id}` : fallback;

export function RewardList({ records }: { records: Reward[] }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Belum ada reward yang sesuai", employee: "Pegawai tidak tersedia", proposer: "Pengaju", detail: "Buka detail" } : { empty: "No matching rewards yet", employee: "Employee unavailable", proposer: "Proposer", detail: "Open detail" };
  if (!records.length) return <EmptyState title={copy.empty} description={language === "id" ? "Coba ubah filter atau periode yang dipilih." : "Try changing the selected filter or period."} />;
  return <div className="grid gap-3">{records.map((record) => <Link key={record.id} href={`/feedback-reward/reward/${record.id}`} className="group rounded-2xl border border-[#D7E4F4] bg-white p-4 shadow-[0_6px_18px_rgba(13,47,91,0.04)] transition hover:-translate-y-0.5 hover:border-[#8EB6E1] hover:shadow-[0_12px_24px_rgba(13,47,91,0.1)] sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EAF7F0] text-[#16804B]"><Gift size={18} /></span><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#16804B]">{record.reward_type.replaceAll("_", " ")}</p><h2 className="mt-1 truncate font-[family-name:var(--font-poppins)] text-lg font-bold text-[#102B52]">{record.title}</h2></div></div><StatusBadge status={record.status} /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-[#60718B]">{record.reason}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#E8EEF6] pt-3 text-xs text-[#71819A]"><span className="inline-flex items-center gap-1.5 font-semibold text-[#425673]"><UserRound size={13} />{person(record.employee, copy.employee)}</span><span>{copy.proposer}: {person(record.proposer, "-")}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{dateLabel(record.date, false, language)}</span><span className="ml-auto inline-flex items-center gap-1 font-bold text-[#1B67C9]">{copy.detail}<ArrowRight size={14} /></span></div></Link>)}</div>;
}

export function RecordList({ records }: { records: (Feedback | Reward | AuditEntry)[]; audit?: boolean }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Belum ada catatan audit", employee: "Pegawai tidak tersedia", actor: "Aktor tidak tersedia", detail: "Lihat detail", action: "Aksi" } : { empty: "No audit records yet", employee: "Employee unavailable", actor: "Actor unavailable", detail: "View details", action: "Action" };
  if (!records.length) return <EmptyState title={copy.empty} description={language === "id" ? "Aktivitas feedback dan reward akan tercatat di sini." : "Feedback and reward activity will be recorded here."} />;
  return <div className="grid gap-3">{records.map((record) => {
    if ("entity_type" in record) return <article key={record.id} className="rounded-2xl border border-[#D7E4F4] bg-white p-4 shadow-[0_6px_18px_rgba(13,47,91,0.04)] sm:flex sm:items-center sm:justify-between sm:gap-5"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#E8F2FF] text-[#1B67C9]"><History size={18} /></span><div className="min-w-0"><p className="text-[11px] font-extrabold uppercase tracking-[0.13em] text-[#1B67C9]">{record.entity_type} · {record.action.replaceAll("_", " ")}</p><h2 className="mt-1 truncate font-[family-name:var(--font-poppins)] font-bold text-[#102B52]">{person(record.employee, copy.employee)}</h2><p className="mt-1 text-xs text-[#71819A]">{copy.action}: {record.action} · {person(record.actor, copy.actor)}</p></div></div><time className="mt-3 block shrink-0 text-xs font-semibold text-[#71819A] sm:mt-0">{dateLabel(record.created_at, true, language)}</time></article>;
    const feedback = "feedback_text" in record; const kind = feedback ? "feedback" : "reward";
    return <Link key={record.id} href={`/feedback-reward/${kind}/${record.id}`} className="group flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D7E4F4] bg-white p-4 shadow-[0_6px_18px_rgba(13,47,91,0.04)] hover:border-[#8EB6E1]"><div><p className="text-xs font-bold text-[#1B67C9]">{person(record.employee, copy.employee)}</p><p className="mt-1 font-[family-name:var(--font-poppins)] font-bold text-[#102B52]">{record.title}</p></div><span className="inline-flex items-center gap-2 text-sm font-bold text-[#1B67C9]">{copy.detail}<ArrowRight size={15} /></span></Link>;
  })}</div>;
}

export function RecordCards({ records }: { records: (Feedback | Reward)[] }) { return <RecordList records={records} />; }
