import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";

type FollowUpCounts = { NEW: number; READ: number; IN_PROGRESS: number; SUBMITTED: number };

export default function FollowUpPanel({ counts }: { counts: FollowUpCounts }) {
  const items = [
    { key: "NEW", href: "/feedback-reward/feedback?follow_up_status=NEW", id: "Feedback baru", en: "New feedback" },
    { key: "READ", href: "/feedback-reward/feedback?follow_up_status=READ", id: "Feedback sudah dibaca", en: "Feedback read" },
    { key: "IN_PROGRESS", href: "/feedback-reward/feedback?follow_up_status=IN_PROGRESS", id: "Feedback ditindaklanjuti", en: "Feedback in progress" },
    { key: "SUBMITTED", href: "/feedback-reward/reward?status=SUBMITTED", id: "Reward menunggu keputusan", en: "Rewards awaiting decision" },
  ] as const;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <section className="rounded-2xl border border-[#D7E4F4] bg-white p-4 shadow-[0_6px_18px_rgba(13,47,91,0.04)] sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#1B67C9]">Feedback &amp; Reward</p><h2 className="mt-1 font-[family-name:var(--font-poppins)] text-base font-bold text-[#121b2e]"><LocalizedText id="Perlu ditindaklanjuti" en="Needs follow-up" /></h2></div>
        <span className="grid size-10 place-items-center rounded-xl bg-[#E8F2FF] text-[#1B67C9]"><ListChecks size={18} aria-hidden="true" /></span>
      </div>
      {total === 0 ? <p className="mt-4 text-sm text-[#60718B]"><LocalizedText id="Tidak ada tindak lanjut terbuka." en="There are no open follow-ups." /></p> : (
        <ul className="mt-4 divide-y divide-[#E8EEF6]">
          {items.map((item) => <li key={item.key}><Link className="flex items-center gap-3 py-3 text-sm font-semibold text-[#243C61] hover:text-[#1B67C9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B67C9]" href={item.href}><span className="min-w-0 flex-1"><LocalizedText id={item.id} en={item.en} /></span><span className="rounded-full bg-[#F1F6FC] px-2.5 py-1 text-xs font-bold">{counts[item.key]}</span><ArrowRight size={16} aria-hidden="true" /></Link></li>)}
        </ul>
      )}
    </section>
  );
}
