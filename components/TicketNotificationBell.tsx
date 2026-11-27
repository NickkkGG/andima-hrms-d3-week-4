"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  buildTicketNotifications,
  loadTicketNotificationSource,
  readTicketNotificationIds,
  ticketNotificationCopy,
  writeTicketNotificationIds,
  type TicketNotification,
  type TicketNotificationSource,
} from "@/lib/ticket-notifications";

function formatNotificationDate(value: string, language: "id" | "en") {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

const dotClass: Record<TicketNotification["kind"], string> = {
  submitted: "bg-emerald-500",
  overdue: "bg-[#DC2626]",
  status: "bg-[#14B8A6]",
  followup: "bg-[#3B6FF5]",
};

export function TicketNotificationButton({ count, isOpen, onToggle }: { count: number; isOpen: boolean; onToggle: () => void }) {
  const { language } = useLanguage();
  const copy = ticketNotificationCopy(language);
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-label={count > 0 ? `${copy.notifications}, ${copy.newNotifications}` : copy.notifications}
      className="relative cursor-pointer rounded-lg p-1.5 text-[#334155] transition-colors hover:bg-slate-100"
    >
      <Bell className="size-[18px]" strokeWidth={1.9} />
      {count > 0 && (
        <span className="absolute -right-1 -top-0.5 flex size-4 items-center justify-center rounded-full bg-[#DC2626] text-[9.5px] font-bold leading-none text-white shadow-2xs" aria-hidden="true">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

export function TicketNotificationPanel({
  isManager,
  notifications,
  isLoading,
  onRefresh,
  onReadAll,
  onSelect,
}: {
  isManager: boolean;
  notifications: TicketNotification[];
  isLoading: boolean;
  onRefresh: () => void;
  onReadAll: () => void;
  onSelect: (ticketId: string, notificationId: string) => void;
}) {
  const { language } = useLanguage();
  const copy = language === "id"
    ? { title: isManager ? "Tiket masuk & tenggat" : "Pembaruan tiket Anda", sync: "Disinkronkan setiap 15 detik", readAll: "Baca semua", refresh: "Muat ulang notifikasi", empty: isManager ? "Tidak ada tiket baru atau tiket yang melewati tenggat." : "Belum ada pembaruan dari HR untuk tiket Anda." }
    : { title: isManager ? "Incoming & overdue tickets" : "Your ticket updates", sync: "Synchronizes every 15 seconds", readAll: "Read all", refresh: "Refresh notifications", empty: isManager ? "No new or overdue tickets." : "HR has not updated your tickets yet." };

  return (
    <section aria-label={copy.title} className="absolute right-2 top-[54px] z-50 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:top-[62px] max-sm:w-auto">
      <div className="flex items-center justify-between gap-3 border-b border-[#F1F5F9] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-[#121B2E]">{copy.title}</p>
          <p className="mt-0.5 text-[10.5px] text-[#64748B]">{copy.sync}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button type="button" onClick={onReadAll} disabled={notifications.length === 0} className="cursor-pointer text-[11px] font-semibold text-[#3B6FF5] hover:underline disabled:cursor-not-allowed disabled:opacity-45 disabled:no-underline">{copy.readAll}</button>
          <button type="button" onClick={onRefresh} disabled={isLoading} className="inline-flex size-7 cursor-pointer items-center justify-center rounded text-slate-500 transition hover:bg-slate-100 disabled:opacity-50" aria-label={copy.refresh}>
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>
      <div className="max-h-80 divide-y divide-[#F1F5F9] overflow-y-auto text-[12px]">
        {notifications.length === 0 ? (
          <p className="px-3.5 py-6 text-center text-[11.5px] text-[#64748B]">{copy.empty}</p>
        ) : notifications.map((notification) => (
          <button key={notification.id} type="button" onClick={() => onSelect(notification.ticketId, notification.id)} className="flex w-full cursor-pointer items-start gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50">
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dotClass[notification.kind]}`} />
            <span className="min-w-0">
              <span className="block truncate font-semibold text-[#121B2E]">{notification.ticketTitle}</span>
              <span className="mt-0.5 block text-[11px] leading-4 text-[#64748B] [overflow-wrap:anywhere]">{notification.message}</span>
              <span className="mt-1 block text-[10.5px] text-slate-400">{formatNotificationDate(notification.at, language)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

// Closes a popover when the user clicks outside it or presses Escape.
export function useDismiss(isOpen: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);
  return ref;
}

type BellState = {
  status: "loading" | "ready" | "none";
  source: TicketNotificationSource | null;
  syncedAt: number;
  readIds: string[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  markRead: (ids: string[]) => void;
};

const BellContext = createContext<BellState | null>(null);

const isTicketRoute = (pathname: string) => pathname === "/employee-report-ticket" || pathname.startsWith("/employee-report-ticket/");

// Lives in the app shell, so the bell keeps its data while the user moves
// between pages (no reload, no header jump on every navigation). It pauses on
// the ticket page, which loads the same tickets itself and feeds its own bell.
export function TicketNotificationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const onTicketPage = isTicketRoute(pathname);
  const [status, setStatus] = useState<BellState["status"]>("loading");
  const [source, setSource] = useState<TicketNotificationSource | null>(null);
  const [syncedAt, setSyncedAt] = useState(0);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const next = await loadTicketNotificationSource(createClient());
      setSource(next);
      setStatus(next ? "ready" : "none");
      setSyncedAt(Date.now());
      if (next) setReadIds(readTicketNotificationIds(next.authUserId));
    } catch {
      // Keep the last list; the bell is a convenience, not the ticket page.
      setStatus((current) => (current === "loading" ? "none" : current));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load when the shell mounts and again after leaving the ticket page (read
  // state may have changed there), then sync every 15 s while the tab is visible.
  useEffect(() => {
    if (onTicketPage) return;
    const first = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 15_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(interval);
    };
  }, [onTicketPage, refresh]);

  const markRead = useCallback((ids: string[]) => {
    if (!source) return;
    setReadIds((current) => writeTicketNotificationIds(source.authUserId, [...current, ...ids]));
  }, [source]);

  const value = useMemo<BellState>(() => ({ status, source, syncedAt, readIds, isLoading, refresh, markRead }), [status, source, syncedAt, readIds, isLoading, refresh, markRead]);
  return <BellContext.Provider value={value}>{children}</BellContext.Provider>;
}

// The bell for every D3 page except the ticket page, which feeds the same
// button and panel from its own already-loaded tickets.
export default function TicketNotificationBell() {
  const router = useRouter();
  const { language } = useLanguage();
  const bell = useContext(BellContext);
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => setIsOpen(false), []);
  const wrapperRef = useDismiss(isOpen, close);

  const notifications = useMemo(() => {
    if (!bell?.source) return [];
    const read = new Set(bell.readIds);
    return buildTicketNotifications({ role: bell.source.role, viewerEmployeeId: bell.source.viewerEmployeeId, tickets: bell.source.tickets, syncedAt: bell.syncedAt, language })
      .filter((notification) => !read.has(notification.id));
  }, [bell, language]);

  // While the first load runs the button is shown with no count, so the header
  // does not shift when the data arrives.
  if (!bell || bell.status === "none") return null;
  const source = bell.source;

  return (
    <div ref={wrapperRef} className="flex h-full items-center">
      <TicketNotificationButton count={notifications.length} isOpen={isOpen} onToggle={() => { if (source) setIsOpen((open) => !open); }} />
      {isOpen && source && (
        <TicketNotificationPanel
          isManager={source.role !== "EMPLOYEE"}
          notifications={notifications}
          isLoading={bell.isLoading}
          onRefresh={() => void bell.refresh()}
          onReadAll={() => bell.markRead(notifications.map((notification) => notification.id))}
          onSelect={(ticketId, notificationId) => {
            bell.markRead([notificationId]);
            setIsOpen(false);
            router.push(`/employee-report-ticket?ticket=${encodeURIComponent(ticketId)}`);
          }}
        />
      )}
    </div>
  );
}
