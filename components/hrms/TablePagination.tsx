"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import { pageList, paginationClass as p } from "@/components/ui/pagination";

type TablePaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
};

// Table footer pagination in the class design system style: summary on the
// left, a rounded capsule with numbered pages on the right.
export default function TablePagination({ page, pageSize, totalItems, onPageChange }: TablePaginationProps) {
  const { language } = useLanguage();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  if (totalItems <= pageSize) return null;

  const isId = language === "id";
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <nav aria-label={isId ? "Navigasi halaman tabel" : "Table page navigation"} className={`${p.nav} border-t border-slate-200 bg-white px-4 py-3`}>
      <p className={p.info}>
        {isId ? "Menampilkan" : "Showing"} <span className={p.number}>{start}–{end}</span> {isId ? "dari" : "of"} <span className={p.number}>{totalItems}</span>
        <span className="text-slate-400">·</span>
        {isId ? "Halaman" : "Page"} <span className={p.number}>{currentPage}</span> {isId ? "dari" : "of"} <span className={p.number}>{totalPages}</span>
      </p>
      <div className={p.capsule}>
        <button type="button" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} aria-label={isId ? "Halaman sebelumnya" : "Previous page"} className={`${p.arrow} ${currentPage === 1 ? p.arrowDisabled : p.arrowEnabled}`}>
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <div className="flex items-center gap-1">
          {pageList(currentPage, totalPages).map((item, index) => item === "..." ? (
            <span key={`gap-${index}`} className={p.ellipsis}>...</span>
          ) : (
            <button key={item} type="button" onClick={() => onPageChange(item)} aria-current={item === currentPage ? "page" : undefined} aria-label={`${isId ? "Halaman" : "Page"} ${item}`} className={`${p.page} ${item === currentPage ? p.pageActive : p.pageIdle}`}>
              {item}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} aria-label={isId ? "Halaman berikutnya" : "Next page"} className={`${p.arrow} ${currentPage === totalPages ? p.arrowDisabled : p.arrowEnabled}`}>
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
