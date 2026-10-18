import Link from "next/link";
import { Award, ChevronLeft, ClipboardCheck, Gift, MessageSquareText } from "lucide-react";
import { translate, type SupportedLanguage, type TranslationKey } from "@/lib/i18n";

type Tab = "overview" | "feedback" | "reward";

const tabConfig: Record<Tab, { href: string; icon: typeof ClipboardCheck; key: TranslationKey }> = {
  overview: { href: "/feedback-reward", icon: ClipboardCheck, key: "dashboard" },
  feedback: { href: "/feedback-reward/feedback", icon: MessageSquareText, key: "feedback" },
  reward: { href: "/feedback-reward/reward", icon: Gift, key: "reward" },
};

export function FeedbackRewardTabs({ active, language }: { active: Tab; language: SupportedLanguage }) {
  return (
    <nav className="flex min-w-0 gap-1 overflow-x-auto rounded-2xl border border-[#D7E4F4] bg-white p-1.5 shadow-[0_6px_18px_rgba(13,47,91,0.04)]" aria-label="Feedback and reward navigation">
      {(Object.keys(tabConfig) as Tab[]).map((tab) => {
        const config = tabConfig[tab];
        const Icon = config.icon;
        const selected = active === tab;
        return (
          <Link key={tab} href={config.href} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-bold transition sm:px-4 ${selected ? "bg-[#113665] text-white shadow-[0_4px_10px_rgba(17,54,101,0.22)]" : "text-[#60718B] hover:bg-[#F1F6FC] hover:text-[#113665]"}`}>
            <Icon size={16} />
            {translate(language, config.key)}
          </Link>
        );
      })}
    </nav>
  );
}

export function FeedbackRewardHeader({ eyebrow, title, description, backHref, backLabel, action }: { eyebrow?: string; title: string; description: string; backHref?: string; backLabel?: string; action?: React.ReactNode }) {
  return (
    <header className="rounded-[24px] border border-[#D7E4F4] bg-[linear-gradient(112deg,#FFFFFF_0%,#F2F7FE_100%)] px-5 py-6 shadow-[0_10px_28px_rgba(13,47,91,0.06)] sm:px-7 sm:py-7">
      {backHref && backLabel && <Link href={backHref} className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#1B67C9] transition hover:text-[#113665]"><ChevronLeft size={16} />{backLabel}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-3xl">
          {eyebrow && <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#1B67C9]">{eyebrow}</p>}
          <h1 className="mt-2 font-[family-name:var(--font-poppins)] text-2xl font-bold tracking-[-0.035em] text-[#102B52] sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-[#60718B] sm:text-[15px]">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function FeedbackMetric({ label, value, icon, tone = "blue", detail }: { label: string; value: number; icon: "feedback" | "reward" | "followup" | "notification"; tone?: "blue" | "green" | "amber" | "navy"; detail?: string }) {
  const Icon = icon === "feedback" ? MessageSquareText : icon === "reward" ? Award : icon === "followup" ? ClipboardCheck : Gift;
  const toneStyle = {
    blue: "bg-[#E8F2FF] text-[#1B67C9]",
    green: "bg-[#E9F8F0] text-[#16804B]",
    amber: "bg-[#FFF5E5] text-[#A65E00]",
    navy: "bg-[#EAF0F8] text-[#113665]",
  }[tone];
  return <article className="min-w-0 rounded-2xl border border-[#D7E4F4] bg-white p-4 shadow-[0_6px_18px_rgba(13,47,91,0.04)] sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[#60718B]">{label}</p><p className="mt-2 font-[family-name:var(--font-poppins)] text-3xl font-bold tracking-[-0.04em] text-[#102B52]">{value}</p>{detail && <p className="mt-1 text-xs text-[#8292A8]">{detail}</p>}</div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneStyle}`}><Icon size={19} /></span></div></article>;
}

export function FeedbackPagination({ page, totalPages, previousLabel, nextLabel, hrefForPage }: { page: number; totalPages: number; previousLabel: string; nextLabel: string; hrefForPage: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => Math.max(1, Math.min(totalPages - 4, page - 2)) + index);
  return <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination"><Link aria-disabled={page <= 1} className={`inline-flex h-10 items-center rounded-xl border px-3 text-sm font-bold ${page <= 1 ? "pointer-events-none border-slate-200 text-slate-300" : "border-[#C9DCEF] bg-white text-[#113665] hover:bg-[#F1F6FC]"}`} href={hrefForPage(Math.max(1, page - 1))}>{previousLabel}</Link>{pages.map((item) => <Link key={item} aria-current={item === page ? "page" : undefined} className={`grid size-10 place-items-center rounded-xl text-sm font-bold ${item === page ? "bg-[#113665] text-white shadow-[0_4px_10px_rgba(17,54,101,0.22)]" : "border border-[#C9DCEF] bg-white text-[#113665] hover:bg-[#F1F6FC]"}`} href={hrefForPage(item)}>{item}</Link>)}<Link aria-disabled={page >= totalPages} className={`inline-flex h-10 items-center rounded-xl border px-3 text-sm font-bold ${page >= totalPages ? "pointer-events-none border-slate-200 text-slate-300" : "border-[#C9DCEF] bg-white text-[#113665] hover:bg-[#F1F6FC]"}`} href={hrefForPage(Math.min(totalPages, page + 1))}>{nextLabel}</Link></nav>;
}
