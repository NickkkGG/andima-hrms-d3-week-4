"use client";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import { badgeClass, type BadgeTone } from "@/components/ui/styles";

interface EmployeeSyncHistoryItem {
  id: string;
  event_kind: string;
  message: string;
  created_at: string;
}

function formatTimestamp(value: string, language: "id" | "en") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  // Build the text ourselves: Intl's date/time separator can differ between
  // Node and browsers even when both use the same locale and time zone.
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  const months = language === "id"
    ? ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[Number(part("month")) - 1];
  return `${part("day")} ${month} ${part("year")}, ${part("hour")}:${part("minute")}`;
}

function eventLabel(kind: string, language: "id" | "en") {
  const labels = language === "id"
    ? { CREATED: "Pegawai dibuat", MATCHED: "Pegawai dikaitkan", WAITING_MASTER: "Menunggu master", AMBIGUOUS_IDENTIFIER: "Perlu ditinjau", SYNC_ERROR: "Sinkronisasi gagal" }
    : { CREATED: "Employee created", MATCHED: "Employee linked", WAITING_MASTER: "Waiting for master data", AMBIGUOUS_IDENTIFIER: "Needs review", SYNC_ERROR: "Synchronization failed" };
  switch (kind) {
    case "CREATED": return labels.CREATED;
    case "MATCHED": return labels.MATCHED;
    case "WAITING_MASTER": return labels.WAITING_MASTER;
    case "AMBIGUOUS_IDENTIFIER": return labels.AMBIGUOUS_IDENTIFIER;
    case "SYNC_ERROR": return labels.SYNC_ERROR;
    default: return kind;
  }
}

function eventTone(kind: string): BadgeTone {
  switch (kind) {
    case "CREATED": return "green";
    case "MATCHED": return "blue";
    case "WAITING_MASTER": return "amber";
    default: return "red";
  }
}

export default function EmployeeSyncHistory({ events }: { events: EmployeeSyncHistoryItem[] }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { title: "Riwayat sinkronisasi pegawai", description: "Data baru dari registrasi B2 dengan status PROVISIONED disinkronkan otomatis.", empty: "Belum ada riwayat sinkronisasi." } : { title: "Employee synchronization history", description: "New B2 registration data with PROVISIONED status is synchronized automatically.", empty: "No synchronization history yet." };
  return (
    <section>
      <div>
        <h2 className="text-sm font-bold text-slate-900">{copy.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{copy.description}</p>
      </div>
      {events.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{copy.empty}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {events.map((event) => (
            <li className="flex flex-col gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between" key={event.id}>
              <div>
                <span className={badgeClass(eventTone(event.event_kind))}>{eventLabel(event.event_kind, language)}</span>
                <p className="mt-2 text-sm font-medium text-slate-700">{event.message}</p>
              </div>
              <time className="shrink-0 text-xs text-slate-500" dateTime={event.created_at}>{formatTimestamp(event.created_at, language)}</time>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
