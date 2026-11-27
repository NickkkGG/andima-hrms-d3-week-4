// Page numbers shown in the pagination capsule (same rule as the CCR app):
// up to 7 pages are all shown; otherwise first, last, and the pages around the
// current one, with "..." for the gaps.
export function pageList(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages: (number | "...")[] = [1];
  if (current > 4) pages.push("...");
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) pages.push(page);
  if (current < total - 3) pages.push("...");
  pages.push(total);
  return pages;
}

export const paginationClass = {
  nav: "flex w-full select-none flex-col items-center justify-between gap-3 text-xs text-slate-600 md:flex-row",
  info: "flex flex-wrap items-center justify-center gap-1.5 font-medium text-slate-500 md:justify-start",
  number: "font-bold text-slate-800",
  capsule: "flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-xs",
  arrow: "flex items-center justify-center rounded p-0.5 transition",
  arrowEnabled: "cursor-pointer text-slate-700 hover:text-blue-600",
  arrowDisabled: "pointer-events-none cursor-not-allowed text-slate-300",
  page: "flex size-6 items-center justify-center rounded-full text-xs font-bold transition-all",
  pageActive: "bg-[#1D60FF] text-white shadow-xs",
  pageIdle: "cursor-pointer text-slate-700 hover:bg-slate-100 hover:text-slate-950",
  ellipsis: "select-none px-1 text-xs text-slate-400",
};
