"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import { buttonClass } from "@/components/ui/styles";

export default function ResetFilters({ href }: { href: string }) {
  const router = useRouter();
  return (
    <button type="reset" onClick={() => router.push(href)} className={buttonClass("secondary")}>
      <RotateCcw size={15} aria-hidden="true" /><LocalizedText id="Reset" en="Reset" />
    </button>
  );
}
