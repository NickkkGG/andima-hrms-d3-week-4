"use client";

import Link from "next/link";
import { ArrowRight, CalendarDays, Gift, History, UserRound } from "lucide-react";
import { EmptyState, StatusBadge } from "@/components/feedback-reward/FeedbackRewardUI";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { cardClass } from "@/components/ui/styles";
import { feedbackRewardLabel } from "@/lib/feedback-reward-labels";
import { dateLabel } from "@/utils/feedback-reward-format";
import type { AuditEntry, EmployeeIdentity, Feedback, Reward } from "@/types/feedback-reward";

const person = (employee: EmployeeIdentity | null, fallback: string) => employee ? `${employee.full_name} · ${employee.employee_id}` : fallback;

export function RewardList({ records }: { records: Reward[] }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Belum ada reward yang sesuai", employee: "Pegawai tidak tersedia", proposer: "Pengaju", detail: "Buka detail" } : { empty: "No matching rewards yet", employee: "Employee unavailable", proposer: "Proposer", detail: "Open detail" };
  if (!records.length) return <EmptyState title={copy.empty} description={language === "id" ? "Coba ubah filter atau periode yang dipilih." : "Try changing the selected filter or period."} />;
  return <div className="grid gap-3">{records.map((record) => <Link key={record.id} href={`/feedback-reward/reward/${record.id}`} className={`group ${cardClass} p-4 transition hover:border-blue-400 sm:p-5`}><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><Gift size={18} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700">{feedbackRewardLabel(record.reward_type, language)}</p><h2 className="mt-1 truncate font-[family-name:var(--font-poppins)] text-base font-bold text-slate-900">{record.title}</h2></div></div><StatusBadge status={record.status} /></div><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{record.reason}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><UserRound size={13} />{person(record.employee, copy.employee)}</span><span>{copy.proposer}: {person(record.proposer, "-")}</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={13} />{dateLabel(record.date, false, language)}</span><span className="ml-auto inline-flex items-center gap-1 font-semibold text-blue-700 group-hover:underline">{copy.detail}<ArrowRight size={14} /></span></div></Link>)}</div>;
}

export function RecordList({ records }: { records: (Feedback | Reward | AuditEntry)[]; audit?: boolean }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Belum ada catatan audit", employee: "Pegawai tidak tersedia", actor: "Aktor tidak tersedia", detail: "Lihat detail", action: "Aksi" } : { empty: "No audit records yet", employee: "Employee unavailable", actor: "Actor unavailable", detail: "View details", action: "Action" };
  if (!records.length) return <EmptyState title={copy.empty} description={language === "id" ? "Aktivitas feedback dan reward akan tercatat di sini." : "Feedback and reward activity will be recorded here."} />;
  return <div className="grid gap-3">{records.map((record) => {
    if ("entity_type" in record) return <article key={record.id} className="rounded-xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between sm:gap-5"><div className="flex min-w-0 gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><History size={18} /></span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.08em] text-blue-600">{feedbackRewardLabel(record.entity_type, language)} · {feedbackRewardLabel(record.action, language)}</p><h2 className="mt-1 truncate font-[family-name:var(--font-poppins)] text-sm font-bold text-slate-900">{person(record.employee, copy.employee)}</h2><p className="mt-1 text-xs text-slate-500">{copy.action}: {record.action} · {person(record.actor, copy.actor)}</p></div></div><time className="mt-3 block shrink-0 text-xs font-semibold text-slate-500 sm:mt-0">{dateLabel(record.created_at, true, language)}</time></article>;
    const feedback = "feedback_text" in record; const kind = feedback ? "feedback" : "reward";
    return <Link key={record.id} href={`/feedback-reward/${kind}/${record.id}`} className={`group flex flex-wrap items-center justify-between gap-3 ${cardClass} p-4 transition hover:border-blue-400`}><div><p className="text-xs font-semibold text-blue-600">{person(record.employee, copy.employee)}</p><p className="mt-1 font-[family-name:var(--font-poppins)] font-bold text-slate-900">{record.title}</p></div><span className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 group-hover:underline">{copy.detail}<ArrowRight size={15} /></span></Link>;
  })}</div>;
}

export function RecordCards({ records }: { records: (Feedback | Reward)[] }) { return <RecordList records={records} />; }
