"use client";

import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePlus2,
  Filter,
  MessageSquareText,
  Paperclip,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import AppHeader from "@/components/AppHeader";
import { TicketNotificationButton, TicketNotificationPanel, useDismiss } from "@/components/TicketNotificationBell";
import { buildTicketNotifications, readTicketNotificationIds, writeTicketNotificationIds } from "@/lib/ticket-notifications";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import TablePagination from "@/components/hrms/TablePagination";
import { PageSkeleton, SkeletonPanel, SkeletonTableRows } from "@/components/hrms/Skeleton";
import { badgeClass, buttonClass, cardClass, iconButtonClass, inputClass, labelClass, modalClass, pageTitleClass, searchInputClass, segmentedClass, tableClass, type BadgeTone, pageBgClass } from "@/components/ui/styles";

type TicketStatus = "PENDING" | "TODO" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
type ViewRole = "manager" | "employee";
type AppRole = "EMPLOYEE" | "HR" | "MANAGER";

type Activity = {
  id: string;
  kind: "status" | "followup" | "created" | "due";
  message: string;
  toStatus?: TicketStatus;
  actor: string;
  actorEmployeeId: string | null;
  at: string;
};

type TicketItem = {
  dbId: string;
  id: string;
  employeeUuid: string;
  employeeId: string;
  employeeName: string;
  department: string;
  title: string;
  category: string;
  description: string;
  occurredAt?: string;
  createdAt: string;
  updatedAt: string;
  status: TicketStatus;
  dueAt?: string;
  attachment?: { fileName: string; storagePath: string };
  history: Activity[];
};

type CreateTicketInput = {
  title: string;
  category: string;
  description: string;
  occurredAt?: string;
  attachment?: File;
};

const statusMeta: Record<TicketStatus, { tone: BadgeTone }> = {
  PENDING: { tone: "slate" },
  TODO: { tone: "blue" },
  IN_PROGRESS: { tone: "amber" },
  RESOLVED: { tone: "green" },
  REJECTED: { tone: "red" },
};

// Compact control (select, date) used in the ticket settings and the 24-hour
// date/time picker: the same look as inputClass at a smaller height.
const compactControlClass = "rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-800 outline-none transition focus:border-[#3B6FF5] focus:ring-2 focus:ring-[#3B6FF5]/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function statusLabel(status: TicketStatus, language: "id" | "en") {
  const labels = language === "id"
    ? { PENDING: "Menunggu", TODO: "Dikerjakan", IN_PROGRESS: "Diproses", RESOLVED: "Selesai", REJECTED: "Ditolak" }
    : { PENDING: "Pending", TODO: "To do", IN_PROGRESS: "In progress", RESOLVED: "Resolved", REJECTED: "Rejected" };
  return labels[status];
}

type TicketSort = "NEWEST" | "DUE_DATE";

function compareTicketsByNewest(first: TicketItem, second: TicketItem) {
  return Date.parse(second.createdAt) - Date.parse(first.createdAt);
}

// "Due date" order: open tickets with the nearest due date first (overdue ones
// end up on top), then open tickets without a due date, then resolved/rejected
// ones. Within the last two groups the newest submission comes first.
const closedStatuses = new Set<TicketStatus>(["RESOLVED", "REJECTED"]);
function compareTicketsByDueDate(first: TicketItem, second: TicketItem) {
  const firstOpen = !closedStatuses.has(first.status);
  const secondOpen = !closedStatuses.has(second.status);
  if (firstOpen !== secondOpen) return firstOpen ? -1 : 1;
  if (firstOpen) {
    const firstDue = first.dueAt ? Date.parse(first.dueAt) : Number.NaN;
    const secondDue = second.dueAt ? Date.parse(second.dueAt) : Number.NaN;
    const firstHasDue = !Number.isNaN(firstDue);
    const secondHasDue = !Number.isNaN(secondDue);
    if (firstHasDue && secondHasDue && firstDue !== secondDue) return firstDue - secondDue;
    if (firstHasDue !== secondHasDue) return firstHasDue ? -1 : 1;
  }
  return compareTicketsByNewest(first, second);
}

const categories = ["Workplace facility", "System access", "Safety", "Work arrangement", "Operational issue", "Other"];
// Categories are stored in English (d3_tickets.category); these are the labels shown per language.
const categoryLabels: Record<string, string> = {
  "Workplace facility": "Fasilitas kerja",
  "System access": "Akses sistem",
  Safety: "Keselamatan",
  "Work arrangement": "Pengaturan kerja",
  "Operational issue": "Kendala operasional",
  Other: "Lainnya",
};
function categoryLabel(category: string, language: "id" | "en") {
  return language === "id" ? categoryLabels[category] ?? category : category;
}
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const allowedAttachmentTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// Form limits. They sit inside the database CHECK constraints on d3_tickets and
// d3_ticket_followups (title 3-160, description 10-4000, note 3-2000), so the
// form rejects oversized input before any request reaches Supabase.
const TICKET_LIMITS = {
  titleMin: 3,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  followUpMin: 3,
  followUpMax: 1000,
  searchMax: 100,
  fileNameMax: 120,
} as const;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function isAllowedTicketImage(file: File) {
  return allowedAttachmentTypes.has(file.type);
}

// Collapse whitespace so a value padded with spaces or line breaks cannot slip
// past the length checks.
function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanMultilineText(value: string) {
  return value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function parseLocalDateTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

function shortText(value: string, max = 80) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const { language } = useLanguage();
  const meta = statusMeta[status];
  return (
    <span className={badgeClass(meta.tone, "w-fit")}>
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabel(status, language)}
    </span>
  );
}

function formatDate(value: string, language: "id" | "en", withTime = false) {
  return new Intl.DateTimeFormat(language === "id" ? "id-ID" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    // Always 24-hour (00–23), the same as the time pickers below (BUG-D3-009).
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" as const } : {}),
  }).format(new Date(value));
}

// "YYYY-MM-DD" for a date in the browser's local time zone.
function localDateString(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, "0"));

type DateTimeValue = { value: string; isPartial: boolean };

function splitDateTimeLocal(value?: string) {
  const [date = "", time = ""] = (value ?? "").split("T");
  const [hour = "", minute = ""] = time.split(":");
  return { date, hour, minute };
}

// BUG-D3-009: the browser's datetime-local control follows the browser locale
// (AM/PM on an en-US Chrome) while the ticket detail shows 24-hour times. The
// time is therefore picked from 00–23 and 00–59 lists. The value has the same
// "YYYY-MM-DDTHH:mm" shape as datetime-local, so the existing checks still apply.
// The date input is left uncontrolled on purpose: a controlled date input loses a
// half-typed date whenever the page re-renders (the ticket list syncs every 15 s).
function DateTimeField({ id, initialValue, minDate, maxDate, disabled, onChange }: { id: string; initialValue?: string; minDate?: string; maxDate?: string; disabled?: boolean; onChange: (next: DateTimeValue) => void }) {
  const { language } = useLanguage();
  const initial = splitDateTimeLocal(initialValue);
  const [parts, setParts] = useState({ ...initial, isDateIncomplete: false });
  const labels = language === "id" ? { date: "Tanggal", hour: "Jam", minute: "Menit" } : { date: "Date", hour: "Hour", minute: "Minute" };

  function update(change: Partial<typeof parts>) {
    const next = { ...parts, ...change };
    setParts(next);
    const value = next.date && next.hour && next.minute ? `${next.date}T${next.hour}:${next.minute}` : "";
    onChange({ value, isPartial: next.isDateIncomplete || (!value && Boolean(next.date || next.hour || next.minute)) });
  }

  const controlClass = `${compactControlClass} tabular-nums`;
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <input id={id} type="date" aria-label={labels.date} disabled={disabled} defaultValue={initial.date} min={minDate} max={maxDate} onChange={(event) => update({ date: event.target.value, isDateIncomplete: event.target.validity.badInput })} className={`${controlClass} min-w-0 flex-1`} />
      <select aria-label={labels.hour} disabled={disabled} value={parts.hour} onChange={(event) => update({ hour: event.target.value })} className={controlClass}><option value="">--</option>{HOUR_OPTIONS.map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select>
      <span aria-hidden="true" className="text-xs font-bold text-slate-500">{language === "id" ? "." : ":"}</span>
      <select aria-label={labels.minute} disabled={disabled} value={parts.minute} onChange={(event) => update({ minute: event.target.value })} className={controlClass}><option value="">--</option>{MINUTE_OPTIONS.map((minute) => <option key={minute} value={minute}>{minute}</option>)}</select>
    </div>
  );
}

// HR edits the due date as a draft and saves it explicitly, so picking the date,
// hour, and minute one by one does not trigger three separate saves.
function DueDateEditor({ ticket, disabled, onSave }: { ticket: TicketItem; disabled: boolean; onSave: (dueAt: string | null) => void }) {
  const { language } = useLanguage();
  const copy = language === "id"
    ? { dueDate: "Batas waktu", save: "Simpan", incomplete: "Lengkapi tanggal, jam, dan menit.", hint: "Format 24 jam. Kosongkan semuanya lalu simpan untuk menghapus batas waktu." }
    : { dueDate: "Due date", save: "Save", incomplete: "Complete the date, hour, and minute.", hint: "24-hour format. Clear all fields and save to remove the due date." };
  const saved = toDateTimeLocal(ticket.dueAt);
  const [draft, setDraft] = useState<DateTimeValue>({ value: saved, isPartial: false });
  const canSave = !disabled && !draft.isPartial && draft.value !== saved;
  const fieldId = `due-date-${ticket.dbId}`;

  return (
    <div className="grid sm:col-span-2">
      <label htmlFor={fieldId} className={labelClass}>{copy.dueDate}</label>
      <div className="flex items-center gap-2">
        <DateTimeField id={fieldId} initialValue={saved} minDate={localDateString(new Date(ticket.createdAt))} disabled={disabled} onChange={setDraft} />
        <button type="button" disabled={!canSave} onClick={() => onSave(draft.value || null)} className={buttonClass("primary", "sm", "shrink-0")}>{copy.save}</button>
      </div>
      <p className={`mt-1.5 text-[11px] ${draft.isPartial ? "font-semibold text-red-600" : "text-slate-500"}`}>{draft.isPartial ? copy.incomplete : copy.hint}</p>
    </div>
  );
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function EmployeeReportTicketPage() {
  const { t, language } = useLanguage();
  const copy = language === "id" ? { search: "Cari tiket, pegawai...", employeeFallback: "Pegawai", hrManager: "HR / Manajer", notifications: "Notifikasi tiket", ticketList: "Daftar tiket", description: "Catat, tindak lanjuti, dan pantau kebutuhan pekerjaan secara terstruktur.", all: "Semua", noTickets: "Belum ada tiket yang sesuai dengan filter.", showing: "Menampilkan", of: "dari", tickets: "tiket", employee: "Karyawan", submitted: "Diajukan", status: "Status", dueDate: "Batas waktu", noDueDate: "Belum ditentukan", openDetail: "Buka detail", rowHint: "Klik baris tiket untuk membuka detailnya.", sortBy: "Urutkan tiket", newest: "Terbaru", ticket: "Tiket", create: "Buat tiket", loadError: "Tiket belum dapat dimuat. Silakan coba lagi.", historyError: "Sebagian riwayat tiket belum dapat dimuat.", ticketCreated: "Tiket berhasil diajukan.", followUpAdded: "Tindak lanjut ditambahkan.", hrNewTicket: (name: string, department: string) => `Tiket baru dari ${name}${department && department !== "-" ? ` · ${department}` : ""}.`, hrOverdue: "Melewati batas waktu dan belum selesai.", employeeStatus: (status: TicketStatus) => ({ PENDING: "Status tiket Anda dikembalikan ke Menunggu.", TODO: "Tiket Anda sudah diterima HR dan masuk antrean.", IN_PROGRESS: "Tiket Anda sedang ditangani HR.", RESOLVED: "Tiket Anda sudah diselesaikan.", REJECTED: "Tiket Anda ditolak. Lihat riwayat tiket untuk keterangannya." })[status], employeeFollowUp: (note: string) => `HR menambahkan tindak lanjut: "${shortText(note)}"`, newNotifications: "ada notifikasi baru", dueUpdated: "Batas waktu diperbarui.", dueInvalid: "Batas waktu tidak valid. Pilih waktu setelah tiket diajukan dan paling lambat satu tahun ke depan.", followUpLength: `Tindak lanjut harus ${TICKET_LIMITS.followUpMin}–${TICKET_LIMITS.followUpMax} karakter.`, updateFailed: "Pengaturan tiket belum berhasil diperbarui.", updated: "Pengaturan tiket diperbarui.", followUpFailed: "Tindak lanjut belum berhasil disimpan.", followUpSaved: "Tindak lanjut tersimpan di riwayat tiket.", accessUnavailable: "Akses karyawan belum siap. Login ulang lalu coba lagi.", titleLength: `Judul tiket harus ${TICKET_LIMITS.titleMin}–${TICKET_LIMITS.titleMax} karakter.`, descriptionLength: `Deskripsi harus ${TICKET_LIMITS.descriptionMin}–${TICKET_LIMITS.descriptionMax} karakter.`, categoryInvalid: "Pilih kategori dari daftar yang tersedia.", occurredInvalid: "Waktu kejadian tidak boleh di masa depan atau lebih dari satu tahun yang lalu.", imageType: "Lampiran hanya boleh berupa gambar JPG, PNG, atau WebP.", imageSize: "Lampiran gambar maksimal 5 MB.", createFailed: "Tiket belum berhasil dibuat. Periksa kembali data lalu coba lagi.", attachmentUpload: (id: string) => `${id} dibuat, tetapi lampiran belum berhasil diunggah.`, attachmentMetadata: (id: string) => `${id} dibuat, tetapi metadata lampiran belum tersimpan.`, created: (id: string) => `${id} berhasil dibuat.`, attachmentOpen: "Lampiran belum dapat dibuka." } : { search: "Search tickets or employees...", employeeFallback: "Employee", hrManager: "HR / Manager", notifications: "Ticket notifications", ticketList: "Ticket list", description: "Record, follow up, and monitor work needs in a structured workflow.", all: "All", noTickets: "No tickets match the current filter.", showing: "Showing", of: "of", tickets: "tickets", employee: "Employee", submitted: "Submitted", status: "Status", dueDate: "Due date", noDueDate: "Not set", openDetail: "Open details", rowHint: "Click a ticket row to open its details.", sortBy: "Sort tickets", newest: "Newest", ticket: "Ticket", create: "Create ticket", loadError: "Tickets could not be loaded. Please try again.", historyError: "Some ticket history could not be loaded.", ticketCreated: "Ticket submitted successfully.", followUpAdded: "Follow-up added.", hrNewTicket: (name: string, department: string) => `New ticket from ${name}${department && department !== "-" ? ` · ${department}` : ""}.`, hrOverdue: "Past its due date and not finished yet.", employeeStatus: (status: TicketStatus) => ({ PENDING: "Your ticket was moved back to Pending.", TODO: "HR received your ticket and queued it.", IN_PROGRESS: "HR is working on your ticket.", RESOLVED: "Your ticket has been resolved.", REJECTED: "Your ticket was rejected. Check the ticket history for details." })[status], employeeFollowUp: (note: string) => `HR added a follow-up: "${shortText(note)}"`, newNotifications: "new notifications", dueUpdated: "Due date updated.", dueInvalid: "Invalid due date. Choose a time after the ticket was submitted and within one year from now.", followUpLength: `Follow-up must be ${TICKET_LIMITS.followUpMin}–${TICKET_LIMITS.followUpMax} characters.`, updateFailed: "Ticket settings could not be updated.", updated: "Ticket settings updated.", followUpFailed: "Follow-up could not be saved.", followUpSaved: "Follow-up saved in ticket history.", accessUnavailable: "Employee access is not ready. Sign in again and retry.", titleLength: `Ticket title must be ${TICKET_LIMITS.titleMin}–${TICKET_LIMITS.titleMax} characters.`, descriptionLength: `Description must be ${TICKET_LIMITS.descriptionMin}–${TICKET_LIMITS.descriptionMax} characters.`, categoryInvalid: "Choose a category from the list.", occurredInvalid: "The occurrence time cannot be in the future or more than one year ago.", imageType: "Attachments must be JPG, PNG, or WebP images.", imageSize: "Image attachments must be at most 5 MB.", createFailed: "Ticket could not be created. Check the details and try again.", attachmentUpload: (id: string) => `${id} was created, but the attachment could not be uploaded.`, attachmentMetadata: (id: string) => `${id} was created, but its attachment metadata could not be saved.`, created: (id: string) => `${id} created successfully.`, attachmentOpen: "Attachment could not be opened." };
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [viewRole, setViewRole] = useState<ViewRole>("employee");
  const [appRole, setAppRole] = useState<AppRole | null>(null);
  const [viewerName, setViewerName] = useState("");
  const [viewerEmployeeId, setViewerEmployeeId] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [isAccountLoading, setIsAccountLoading] = useState(true);
  const [isTicketLoading, setIsTicketLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TicketStatus>("ALL");
  const [ticketSort, setTicketSort] = useState<TicketSort>("NEWEST");
  const [tablePage, setTablePage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // The skeleton is shown only for the first load. Later reloads (the 15-second
  // sync, saving, language switch) refresh in place so the table and an open
  // form are not replaced while someone is using them.
  const hasLoadedTicketsRef = useRef(false);
  const [notice, setNotice] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const closeNotifications = useCallback(() => setIsNotificationOpen(false), []);
  const notificationRef = useDismiss(isNotificationOpen, closeNotifications);
  // A notification opened from the bell on another page arrives as ?ticket=CODE.
  const requestedTicketRef = useRef<string | null>(null);
  const hasReadTicketParamRef = useRef(false);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);

  async function loadTickets(actorEmployeeId = viewerEmployeeId, actorName = viewerName) {
    const supabase = createClient();
    if (hasLoadedTicketsRef.current) setIsRefreshing(true);
    else setIsTicketLoading(true);
    const { data: ticketRows, error: ticketError } = await supabase
      .from("d3_tickets")
      .select("id, ticket_code, employee_id, reporter_name, reporter_employee_code, reporter_department, title, category, description, occurred_at, status, due_at, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (ticketError) {
      showNotice(copy.loadError);
      setIsTicketLoading(false);
      setIsRefreshing(false);
      return;
    }

    const ticketIds = (ticketRows ?? []).map((ticket) => ticket.id);
    const [historyResult, followUpResult, attachmentResult] = ticketIds.length
      ? await Promise.all([
          supabase.from("d3_ticket_history").select("id, ticket_id, actor_employee_id, event_type, from_status, to_status, note, created_at").in("ticket_id", ticketIds).order("created_at"),
          supabase.from("d3_ticket_followups").select("id, ticket_id, actor_employee_id, note, follow_up_at, created_at").in("ticket_id", ticketIds).order("created_at"),
          supabase.from("d3_ticket_attachments").select("ticket_id, file_name, storage_path").in("ticket_id", ticketIds).order("created_at"),
        ])
      : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];

    if (historyResult.error || followUpResult.error || attachmentResult.error) {
      showNotice(copy.historyError);
    }

    const reporterByTicket = new Map((ticketRows ?? []).map((ticket) => [ticket.id, { employeeId: ticket.employee_id as string, name: ticket.reporter_name ?? copy.employeeFallback }]));
    const actorLabel = (ticketId: string, actorId: string | null) => {
      if (actorId && actorId === actorEmployeeId) return actorName || copy.employeeFallback;
      const reporter = reporterByTicket.get(ticketId);
      if (actorId && reporter && actorId === reporter.employeeId) return reporter.name;
      return copy.hrManager;
    };

    const historiesByTicket = new Map<string, Activity[]>();
    for (const history of historyResult.data ?? []) {
      // Follow-ups come from d3_ticket_followups (they carry follow_up_at), so the
      // trigger's FOLLOW_UP_ADDED copy is skipped to avoid showing each one twice.
      // Priority is no longer part of the ticket workflow.
      if (history.event_type === "FOLLOW_UP_ADDED" || history.event_type === "PRIORITY_CHANGED") continue;
      const status = history.to_status as TicketStatus | null;
      let kind: Activity["kind"];
      let message: string;
      if (history.event_type === "CREATED") {
        kind = "created";
        message = copy.ticketCreated;
      } else if (history.event_type === "STATUS_CHANGED" && status) {
        kind = "status";
        message = `${language === "id" ? "Status diubah menjadi" : "Status changed to"} ${statusLabel(status, language)}.`;
      } else if (history.event_type === "DUE_DATE_CHANGED") {
        kind = "due";
        message = copy.dueUpdated;
      } else {
        continue;
      }
      const current = historiesByTicket.get(history.ticket_id) ?? [];
      current.push({
        id: history.id,
        kind,
        message,
        toStatus: kind === "status" && status ? status : undefined,
        actor: actorLabel(history.ticket_id, history.actor_employee_id),
        actorEmployeeId: history.actor_employee_id,
        at: history.created_at,
      });
      historiesByTicket.set(history.ticket_id, current);
    }
    for (const followUp of followUpResult.data ?? []) {
      const current = historiesByTicket.get(followUp.ticket_id) ?? [];
      current.push({
        id: `followup-${followUp.id}`,
        kind: "followup",
        message: followUp.note,
        actor: actorLabel(followUp.ticket_id, followUp.actor_employee_id),
        actorEmployeeId: followUp.actor_employee_id,
        at: followUp.follow_up_at ?? followUp.created_at,
      });
      historiesByTicket.set(followUp.ticket_id, current);
    }
    const attachmentsByTicket = new Map((attachmentResult.data ?? []).map((attachment) => [attachment.ticket_id, { fileName: attachment.file_name, storagePath: attachment.storage_path }]));
    const loadedTickets = (ticketRows ?? []).map((ticket): TicketItem => ({
      dbId: ticket.id,
      id: ticket.ticket_code,
      employeeUuid: ticket.employee_id,
      employeeId: ticket.reporter_employee_code ?? "—",
      employeeName: ticket.reporter_name ?? copy.employeeFallback,
      department: ticket.reporter_department ?? "-",
      title: ticket.title,
      category: ticket.category,
      description: ticket.description,
      occurredAt: ticket.occurred_at ?? undefined,
      createdAt: ticket.created_at,
      updatedAt: ticket.updated_at,
      status: ticket.status as TicketStatus,
      dueAt: ticket.due_at ?? undefined,
      attachment: attachmentsByTicket.get(ticket.id),
      history: (historiesByTicket.get(ticket.id) ?? []).sort((a, b) => a.at.localeCompare(b.at)),
    }));
    setTickets(loadedTickets);
    setLastSyncedAt(Date.now());
    const requestedTicket = requestedTicketRef.current;
    if (requestedTicket && loadedTickets.some((ticket) => ticket.id === requestedTicket)) {
      requestedTicketRef.current = null;
      setSelectedId(requestedTicket);
    } else {
      setSelectedId((current) => loadedTickets.some((ticket) => ticket.id === current) ? current : (loadedTickets[0]?.id ?? ""));
    }
    hasLoadedTicketsRef.current = true;
    setIsTicketLoading(false);
    setIsRefreshing(false);
  }

  useEffect(() => {
    let isMounted = true;

    // Read once, after mount: during the first render Next.js may not have
    // committed the new URL yet. Language switches re-run this effect and must
    // not re-select the ticket from the link.
    if (!hasReadTicketParamRef.current) {
      hasReadTicketParamRef.current = true;
      requestedTicketRef.current = new URLSearchParams(window.location.search).get("ticket");
    }

    async function loadAccountAccess() {
      try {
        const supabase = createClient();
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          router.replace("/login");
          return;
        }

        const [{ data: access, error: accessError }, { data: legacyEmployeeId, error: legacyEmployeeError }] = await Promise.all([
          supabase
            .from("b2_register")
            .select("app_role, full_name")
            .eq("auth_user_id", userData.user.id)
            .eq("is_active", true)
            .maybeSingle(),
          supabase.rpc("d3_current_legacy_employee_uuid"),
        ]);

        if (accessError || legacyEmployeeError || !access || !legacyEmployeeId) {
          if (isMounted) showNotice(copy.accessUnavailable);
          return;
        }

        if (!isMounted) return;
        const role = access.app_role as AppRole;
        const metadataName = userData.user.user_metadata?.full_name;
        const fallbackName = userData.user.email?.split("@")[0] ?? copy.employeeFallback;
        const accountName = access.full_name?.trim() || (typeof metadataName === "string" && metadataName.trim() ? metadataName.trim() : fallbackName);
        setViewerName(accountName);
        setAppRole(role);
        setViewRole(role === "EMPLOYEE" ? "employee" : "manager");
        setViewerEmployeeId(legacyEmployeeId);
        setReadNotificationIds(readTicketNotificationIds(userData.user.id));
        setAuthUserId(userData.user.id);
        await loadTickets(legacyEmployeeId, accountName);
      } catch {
        if (isMounted) showNotice(copy.accessUnavailable);
      } finally {
        if (isMounted) setIsAccountLoading(false);
      }
    }

    void loadAccountAccess();
    return () => { isMounted = false; };
  // loadTickets only uses the active authenticated browser session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, language]);

  const accessibleTickets = useMemo(() => tickets.filter((ticket) => viewRole === "manager" || ticket.employeeUuid === viewerEmployeeId), [tickets, viewRole, viewerEmployeeId]);

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return accessibleTickets.filter((ticket) => {
      const isMatchingStatus = statusFilter === "ALL" || ticket.status === statusFilter;
      const searchable = `${ticket.id} ${ticket.employeeName} ${ticket.title} ${ticket.category} ${categoryLabel(ticket.category, language)}`.toLowerCase();
      return isMatchingStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    }).sort(ticketSort === "DUE_DATE" ? compareTicketsByDueDate : compareTicketsByNewest);
  }, [accessibleTickets, language, query, statusFilter, ticketSort]);
  const tablePageSize = 10;
  const totalPages = Math.max(1, Math.ceil(visibleTickets.length / tablePageSize));
  const currentPage = Math.min(tablePage, totalPages);
  const paginatedTickets = visibleTickets.slice((currentPage - 1) * tablePageSize, currentPage * tablePageSize);

  const selectedTicket = visibleTickets.find((ticket) => ticket.id === selectedId);

  // Notifications are built per role from the account's own role in b2_register:
  // - Employee: only updates by HR/Manager on tickets the employee submitted
  //   (status changes and follow-ups), worded for the reporter.
  // - HR/Manager: incoming tickets from employees and tickets past their due date.
  // An employee never receives HR-side notifications, even if a ticket row of
  // someone else were ever returned by the API.
  const ticketNotifications = useMemo(() => buildTicketNotifications({
    role: appRole,
    viewerEmployeeId,
    syncedAt: lastSyncedAt,
    language,
    tickets: tickets.map((ticket) => ({
      dbId: ticket.dbId,
      ticketCode: ticket.id,
      title: ticket.title,
      employeeUuid: ticket.employeeUuid,
      employeeName: ticket.employeeName,
      department: ticket.department,
      status: ticket.status,
      dueAt: ticket.dueAt,
      events: ticket.history.map((activity) => ({ id: activity.id, kind: activity.kind, toStatus: activity.toStatus, actorEmployeeId: activity.actorEmployeeId ?? null, note: activity.message, at: activity.at })),
    })),
  }), [appRole, tickets, viewerEmployeeId, lastSyncedAt, language]);

  const unreadTicketNotifications = useMemo(() => {
    const readIds = new Set(readNotificationIds);
    return ticketNotifications.filter((notification) => !readIds.has(notification.id));
  }, [readNotificationIds, ticketNotifications]);

  function saveReadNotifications(ids: string[]) {
    setReadNotificationIds(writeTicketNotificationIds(authUserId, ids));
  }


  function markAllTicketNotificationsRead() {
    saveReadNotifications([...readNotificationIds, ...ticketNotifications.map((notification) => notification.id)]);
  }

  function selectTicket(ticketId: string) {
    setSelectedId(ticketId);
    // When the detail panel sits under the table, bring it into view.
    if (window.matchMedia("(max-width: 1535px)").matches) {
      window.requestAnimationFrame(() => document.getElementById("ticket-detail")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function openTicketNotification(ticketId: string, notificationId: string) {
    saveReadNotifications([...readNotificationIds, notificationId]);
    setIsNotificationOpen(false);
    selectTicket(ticketId);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  function refreshTickets() {
    void loadTickets(viewerEmployeeId, viewerName);
  }

  useEffect(() => {
    if (!viewerEmployeeId || isAccountLoading) return;
    const syncInterval = window.setInterval(refreshTickets, 15_000);
    return () => window.clearInterval(syncInterval);
  // Keep both HR and Employee views aligned with the shared ticket history.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerEmployeeId, viewerName, isAccountLoading]);

  async function updateTicketWorkflow(update: { status?: TicketStatus; dueAt?: string | null }) {
    if (!selectedTicket || viewRole !== "manager") return;
    if (update.status !== undefined && !(update.status in statusMeta)) return;
    const hasDueDateUpdate = "dueAt" in update;
    let normalizedDueAt: string | null | undefined;
    if (hasDueDateUpdate) {
      if (update.dueAt) {
        const dueTime = parseLocalDateTime(update.dueAt);
        const createdTime = new Date(selectedTicket.createdAt).getTime();
        if (dueTime === null || dueTime < createdTime || dueTime > Date.now() + ONE_YEAR_MS) {
          showNotice(copy.dueInvalid);
          return;
        }
        normalizedDueAt = new Date(dueTime).toISOString();
      } else {
        normalizedDueAt = null;
      }
    }
    if ((update.status === undefined || selectedTicket.status === update.status)
      && (!hasDueDateUpdate || (selectedTicket.dueAt ? new Date(selectedTicket.dueAt).toISOString() : null) === normalizedDueAt)) return;

    const payload: { status?: TicketStatus; due_at?: string | null } = {};
    if (update.status !== undefined) payload.status = update.status;
    if (hasDueDateUpdate) payload.due_at = normalizedDueAt ?? null;

    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("d3_tickets").update(payload).eq("id", selectedTicket.dbId);
    setIsSaving(false);
    if (error) {
      showNotice(copy.updateFailed);
      return;
    }
    await loadTickets();
    showNotice(copy.updated);
  }

  async function addFollowUp() {
    if (!selectedTicket || viewRole !== "manager" || !viewerEmployeeId) return;
    const note = cleanMultilineText(followUp);
    if (note.length < TICKET_LIMITS.followUpMin || note.length > TICKET_LIMITS.followUpMax) {
      showNotice(copy.followUpLength);
      return;
    }
    // The follow-up time is not entered by hand (BUG-D3-010): follow_up_at stays
    // empty and the history uses the row's created_at, the moment it was saved.
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("d3_ticket_followups").insert({
      ticket_id: selectedTicket.dbId,
      actor_employee_id: viewerEmployeeId,
      note,
    });
    setIsSaving(false);
    if (error) {
      showNotice(copy.followUpFailed);
      return;
    }
    setFollowUp("");
    await loadTickets();
    showNotice(copy.followUpSaved);
  }

  async function createTicket(input: CreateTicketInput) {
    if (!viewerEmployeeId || !authUserId) return { ok: false, message: copy.accessUnavailable };
    if (appRole !== "EMPLOYEE") return { ok: false, message: copy.createFailed };
    const title = cleanText(input.title);
    const description = cleanMultilineText(input.description);
    const { category, occurredAt, attachment } = input;
    if (title.length < TICKET_LIMITS.titleMin || title.length > TICKET_LIMITS.titleMax) return { ok: false, message: copy.titleLength };
    if (!categories.includes(category)) return { ok: false, message: copy.categoryInvalid };
    if (description.length < TICKET_LIMITS.descriptionMin || description.length > TICKET_LIMITS.descriptionMax) return { ok: false, message: copy.descriptionLength };
    let occurredTime: number | null = null;
    if (occurredAt) {
      occurredTime = parseLocalDateTime(occurredAt);
      // An occurrence cannot be in the future (one minute of clock drift allowed) or older than a year.
      if (occurredTime === null || occurredTime > Date.now() + 60_000 || occurredTime < Date.now() - ONE_YEAR_MS) return { ok: false, message: copy.occurredInvalid };
    }
    if (attachment && !isAllowedTicketImage(attachment)) {
      return { ok: false, message: copy.imageType };
    }
    if (attachment && attachment.size > MAX_ATTACHMENT_BYTES) return { ok: false, message: copy.imageSize };
    const supabase = createClient();
    const { data: created, error } = await supabase.from("d3_tickets").insert({
      employee_id: viewerEmployeeId,
      title,
      category,
      description,
      occurred_at: occurredTime === null ? null : new Date(occurredTime).toISOString(),
    }).select("id, ticket_code").single();

    if (error || !created) return { ok: false, message: copy.createFailed };

    if (attachment) {
      const extension = attachment.name.includes(".") ? attachment.name.slice(attachment.name.lastIndexOf(".")).slice(0, 10) : "";
      const baseName = attachment.name.slice(0, attachment.name.length - extension.length).replace(/[^a-zA-Z0-9._-]/g, "_");
      const safeName = `${baseName.slice(0, TICKET_LIMITS.fileNameMax - extension.length)}${extension.replace(/[^a-zA-Z0-9.]/g, "")}`;
      const storagePath = `${authUserId}/${created.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("d3-ticket-attachments").upload(storagePath, attachment, { contentType: attachment.type || undefined });
      if (uploadError) {
        await loadTickets();
        setSelectedId(created.ticket_code);
        setIsCreateOpen(false);
        showNotice(copy.attachmentUpload(created.ticket_code));
        return { ok: true };
      }
      const { error: attachmentError } = await supabase.from("d3_ticket_attachments").insert({
        ticket_id: created.id,
        storage_path: storagePath,
        file_name: shortText(attachment.name, TICKET_LIMITS.fileNameMax),
        mime_type: attachment.type || null,
        byte_size: attachment.size,
      });
      if (attachmentError) {
        await loadTickets();
        setSelectedId(created.ticket_code);
        setIsCreateOpen(false);
        showNotice(copy.attachmentMetadata(created.ticket_code));
        return { ok: true };
      }
    }

    await loadTickets();
    setSelectedId(created.ticket_code);
    setIsCreateOpen(false);
    showNotice(copy.created(created.ticket_code));
    return { ok: true };
  }

  async function openAttachment(attachment: { fileName: string; storagePath: string }) {
    const { data, error } = await createClient().storage.from("d3-ticket-attachments").createSignedUrl(attachment.storagePath, 60);
    if (error || !data?.signedUrl) {
      showNotice(copy.attachmentOpen);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (isAccountLoading) {
    return <main><PageSkeleton withTopBar layout="split" /></main>;
  }

  return (
    <main className={`min-h-screen ${pageBgClass} text-slate-900`}>
      <section className="min-h-screen">
        <AppHeader pageTitle={t("employeeReportTicket")} notificationSlot={<div ref={notificationRef} className="flex h-full items-center"><TicketNotificationButton count={unreadTicketNotifications.length} isOpen={isNotificationOpen} onToggle={() => setIsNotificationOpen((current) => !current)} />{isNotificationOpen && <TicketNotificationPanel isManager={viewRole === "manager"} notifications={unreadTicketNotifications} isLoading={isTicketLoading || isRefreshing} onRefresh={refreshTickets} onReadAll={markAllTicketNotificationsRead} onSelect={openTicketNotification} />}</div>} />

        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end">
            <div><div className="mb-2 flex items-center gap-2"><span className={badgeClass("blue")}>{accessibleTickets.length} {copy.tickets}</span><span className={pageTitleClass.eyebrow}>{copy.ticketList}</span></div><h1 className={pageTitleClass.title}>{t("employeeReportTicket")}</h1><p className={pageTitleClass.subtitle}>{copy.description}</p></div>
            <div className="flex flex-wrap items-center gap-2"><label className="relative hidden w-72 md:block"><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setTablePage(1); }} className={searchInputClass} placeholder={copy.search} maxLength={TICKET_LIMITS.searchMax} /></label>{viewRole === "employee" && <button onClick={() => setIsCreateOpen(true)} className={buttonClass("primary")}><FilePlus2 size={16} /> {copy.create}</button>}</div>
          </div>

          <div className="mt-5 flex flex-col gap-5 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <section className={`${cardClass} overflow-hidden`}>
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><label className="inline-flex h-[34px] w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 text-slate-500 shadow-xs transition focus-within:border-[#3B6FF5] focus-within:ring-2 focus-within:ring-[#3B6FF5]/20"><Filter size={14} aria-hidden="true" /><span className="sr-only">{language === "id" ? "Filter status tiket" : "Filter ticket status"}</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "ALL" | TicketStatus); setTablePage(1); }} className="min-w-30 cursor-pointer bg-transparent text-xs font-semibold text-slate-700 outline-none"><option value="ALL">{copy.all} ({accessibleTickets.length})</option>{(["PENDING", "TODO", "IN_PROGRESS", "RESOLVED", "REJECTED"] as TicketStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}</select></label><div role="group" aria-label={copy.sortBy} className={segmentedClass.group}>{([["NEWEST", copy.newest], ["DUE_DATE", copy.dueDate]] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={ticketSort === value} onClick={() => { setTicketSort(value); setTablePage(1); }} className={`${segmentedClass.item} ${ticketSort === value ? segmentedClass.active : segmentedClass.idle}`}>{label}</button>)}</div></div><label className="relative md:hidden"><Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setTablePage(1); }} className={searchInputClass} placeholder={copy.search} maxLength={TICKET_LIMITS.searchMax} /></label></div>
              <div className="overflow-x-auto"><table className={`${tableClass.table} min-w-[760px]`}><thead className={tableClass.head}><tr className="border-b border-slate-200"><th className={tableClass.headCell}>{copy.employee}</th><th className={tableClass.headCell}>{copy.ticket}</th><th className={tableClass.headCell}>{copy.submitted}</th><th className={tableClass.headCell}>{copy.dueDate}</th><th className={tableClass.headCell}>{copy.status}</th><th className={`${tableClass.headCell} w-10`}><span className="sr-only">{copy.openDetail}</span></th></tr></thead><tbody className="divide-y divide-slate-100">{isTicketLoading ? <SkeletonTableRows rows={6} columns={6} /> : paginatedTickets.map((ticket) => {
                // BUG-D3-008: the whole row is the one way to open a ticket. The
                // chevron and the highlighted row show that, so there is no
                // separate "View" button doing the same thing.
                const isSelected = selectedTicket?.id === ticket.id;
                return <tr key={ticket.id} tabIndex={0} aria-current={isSelected ? "true" : undefined} aria-label={`${copy.openDetail} ${ticket.id}: ${ticket.title}`} onClick={() => selectTicket(ticket.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectTicket(ticket.id); } }} className={`group cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3B6FF5]/40 ${isSelected ? "bg-blue-50/60 shadow-[inset_3px_0_0_#3B6FF5]" : "bg-white hover:bg-slate-50"}`}><td className="px-4 py-3.5"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-[11px] font-bold text-blue-700">{ticket.employeeName.split(" ").map((name) => name[0]).join("").slice(0, 2)}</span><div><p className="text-xs font-bold text-slate-900">{ticket.employeeName}</p><p className="mt-0.5 text-[11px] text-slate-500">{ticket.employeeId}</p></div></div></td><td className="px-4 py-3.5"><p className="max-w-[420px] text-xs font-semibold text-slate-900 [overflow-wrap:anywhere]">{ticket.title}</p><p className="mt-0.5 text-[11px] text-slate-500">{ticket.id} · {categoryLabel(ticket.category, language)}</p></td><td className="px-4 py-3.5 text-xs text-slate-600">{formatDate(ticket.createdAt, language)}</td><td className="px-4 py-3.5 text-xs text-slate-600">{ticket.dueAt ? formatDate(ticket.dueAt, language, true) : copy.noDueDate}</td><td className="px-4 py-3.5"><StatusBadge status={ticket.status} /></td><td className="px-4 py-3.5 text-right"><ChevronRight size={16} aria-hidden="true" className={`inline-block transition ${isSelected ? "text-[#3B6FF5]" : "text-slate-400 group-hover:translate-x-0.5 group-hover:text-slate-700"}`} /></td></tr>;
              })}{!isTicketLoading && visibleTickets.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-sm font-medium text-slate-400">{copy.noTickets}</td></tr>}</tbody></table></div>
              <div className="flex flex-col gap-1 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>{copy.showing} <b className="font-semibold text-slate-800">{paginatedTickets.length}</b> {copy.of} <b className="font-semibold text-slate-800">{visibleTickets.length}</b> {copy.tickets}.</span>{visibleTickets.length > 0 && <span>{copy.rowHint}</span>}</div>
              <TablePagination page={currentPage} pageSize={tablePageSize} totalItems={visibleTickets.length} onPageChange={setTablePage} />
            </section>

            <TicketDetail ticket={selectedTicket} isLoading={isTicketLoading} role={viewRole} followUp={followUp} isSaving={isSaving} onFollowUpChange={setFollowUp} onAddFollowUp={addFollowUp} onUpdateWorkflow={updateTicketWorkflow} onOpenAttachment={openAttachment} onClose={() => setSelectedId("")} />
          </div>
        </div>
      </section>

      {notice && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-lg"><CheckCircle2 size={17} className="shrink-0 text-emerald-600" />{notice}</div>}
      {isCreateOpen && <CreateTicketModal onClose={() => setIsCreateOpen(false)} onSubmit={createTicket} />}
    </main>
  );
}

function TicketDetail({ ticket, isLoading, role, followUp, isSaving, onFollowUpChange, onAddFollowUp, onUpdateWorkflow, onOpenAttachment, onClose }: { ticket?: TicketItem; isLoading: boolean; role: ViewRole; followUp: string; isSaving: boolean; onFollowUpChange: (value: string) => void; onAddFollowUp: () => void; onUpdateWorkflow: (update: { status?: TicketStatus; dueAt?: string | null }) => void; onOpenAttachment: (attachment: { fileName: string; storagePath: string }) => void; onClose: () => void }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Pilih tiket untuk melihat detail.", details: "Detail tiket", workflow: "Alur laporan karyawan", close: "Tutup detail", current: "Pengaturan tiket", restricted: "Pengaturan hanya dapat diperbarui oleh HR atau Manager.", status: "Status", dueDate: "Batas waktu", noDueDate: "Belum ditentukan", reported: "Dilaporkan", occurred: "Kejadian/pengajuan", history: "Progres & riwayat", noFollowUp: "Belum ada tindak lanjut untuk tiket ini.", add: "Tambah tindak lanjut", placeholder: "Tuliskan tindakan atau informasi tindak lanjut...", autoTime: "Waktu tindak lanjut dicatat otomatis saat disimpan.", saving: "Menyimpan...", save: "Simpan tindak lanjut" } : { empty: "Select a ticket to view its details.", details: "Ticket details", workflow: "Employee report workflow", close: "Close details", current: "Ticket settings", restricted: "Settings can be updated by HR or a Manager.", status: "Status", dueDate: "Due date", noDueDate: "Not set", reported: "Reported", occurred: "Occurrence/submission", history: "Progress & history", noFollowUp: "There is no follow-up for this ticket yet.", add: "Add follow-up", placeholder: "Describe the action taken or follow-up information...", autoTime: "The follow-up time is recorded automatically when you save.", saving: "Saving...", save: "Save follow-up" };
  if (!ticket) return isLoading ? <SkeletonPanel /> : <aside className={`${cardClass} p-6 text-sm text-slate-500`}>{copy.empty}</aside>;
  const canManage = role === "manager";

  return <aside id="ticket-detail" className={`${cardClass} overflow-hidden scroll-mt-20 2xl:sticky 2xl:top-21 2xl:h-fit`}>
    <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600"><Ticket size={16} /></span><div className="min-w-0"><p className="text-sm font-bold text-slate-900 [overflow-wrap:anywhere]">{copy.details} — {ticket.id}</p><p className="mt-0.5 text-xs text-slate-500">{copy.workflow}</p></div></div><button type="button" onClick={onClose} className={iconButtonClass()} aria-label={copy.close}><X className="size-5" /></button></div>
    <div className="space-y-5 p-5">
      <div><p className="mb-3 text-xs font-semibold text-slate-500">{copy.current}</p><div className="grid gap-3 sm:grid-cols-2"><label className="grid content-start justify-items-start"><span className={labelClass}>{copy.status}</span>{canManage ? <select disabled={isSaving} value={ticket.status} onChange={(event) => onUpdateWorkflow({ status: event.target.value as TicketStatus })} className={`${compactControlClass} w-full cursor-pointer`}>{(Object.keys(statusMeta) as TicketStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}</select> : <StatusBadge status={ticket.status} />}</label>{canManage ? <DueDateEditor key={`${ticket.id}-${ticket.dueAt ?? ""}`} ticket={ticket} disabled={isSaving} onSave={(dueAt) => onUpdateWorkflow({ dueAt })} /> : <div className="grid content-start"><span className={labelClass}>{copy.dueDate}</span><span className="text-sm font-semibold text-slate-800">{ticket.dueAt ? formatDate(ticket.dueAt, language, true) : copy.noDueDate}</span></div>}</div>{!canManage && <p className="mt-3 text-xs text-slate-500">{copy.restricted}</p>}</div>
      <div className="border-y border-slate-100 py-4"><div className="flex items-center gap-2.5"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-[11px] font-bold text-blue-700">{ticket.employeeName.split(" ").map((name) => name[0]).join("").slice(0, 2)}</span><div><p className="text-xs font-bold text-slate-900">{ticket.employeeName}</p><p className="mt-0.5 text-[11px] text-slate-500">{ticket.employeeId} · {ticket.department}</p></div></div><h2 className="mt-4 text-base font-bold leading-6 text-slate-900 [overflow-wrap:anywhere]">{ticket.title}</h2><p className="mt-1 text-xs text-slate-500">{categoryLabel(ticket.category, language)} · {copy.reported} {formatDate(ticket.createdAt, language, true)}</p>{ticket.occurredAt && <p className="mt-1 text-xs text-slate-500">{copy.occurred}: {formatDate(ticket.occurredAt, language, true)}</p>}<p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">{ticket.description}</p>{ticket.attachment && <button type="button" onClick={() => onOpenAttachment(ticket.attachment!)} className={buttonClass("secondary", "sm", "mt-3 max-w-full")}><Paperclip size={14} className="shrink-0" /><span className="truncate">{ticket.attachment.fileName}</span></button>}</div>
      <div><div className="mb-3 flex items-center gap-2"><Clock3 size={15} className="text-blue-600" /><p className="text-xs font-bold text-slate-800">{copy.history}</p></div>{!ticket.history.some((activity) => activity.kind === "followup") && <p className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">{copy.noFollowUp}</p>}<ol className="space-y-4 border-l border-slate-200 pl-4">{[...ticket.history].reverse().map((activity) => <li key={activity.id} className="relative"><span className={`absolute -left-[21px] top-1 grid size-3 place-items-center rounded-full ${activity.kind === "status" ? "bg-blue-600" : activity.kind === "followup" ? "bg-emerald-600" : "bg-slate-300"}`}><span className="size-1 rounded-full bg-white" /></span><p className="whitespace-pre-line text-xs font-semibold text-slate-700 [overflow-wrap:anywhere]">{activity.message}</p><p className="mt-1 text-[11px] text-slate-500">{activity.actor} · {formatDate(activity.at, language, true)}</p></li>)}</ol></div>
      {canManage && <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><label className="flex items-center gap-2 text-xs font-bold text-slate-800"><MessageSquareText size={14} className="text-blue-600" /> {copy.add}</label><textarea disabled={isSaving} value={followUp} maxLength={TICKET_LIMITS.followUpMax} onChange={(event) => onFollowUpChange(event.target.value)} className={inputClass("mt-2 min-h-20 resize-none")} placeholder={copy.placeholder} /><div className="mt-1 flex items-start justify-between gap-3 text-[11px] text-slate-500"><p className="flex items-center gap-1"><Clock3 size={11} aria-hidden="true" />{copy.autoTime}</p><p className="shrink-0 tabular-nums">{followUp.length}/{TICKET_LIMITS.followUpMax}</p></div><button disabled={cleanMultilineText(followUp).length < TICKET_LIMITS.followUpMin || isSaving} onClick={onAddFollowUp} className={buttonClass("primary", "sm", "mt-2")}><Send size={14} /> {isSaving ? copy.saving : copy.save}</button></div>}</div>
  </aside>;
}

function CreateTicketModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: CreateTicketInput) => Promise<{ ok: boolean; message?: string }> }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { required: "Judul, kategori, dan deskripsi wajib diisi sebelum tiket diajukan.", createFailed: "Tiket belum berhasil dibuat.", title: "Buat tiket karyawan", subtitle: "ID karyawan akan terhubung otomatis setelah login.", close: "Tutup formulir", ticketTitle: "Judul tiket", titlePlaceholder: "Contoh: Perbaikan kursi kerja di area dispatch", category: "Kategori", choose: "Pilih kategori", occurred: "Tanggal / waktu kejadian", optional: "Opsional, format 24 jam", occurredIncomplete: "Lengkapi tanggal, jam, dan menit kejadian, atau kosongkan ketiganya.", description: "Deskripsi", descriptionPlaceholder: "Jelaskan kondisi, masalah, atau kebutuhan pekerjaan secara singkat dan jelas.", attachment: "Lampiran", attachmentHint: "Opsional, gambar JPG/PNG/WebP maksimal 5 MB", cancel: "Batal", submitting: "Mengajukan...", submit: "Ajukan tiket" } : { required: "Title, category, and description are required before submitting a ticket.", createFailed: "The ticket could not be created.", title: "Create employee ticket", subtitle: "Your employee ID will be linked automatically after sign-in.", close: "Close form", ticketTitle: "Ticket title", titlePlaceholder: "Example: Repair the work chair in the dispatch area", category: "Category", choose: "Select a category", occurred: "Occurrence date / time", optional: "Optional, 24-hour format", occurredIncomplete: "Complete the occurrence date, hour, and minute, or leave all three empty.", description: "Description", descriptionPlaceholder: "Briefly and clearly describe the condition, issue, or work request.", attachment: "Attachment", attachmentHint: "Optional, JPG/PNG/WebP image up to 5 MB", cancel: "Cancel", submitting: "Submitting...", submit: "Submit ticket" };
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [occurred, setOccurred] = useState<DateTimeValue>({ value: "", isPartial: false });
  const [occurredRange] = useState(() => ({ max: localDateString(new Date()), min: localDateString(new Date(Date.now() - ONE_YEAR_MS)) }));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = titleValue.trim();
    const category = String(formData.get("category") ?? "");
    const description = descriptionValue.trim();
    const attachmentValue = formData.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.name ? attachmentValue : undefined;
    if (!title || !category || !description) {
      setError(copy.required);
      return;
    }
    if (occurred.isPartial) {
      setError(copy.occurredIncomplete);
      return;
    }
    setIsSubmitting(true);
    const result = await onSubmit({ title, category, description, occurredAt: occurred.value || undefined, attachment });
    setIsSubmitting(false);
    if (!result.ok) setError(result.message ?? copy.createFailed);
  }

  return <div className={modalClass.overlay}><section role="dialog" aria-modal="true" aria-labelledby="create-ticket-title" className={`${modalClass.panel} max-h-[90vh] max-w-xl overflow-y-auto`}><div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-6 py-4"><div><h2 id="create-ticket-title" className={modalClass.title}>{copy.title}</h2><p className="mt-0.5 text-xs text-slate-500">{copy.subtitle}</p></div><button type="button" disabled={isSubmitting} onClick={onClose} className={iconButtonClass()} aria-label={copy.close}><X className="size-5" /></button></div><form noValidate onSubmit={handleSubmit} className="space-y-4 p-6"><Field label={copy.ticketTitle} required><input disabled={isSubmitting} name="title" value={titleValue} onChange={(event) => setTitleValue(event.target.value)} maxLength={TICKET_LIMITS.titleMax} className={inputClass()} placeholder={copy.titlePlaceholder} /><span className="mt-1 block text-right text-[11px] font-normal tabular-nums text-slate-500">{titleValue.length}/{TICKET_LIMITS.titleMax}</span></Field><Field label={copy.category} required><select disabled={isSubmitting} name="category" defaultValue="" className={inputClass("cursor-pointer")}><option value="" disabled>{copy.choose}</option>{categories.map((category) => <option key={category} value={category}>{categoryLabel(category, language)}</option>)}</select></Field><div><label htmlFor="ticket-occurred-at" className="text-xs font-semibold text-slate-700">{copy.occurred}</label><span className="ml-2 text-xs text-slate-500">{copy.optional}</span><div className="mt-1.5 flex"><DateTimeField id="ticket-occurred-at" minDate={occurredRange.min} maxDate={occurredRange.max} disabled={isSubmitting} onChange={setOccurred} /></div></div><Field label={copy.description} required><textarea disabled={isSubmitting} name="description" value={descriptionValue} onChange={(event) => setDescriptionValue(event.target.value)} maxLength={TICKET_LIMITS.descriptionMax} className={inputClass("min-h-28 resize-y")} placeholder={copy.descriptionPlaceholder} /><span className="mt-1 block text-right text-[11px] font-normal tabular-nums text-slate-500">{descriptionValue.length}/{TICKET_LIMITS.descriptionMax}</span></Field><Field label={copy.attachment} hint={copy.attachmentHint}><input disabled={isSubmitting} name="attachment" type="file" accept="image/jpeg,image/png,image/webp" className={inputClass("file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-blue-50 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-blue-700")} /></Field>{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}<div className="flex justify-end gap-2 border-t border-slate-200 pt-4"><button disabled={isSubmitting} type="button" onClick={onClose} className={buttonClass("secondary")}>{copy.cancel}</button><button disabled={isSubmitting} type="submit" className={buttonClass("primary")}><FilePlus2 size={16} /> {isSubmitting ? copy.submitting : copy.submit}</button></div></form></section></div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold text-slate-700">{label}{required && <span className="ml-1 text-red-600">*</span>}</span>{hint && <span className="ml-2 text-xs font-normal text-slate-500">{hint}</span>}<span className="mt-1.5 block">{children}</span></label>;
}
