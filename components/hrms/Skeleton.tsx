"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";

// Shared loading skeletons. Every D3 page builds its loading state from these
// pieces, so a page that is still loading looks the same in every feature
// (BUG-D3-015). Blocks are decorative; each skeleton announces one short
// status text for screen readers instead.

export function SkeletonBlock({ className = "" }: { className?: string }) {
  // Default corner radius only when the caller sets none, so "rounded-full"
  // (avatars) is not overridden by the default.
  const rounding = /(^|\s)rounded(-|\s|$)/.test(className) ? "" : "rounded-md";
  return <span aria-hidden="true" className={`block animate-pulse bg-slate-200 motion-reduce:animate-none ${rounding} ${className}`} />;
}

function LoadingStatus() {
  const { language } = useLanguage();
  return <span className="sr-only">{language === "id" ? "Memuat data…" : "Loading data…"}</span>;
}

const cellWidths = ["w-24", "w-40", "w-16", "w-20", "w-14", "w-10"];

// Rows for an existing <tbody>. The first column mirrors the avatar + name cell.
export function SkeletonTableRows({ rows = 6, columns }: { rows?: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row} aria-hidden="true">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-3 py-3.5">
              {column === 0 ? (
                <div className="flex items-center gap-2">
                  <SkeletonBlock className="size-7 shrink-0 rounded-full" />
                  <div className="space-y-1.5"><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-2.5 w-14" /></div>
                </div>
              ) : (
                <SkeletonBlock className={`h-3 ${cellWidths[column % cellWidths.length]}`} />
              )}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// A table-shaped placeholder for areas that render no <table> while loading.
export function SkeletonTable({ rows = 6, columns = 5, announce = true }: { rows?: number; columns?: number; announce?: boolean }) {
  return (
    <div role={announce ? "status" : undefined} aria-live={announce ? "polite" : undefined} aria-busy="true">
      {announce && <LoadingStatus />}
      <div className="flex gap-6 border-b border-slate-200 bg-slate-50 px-4 py-3" aria-hidden="true">
        {Array.from({ length: columns }, (_, column) => <SkeletonBlock key={column} className="h-2.5 w-16" />)}
      </div>
      <div className="divide-y divide-slate-100" aria-hidden="true">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex items-center gap-6 px-4 py-3.5">
            <div className="flex w-40 shrink-0 items-center gap-2">
              <SkeletonBlock className="size-7 shrink-0 rounded-full" />
              <div className="space-y-1.5"><SkeletonBlock className="h-3 w-24" /><SkeletonBlock className="h-2.5 w-14" /></div>
            </div>
            {Array.from({ length: Math.max(0, columns - 1) }, (_, column) => (
              <SkeletonBlock key={column} className={`h-3 ${cellWidths[(column + 1) % cellWidths.length]}`} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${count >= 4 ? "xl:grid-cols-4" : "xl:grid-cols-3"}`} aria-hidden="true">
      {Array.from({ length: count }, (_, card) => (
        <div key={card} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <SkeletonBlock className="h-2.5 w-20" />
          <SkeletonBlock className="mt-3 h-7 w-14" />
          <SkeletonBlock className="mt-2.5 h-2.5 w-28" />
        </div>
      ))}
    </div>
  );
}

// Side panel placeholder (ticket detail, attendance detail).
export function SkeletonPanel() {
  return (
    <aside className="h-fit overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs" aria-hidden="true">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <SkeletonBlock className="size-8 rounded-lg" />
        <div className="space-y-1.5"><SkeletonBlock className="h-3 w-36" /><SkeletonBlock className="h-2.5 w-24" /></div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3"><SkeletonBlock className="h-9" /><SkeletonBlock className="h-9" /></div>
        <SkeletonBlock className="h-4 w-3/4" />
        <div className="space-y-2"><SkeletonBlock className="h-3" /><SkeletonBlock className="h-3" /><SkeletonBlock className="h-3 w-2/3" /></div>
        <SkeletonBlock className="h-20" />
      </div>
    </aside>
  );
}

// The sticky top bar (breadcrumb + account), for pages whose own header is not
// rendered yet.
export function SkeletonTopBar() {
  // Same 58px height and layout as components/AppHeader.tsx.
  return (
    <div className="sticky top-0 z-20 flex h-[58px] items-center justify-between border-b border-[#E2E8F0] bg-white px-3.5 sm:pr-4" aria-hidden="true">
      <div className="flex items-center gap-4"><SkeletonBlock className="size-7 rounded-[6px]" /><SkeletonBlock className="h-3.5 w-24" /><SkeletonBlock className="hidden h-3 w-40 md:block" /></div>
      <div className="flex items-center gap-4"><SkeletonBlock className="h-6 w-16 rounded-lg" /><SkeletonBlock className="size-6 rounded-lg" /><SkeletonBlock className="size-8 rounded-full" /><SkeletonBlock className="hidden h-3 w-20 sm:block" /></div>
    </div>
  );
}

function SkeletonForm() {
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs" aria-hidden="true">
      {[0, 1, 2].map((field) => <div key={field} className="space-y-2"><SkeletonBlock className="h-3 w-28" /><SkeletonBlock className="h-10" /></div>)}
      <div className="space-y-2"><SkeletonBlock className="h-3 w-28" /><SkeletonBlock className="h-28" /></div>
      <div className="flex justify-end gap-2"><SkeletonBlock className="h-9 w-20" /><SkeletonBlock className="h-9 w-28" /></div>
    </div>
  );
}

type PageSkeletonProps = {
  // Render the sticky top bar too (use when the page header is not on screen yet).
  withTopBar?: boolean;
  // Number of stat cards above the main content.
  stats?: number;
  layout?: "table" | "split" | "form";
  // Pages inside HrmsShell already have their own padded container.
  contained?: boolean;
};

export function PageSkeleton({ withTopBar = false, stats = 0, layout = "table", contained = true }: PageSkeletonProps) {
  const body = (
    <div className="space-y-5">
      <div className="space-y-2.5 pb-1" aria-hidden="true">
        <SkeletonBlock className="h-4 w-28 rounded-full" />
        <SkeletonBlock className="h-7 w-64 max-w-full" />
        <SkeletonBlock className="h-3.5 w-96 max-w-full" />
      </div>
      {stats > 0 && <SkeletonStatCards count={stats} />}
      {layout === "form" ? <SkeletonForm /> : (
        <div className={layout === "split" ? "flex flex-col gap-5 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_400px]" : ""}>
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5" aria-hidden="true"><SkeletonBlock className="h-8 w-36" /><SkeletonBlock className="hidden h-8 w-56 md:block" /></div>
            <SkeletonTable rows={7} columns={5} announce={false} />
          </section>
          {layout === "split" && <SkeletonPanel />}
        </div>
      )}
    </div>
  );

  return (
    <div className={withTopBar ? "min-h-screen bg-white" : undefined} role="status" aria-live="polite" aria-busy="true">
      <LoadingStatus />
      {withTopBar && <SkeletonTopBar />}
      {contained ? <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">{body}</div> : body}
    </div>
  );
}
