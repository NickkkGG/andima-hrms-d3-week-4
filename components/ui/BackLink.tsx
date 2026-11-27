import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

// The back link agreed in the class design system: a plain left arrow before
// the label, like "Back to Overdue Alerts" in the CCR app.
export default function BackLink({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 text-xs font-bold text-slate-600 transition hover:text-blue-700${className ? ` ${className}` : ""}`}
    >
      <ArrowLeft className="size-4 shrink-0 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
      <span>{children}</span>
    </Link>
  );
}
