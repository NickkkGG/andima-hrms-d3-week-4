// Shared class strings that follow the class design system (reference: the
// Andima CCR app, branch feat/C1-Rev-26Nov). Pages compose these instead of
// writing their own button, input, card, and badge styles, so every D3 screen
// looks the same. Every class is written out in full so Tailwind can find it.

export type ButtonVariant = "primary" | "secondary" | "danger" | "dangerOutline" | "success" | "ghost";
export type ButtonSize = "md" | "sm";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-60";

const buttonSizes: Record<ButtonSize, string> = {
  md: "px-4 py-2 text-sm",
  sm: "px-3 py-2 text-xs",
};

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-[#3B6FF5] text-white hover:bg-blue-600",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50",
  danger: "bg-[#DC2626] text-white hover:bg-red-700",
  dangerOutline: "border border-red-200 bg-white text-red-700 shadow-xs hover:bg-red-50",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
  ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]}${extra ? ` ${extra}` : ""}`;
}

export function iconButtonClass(tone: "default" | "danger" = "default", extra = "") {
  const toneClass = tone === "danger" ? "text-rose-700 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900";
  return `inline-flex size-8 shrink-0 items-center justify-center rounded transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}${extra ? ` ${extra}` : ""}`;
}

// No background, padding-x, or text size in the base: Tailwind v4 orders
// conflicting utilities by its own rules, not by their position in the class
// string, so variants must not stack two values of the same property.
const inputBase =
  "w-full rounded-xl border border-slate-200 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function inputClass(extra = "") {
  return `${inputBase} bg-white px-3 text-sm${extra ? ` ${extra}` : ""}`;
}

// Search fields carry a 16px icon placed at left-3.5 by the caller. White like the
// other inputs, so a search box sitting on the grey page background stays visible.
export const searchInputClass = `${inputBase} bg-white pl-10 pr-3 text-xs`;

export const labelClass = "mb-1.5 block text-xs font-semibold text-slate-700";

export const cardClass = "rounded-2xl border border-slate-200 bg-white shadow-xs";

// Page background behind the white header and cards. Same light grey as the
// CCR pages (bg-[#F8FAFC]), so the white top bar and cards stand out from the page.
export const pageBgClass = "bg-[#F8FAFC]";

export type BadgeTone = "blue" | "green" | "amber" | "red" | "slate" | "violet";

const badgeTones: Record<BadgeTone, string> = {
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function badgeClass(tone: BadgeTone, extra = "") {
  return `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${badgeTones[tone]}${extra ? ` ${extra}` : ""}`;
}

export const tableClass = {
  wrap: "overflow-x-auto rounded-xl border border-slate-200 bg-white",
  table: "w-full border-collapse text-left text-xs",
  head: "bg-slate-50 text-xs font-semibold text-slate-500",
  headCell: "px-4 py-3 font-semibold",
  row: "border-t border-slate-100 transition-colors hover:bg-slate-50",
  // Use instead of `row` (not together): Tailwind would let the row hover win over the selected fill.
  rowSelected: "border-t border-slate-100 bg-blue-50/60 shadow-[inset_3px_0_0_#3B6FF5] transition-colors",
  cell: "px-4 py-3 text-xs text-slate-700",
};

export const pageTitleClass = {
  eyebrow: "text-[11px] font-bold uppercase tracking-[0.08em] text-[#3B6FF5]",
  title: "text-2xl font-bold tracking-tight text-slate-900",
  subtitle: "mt-1 text-sm text-slate-500",
};

// Segmented tabs and filter chips (same look as the EN/ID switch).
export const segmentedClass = {
  group: "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100/80 p-0.5",
  // Font weight lives in active/idle only: two weights in one class string would not stack predictably.
  item: "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs transition cursor-pointer",
  active: "bg-white text-blue-700 shadow-xs font-bold",
  idle: "font-semibold text-slate-500 hover:text-slate-800",
};

export const modalClass = {
  overlay: "fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[4px]",
  panel: "w-full rounded-2xl border border-slate-200 bg-white shadow-2xl",
  title: "text-lg font-bold text-slate-900",
};
