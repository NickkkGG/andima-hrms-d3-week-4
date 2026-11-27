import Link from "next/link";
import { ArrowRight, ListChecks } from "lucide-react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { badgeClass, cardClass, pageTitleClass } from "@/components/ui/styles";

type FollowUpCounts = { NEW: number; READ: number; IN_PROGRESS: number; SUBMITTED: number };

// Styled like NotificationPanel (FeedbackRewardUI) so the HR overview reads as
// one set of cards from the class design system.
export default function FollowUpPanel({ counts }: { counts: FollowUpCounts }) {
  const items = [
    { key: "NEW", href: "/feedback-reward/feedback?follow_up_status=NEW", id: "Feedback baru", en: "New feedback" },
    { key: "READ", href: "/feedback-reward/feedback?follow_up_status=READ", id: "Feedback sudah dibaca", en: "Feedback read" },
    { key: "IN_PROGRESS", href: "/feedback-reward/feedback?follow_up_status=IN_PROGRESS", id: "Feedback ditindaklanjuti", en: "Feedback in progress" },
    { key: "SUBMITTED", href: "/feedback-reward/reward?status=SUBMITTED", id: "Reward menunggu keputusan", en: "Rewards awaiting decision" },
  ] as const;
  const total = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return (
    <section className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div><p className={pageTitleClass.eyebrow}>Feedback &amp; Reward</p><h2 className="mt-1 font-[family-name:var(--font-poppins)] text-base font-bold text-slate-900"><LocalizedText id="Perlu ditindaklanjuti" en="Needs follow-up" /></h2></div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600"><ListChecks size={18} aria-hidden="true" /></span>
      </div>
      {total === 0 ? <p className="mt-4 text-sm text-slate-500"><LocalizedText id="Tidak ada tindak lanjut terbuka." en="There are no open follow-ups." /></p> : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => <li key={item.key}><Link className="group flex items-center gap-3 py-3 text-sm font-semibold text-slate-700 transition-colors hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600" href={item.href}><span className="min-w-0 flex-1"><LocalizedText id={item.id} en={item.en} /></span><span className={badgeClass(counts[item.key] > 0 ? "blue" : "slate")}>{counts[item.key]}</span><ArrowRight size={16} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" aria-hidden="true" /></Link></li>)}
        </ul>
      )}
    </section>
  );
}
