import Link from "next/link";
import { Award, ChevronLeft, ChevronRight, ClipboardCheck, Gift, MessageSquareText } from "lucide-react";
import type { ReactNode } from "react";
import { TranslatedText } from "@/components/i18n/LocalizedText";
import BackLink from "@/components/ui/BackLink";
import { pageList, paginationClass as p } from "@/components/ui/pagination";
import { cardClass, pageTitleClass, segmentedClass } from "@/components/ui/styles";
import type { TranslationKey } from "@/lib/i18n";

type Tab = "overview" | "feedback" | "reward";

const tabConfig: Record<Tab, { href: string; icon: typeof ClipboardCheck; key: TranslationKey }> = {
  overview: { href: "/feedback-reward", icon: ClipboardCheck, key: "dashboard" },
  feedback: { href: "/feedback-reward/feedback", icon: MessageSquareText, key: "feedback" },
  reward: { href: "/feedback-reward/reward", icon: Gift, key: "reward" },
};

export function FeedbackRewardTabs({ active }: { active: Tab }) {
  return (
    <nav className={segmentedClass.group} aria-label="Feedback and reward navigation">
      {(Object.keys(tabConfig) as Tab[]).map((tab) => {
        const config = tabConfig[tab];
        const Icon = config.icon;
        const selected = active === tab;
        return (
          <Link key={tab} href={config.href} className={`${segmentedClass.item} ${selected ? segmentedClass.active : segmentedClass.idle}`}>
            <Icon className="size-3.5" aria-hidden="true" />
            <TranslatedText textKey={config.key} />
          </Link>
        );
      })}
    </nav>
  );
}

export function FeedbackRewardHeader({ eyebrow, title, description, backHref, backLabel, action }: { eyebrow?: ReactNode; title: ReactNode; description: ReactNode; backHref?: string; backLabel?: ReactNode; action?: ReactNode }) {
  return (
    <header className="space-y-4">
      {backHref && backLabel && <BackLink href={backHref}>{backLabel}</BackLink>}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow && <p className={pageTitleClass.eyebrow}>{eyebrow}</p>}
          <h1 className={`mt-1 ${pageTitleClass.title}`}>{title}</h1>
          <p className={pageTitleClass.subtitle}>{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

export function FeedbackMetric({ label, value, icon, tone = "blue", detail }: { label: ReactNode; value: number; icon: "feedback" | "reward" | "followup" | "notification"; tone?: "blue" | "green" | "amber" | "navy"; detail?: ReactNode }) {
  const Icon = icon === "feedback" ? MessageSquareText : icon === "reward" ? Award : icon === "followup" ? ClipboardCheck : Gift;
  const toneStyle = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    navy: "bg-slate-100 text-slate-700",
  }[tone];
  return <article className={`min-w-0 ${cardClass} p-5`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>{detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}</div><span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneStyle}`}><Icon className="size-5" aria-hidden="true" /></span></div></article>;
}

// Same capsule as components/hrms/TablePagination.tsx, with links because the
// feedback lists keep the page in the URL.
export function FeedbackPagination({ page, totalPages, previousLabel, nextLabel, hrefForPage }: { page: number; totalPages: number; previousLabel: ReactNode; nextLabel: ReactNode; hrefForPage: (page: number) => string }) {
  if (totalPages <= 1) return null;
  const isFirst = page <= 1;
  const isLast = page >= totalPages;
  return (
    <nav className="flex justify-center md:justify-end" aria-label="Pagination">
      <div className={p.capsule}>
        <Link aria-disabled={isFirst} className={`${p.arrow} ${isFirst ? p.arrowDisabled : p.arrowEnabled}`} href={hrefForPage(Math.max(1, page - 1))}>
          <ChevronLeft className="size-4" aria-hidden="true" /><span className="sr-only">{previousLabel}</span>
        </Link>
        <div className="flex items-center gap-1">
          {pageList(page, totalPages).map((item, index) => item === "..." ? (
            <span key={`gap-${index}`} className={p.ellipsis}>...</span>
          ) : (
            <Link key={item} aria-current={item === page ? "page" : undefined} className={`${p.page} ${item === page ? p.pageActive : p.pageIdle}`} href={hrefForPage(item)}>{item}</Link>
          ))}
        </div>
        <Link aria-disabled={isLast} className={`${p.arrow} ${isLast ? p.arrowDisabled : p.arrowEnabled}`} href={hrefForPage(Math.min(totalPages, page + 1))}>
          <ChevronRight className="size-4" aria-hidden="true" /><span className="sr-only">{nextLabel}</span>
        </Link>
      </div>
    </nav>
  );
}
