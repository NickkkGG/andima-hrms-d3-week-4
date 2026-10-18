"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

export default function TablePagination({ page, pageSize, totalItems, onPageChange }: TablePaginationProps) {
  const { language } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  if (totalItems <= pageSize) return null;

  return (
    <nav aria-label={language === "id" ? "Navigasi halaman tabel" : "Table page navigation"} className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d9e2fc] bg-white px-4 py-3">
      <p className="text-xs text-[#4d5f81]">
        {language === "id" ? "Halaman" : "Page"} <span className="font-bold text-[#121b2e]">{currentPage}</span> {language === "id" ? "dari" : "of"} <span className="font-bold text-[#121b2e]">{totalPages}</span>
        <span className="hidden sm:inline"> · {totalItems} {language === "id" ? "data" : "records"}</span>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#bcd4ee] bg-white px-2.5 text-[11px] font-bold text-[#1e3765] transition hover:border-[#0c68d5] hover:text-[#0c68d5] disabled:cursor-not-allowed disabled:opacity-45">
          <ChevronLeft size={14} aria-hidden="true" />{language === "id" ? "Sebelumnya" : "Previous"}
        </button>
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="inline-flex h-8 items-center gap-1 rounded-md border border-[#bcd4ee] bg-white px-2.5 text-[11px] font-bold text-[#1e3765] transition hover:border-[#0c68d5] hover:text-[#0c68d5] disabled:cursor-not-allowed disabled:opacity-45">
          {language === "id" ? "Berikutnya" : "Next"}<ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
