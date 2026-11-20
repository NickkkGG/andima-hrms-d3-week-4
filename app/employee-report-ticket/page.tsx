"use client";

import {
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePlus2,
  Filter,
  MessageSquareText,
  Paperclip,
  RefreshCw,
  Search,
  Send,
  Ticket,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import HeaderAccount from "@/components/HeaderAccount";
import { useLanguage } from "@/components/i18n/LanguageProvider";
import TablePagination from "@/components/hrms/TablePagination";

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

type TicketNotification = {
  id: string;
  ticketId: string;
  ticketTitle: string;
  message: string;
  at: string;
  kind: "submitted" | "overdue" | "status" | "followup";
};

const statusMeta: Record<TicketStatus, { className: string }> = {
  PENDING: { className: "border-[#d9e2fc] bg-[#f1f3ff] text-[#4d5f81]" },
  TODO: { className: "border-[#b9d6ff] bg-[#edf6ff] text-[#1971c2]" },
  IN_PROGRESS: { className: "border-[#fde68a] bg-[#fef9c3] text-[#b7791f]" },
  RESOLVED: { className: "border-[#bbf0d2] bg-[#eaf7f0] text-[#16834b]" },
  REJECTED: { className: "border-[#fecaca] bg-[#fff1f2] text-[#d64545]" },
};

function statusLabel(status: TicketStatus, language: "id" | "en") {
  const labels = language === "id"
    ? { PENDING: "Menunggu", TODO: "Dikerjakan", IN_PROGRESS: "Diproses", RESOLVED: "Selesai", REJECTED: "Ditolak" }
    : { PENDING: "Pending", TODO: "To do", IN_PROGRESS: "In progress", RESOLVED: "Resolved", REJECTED: "Rejected" };
  return labels[status];
}

const categories = ["Workplace facility", "System access", "Safety", "Work arrangement", "Operational issue", "Other"];
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
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>
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
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(new Date(value));
}

function currentLocalDateTime() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 16);
}

function readTicketNotificationIds(authUserId: string) {
  if (!authUserId || typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(`d3-ticket-read-notifications:${authUserId}`);
    const ids = saved ? JSON.parse(saved) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function toDateTimeLocal(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function EmployeeReportTicketPage() {
  const { t, language } = useLanguage();
  const copy = language === "id" ? { loadingAccess: "Memuat akses HRMS...", search: "Cari tiket, pegawai...", notifications: "Notifikasi tiket", ticketList: "Daftar tiket", description: "Catat, tindak lanjuti, dan pantau kebutuhan pekerjaan secara terstruktur.", all: "Semua", loadingTickets: "Memuat tiket dari database...", noTickets: "Belum ada tiket yang sesuai dengan filter.", showing: "Menampilkan", of: "dari", tickets: "tiket", employee: "Karyawan", submitted: "Diajukan", status: "Status", dueDate: "Batas waktu", noDueDate: "Belum ditentukan", action: "Aksi", view: "Lihat", ticket: "Tiket", create: "Buat tiket", loadError: "Tiket belum dapat dimuat. Silakan coba lagi.", historyError: "Sebagian riwayat tiket belum dapat dimuat.", ticketCreated: "Tiket berhasil diajukan.", followUpAdded: "Tindak lanjut ditambahkan.", hrNewTicket: (name: string, department: string) => `Tiket baru dari ${name}${department && department !== "-" ? ` · ${department}` : ""}.`, hrOverdue: "Melewati batas waktu dan belum selesai.", employeeStatus: (status: TicketStatus) => ({ PENDING: "Status tiket Anda dikembalikan ke Menunggu.", TODO: "Tiket Anda sudah diterima HR dan masuk antrean.", IN_PROGRESS: "Tiket Anda sedang ditangani HR.", RESOLVED: "Tiket Anda sudah diselesaikan.", REJECTED: "Tiket Anda ditolak. Lihat riwayat tiket untuk keterangannya." })[status], employeeFollowUp: (note: string) => `HR menambahkan tindak lanjut: "${shortText(note)}"`, newNotifications: "ada notifikasi baru", dueUpdated: "Batas waktu diperbarui.", dueInvalid: "Batas waktu tidak valid. Pilih waktu setelah tiket diajukan dan paling lambat satu tahun ke depan.", followUpLength: `Tindak lanjut harus ${TICKET_LIMITS.followUpMin}–${TICKET_LIMITS.followUpMax} karakter.`, followUpDateInvalid: "Waktu tindak lanjut tidak valid. Pilih waktu setelah tiket diajukan dan paling lambat satu tahun ke depan.", updateFailed: "Pengaturan tiket belum berhasil diperbarui.", updated: "Pengaturan tiket diperbarui.", followUpFailed: "Tindak lanjut belum berhasil disimpan.", followUpSaved: "Tindak lanjut tersimpan di riwayat tiket.", accessUnavailable: "Akses karyawan belum siap. Login ulang lalu coba lagi.", titleLength: `Judul tiket harus ${TICKET_LIMITS.titleMin}–${TICKET_LIMITS.titleMax} karakter.`, descriptionLength: `Deskripsi harus ${TICKET_LIMITS.descriptionMin}–${TICKET_LIMITS.descriptionMax} karakter.`, categoryInvalid: "Pilih kategori dari daftar yang tersedia.", occurredInvalid: "Waktu kejadian tidak boleh di masa depan atau lebih dari satu tahun yang lalu.", imageType: "Lampiran hanya boleh berupa gambar JPG, PNG, atau WebP.", imageSize: "Lampiran gambar maksimal 5 MB.", createFailed: "Tiket belum berhasil dibuat. Periksa kembali data lalu coba lagi.", attachmentUpload: (id: string) => `${id} dibuat, tetapi lampiran belum berhasil diunggah.`, attachmentMetadata: (id: string) => `${id} dibuat, tetapi metadata lampiran belum tersimpan.`, created: (id: string) => `${id} berhasil dibuat.`, attachmentOpen: "Lampiran belum dapat dibuka." } : { loadingAccess: "Loading HRMS access...", search: "Search tickets or employees...", notifications: "Ticket notifications", ticketList: "Ticket list", description: "Record, follow up, and monitor work needs in a structured workflow.", all: "All", loadingTickets: "Loading tickets from the database...", noTickets: "No tickets match the current filter.", showing: "Showing", of: "of", tickets: "tickets", employee: "Employee", submitted: "Submitted", status: "Status", dueDate: "Due date", noDueDate: "Not set", action: "Action", view: "View", ticket: "Ticket", create: "Create ticket", loadError: "Tickets could not be loaded. Please try again.", historyError: "Some ticket history could not be loaded.", ticketCreated: "Ticket submitted successfully.", followUpAdded: "Follow-up added.", hrNewTicket: (name: string, department: string) => `New ticket from ${name}${department && department !== "-" ? ` · ${department}` : ""}.`, hrOverdue: "Past its due date and not finished yet.", employeeStatus: (status: TicketStatus) => ({ PENDING: "Your ticket was moved back to Pending.", TODO: "HR received your ticket and queued it.", IN_PROGRESS: "HR is working on your ticket.", RESOLVED: "Your ticket has been resolved.", REJECTED: "Your ticket was rejected. Check the ticket history for details." })[status], employeeFollowUp: (note: string) => `HR added a follow-up: "${shortText(note)}"`, newNotifications: "new notifications", dueUpdated: "Due date updated.", dueInvalid: "Invalid due date. Choose a time after the ticket was submitted and within one year from now.", followUpLength: `Follow-up must be ${TICKET_LIMITS.followUpMin}–${TICKET_LIMITS.followUpMax} characters.`, followUpDateInvalid: "Invalid follow-up time. Choose a time after the ticket was submitted and within one year from now.", updateFailed: "Ticket settings could not be updated.", updated: "Ticket settings updated.", followUpFailed: "Follow-up could not be saved.", followUpSaved: "Follow-up saved in ticket history.", accessUnavailable: "Employee access is not ready. Sign in again and retry.", titleLength: `Ticket title must be ${TICKET_LIMITS.titleMin}–${TICKET_LIMITS.titleMax} characters.`, descriptionLength: `Description must be ${TICKET_LIMITS.descriptionMin}–${TICKET_LIMITS.descriptionMax} characters.`, categoryInvalid: "Choose a category from the list.", occurredInvalid: "The occurrence time cannot be in the future or more than one year ago.", imageType: "Attachments must be JPG, PNG, or WebP images.", imageSize: "Image attachments must be at most 5 MB.", createFailed: "Ticket could not be created. Check the details and try again.", attachmentUpload: (id: string) => `${id} was created, but the attachment could not be uploaded.`, attachmentMetadata: (id: string) => `${id} was created, but its attachment metadata could not be saved.`, created: (id: string) => `${id} created successfully.`, attachmentOpen: "Attachment could not be opened." };
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
  const [tablePage, setTablePage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [followUp, setFollowUp] = useState("");
  const [followUpAt, setFollowUpAt] = useState(currentLocalDateTime);
  const [notice, setNotice] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState(0);

  async function loadTickets(actorEmployeeId = viewerEmployeeId, actorName = viewerName) {
    const supabase = createClient();
    setIsTicketLoading(true);
    const { data: ticketRows, error: ticketError } = await supabase
      .from("d3_tickets")
      .select("id, ticket_code, employee_id, reporter_name, reporter_employee_code, reporter_department, title, category, description, occurred_at, status, due_at, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (ticketError) {
      showNotice(copy.loadError);
      setIsTicketLoading(false);
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

    const reporterByTicket = new Map((ticketRows ?? []).map((ticket) => [ticket.id, { employeeId: ticket.employee_id as string, name: ticket.reporter_name ?? "Employee" }]));
    const actorLabel = (ticketId: string, actorId: string | null) => {
      if (actorId && actorId === actorEmployeeId) return actorName || "Employee";
      const reporter = reporterByTicket.get(ticketId);
      if (actorId && reporter && actorId === reporter.employeeId) return reporter.name;
      return "HR / Manager";
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
      employeeId: ticket.reporter_employee_code ?? "Employee",
      employeeName: ticket.reporter_name ?? "Employee",
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
    setSelectedId((current) => loadedTickets.some((ticket) => ticket.id === current) ? current : (loadedTickets[0]?.id ?? ""));
    setIsTicketLoading(false);
  }

  useEffect(() => {
    let isMounted = true;

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
        const fallbackName = userData.user.email?.split("@")[0] ?? "User Andima";
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
      const searchable = `${ticket.id} ${ticket.employeeName} ${ticket.title} ${ticket.category}`.toLowerCase();
      return isMatchingStatus && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [accessibleTickets, query, statusFilter]);
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
  const ticketNotifications = useMemo(() => {
    if (!appRole || !viewerEmployeeId) return [];

    if (appRole === "EMPLOYEE") {
      return tickets
        .filter((ticket) => ticket.employeeUuid === viewerEmployeeId)
        .flatMap((ticket) => ticket.history.flatMap((activity): TicketNotification[] => {
          if (activity.actorEmployeeId === viewerEmployeeId) return [];
          if (activity.kind === "status" && activity.toStatus) {
            return [{ id: `status-${activity.id}`, ticketId: ticket.id, ticketTitle: ticket.title, message: copy.employeeStatus(activity.toStatus), at: activity.at, kind: "status" }];
          }
          if (activity.kind === "followup") {
            return [{ id: activity.id, ticketId: ticket.id, ticketTitle: ticket.title, message: copy.employeeFollowUp(activity.message), at: activity.at, kind: "followup" }];
          }
          return [];
        }))
        .sort((first, second) => second.at.localeCompare(first.at));
    }

    return tickets
      .flatMap((ticket): TicketNotification[] => {
        const items: TicketNotification[] = [];
        const created = ticket.history.find((activity) => activity.kind === "created");
        if (created && created.actorEmployeeId !== viewerEmployeeId) {
          items.push({ id: `submitted-${created.id}`, ticketId: ticket.id, ticketTitle: ticket.title, message: copy.hrNewTicket(ticket.employeeName, ticket.department), at: created.at, kind: "submitted" });
        }
        const isOpen = ticket.status !== "RESOLVED" && ticket.status !== "REJECTED";
        if (ticket.dueAt && isOpen && lastSyncedAt && new Date(ticket.dueAt).getTime() < lastSyncedAt) {
          items.push({ id: `overdue-${ticket.dbId}-${ticket.dueAt}`, ticketId: ticket.id, ticketTitle: ticket.title, message: copy.hrOverdue, at: ticket.dueAt, kind: "overdue" });
        }
        return items;
      })
      .sort((first, second) => second.at.localeCompare(first.at));
  }, [appRole, tickets, viewerEmployeeId, lastSyncedAt, copy]);

  const unreadTicketNotifications = useMemo(() => {
    const readIds = new Set(readNotificationIds);
    return ticketNotifications.filter((notification) => !readIds.has(notification.id));
  }, [readNotificationIds, ticketNotifications]);

  function saveReadNotifications(ids: string[]) {
    const nextIds = Array.from(new Set(ids)).slice(-200);
    setReadNotificationIds(nextIds);
    if (authUserId) {
      try {
        window.localStorage.setItem(`d3-ticket-read-notifications:${authUserId}`, JSON.stringify(nextIds));
      } catch {
        // Storage can be unavailable (private mode); the read state still applies for this visit.
      }
    }
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
    let followUpTime: number | null = null;
    if (followUpAt) {
      followUpTime = parseLocalDateTime(followUpAt);
      const createdTime = new Date(selectedTicket.createdAt).getTime();
      // Allow a minute of clock drift between the browser and the ticket timestamp.
      if (followUpTime === null || followUpTime < createdTime - 60_000 || followUpTime > Date.now() + ONE_YEAR_MS) {
        showNotice(copy.followUpDateInvalid);
        return;
      }
    }
    setIsSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("d3_ticket_followups").insert({
      ticket_id: selectedTicket.dbId,
      actor_employee_id: viewerEmployeeId,
      note,
      follow_up_at: followUpTime === null ? null : new Date(followUpTime).toISOString(),
    });
    setIsSaving(false);
    if (error) {
      showNotice(copy.followUpFailed);
      return;
    }
    setFollowUp("");
    setFollowUpAt(currentLocalDateTime());
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
    return <main className="grid min-h-screen place-items-center bg-[#f7f8ff] text-sm font-semibold text-[#4d5f81]">{copy.loadingAccess}</main>;
  }

  return (
    <main className="min-h-screen bg-[#eaf2fc] text-[#121b2e]">
      <section className="min-h-screen">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[#bcd4ee]/80 bg-white/72 pl-16 pr-4 shadow-[0_4px_16px_rgba(31,77,130,0.08)] backdrop-blur-2xl sm:pr-6 lg:pl-6">
          <div className="flex w-full min-w-0 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3"><div className="hidden min-w-0 items-center gap-3 sm:flex"><span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548]">ANDIMA HRMS</span><span className="h-5 border-l border-[#BCD4EE]" /><span className="text-xs font-semibold text-[#3f4940]">HRMS</span><ChevronRight size={13} className="shrink-0 text-[#52749B]/60" /><span className="truncate text-xs font-semibold text-[#0C68D5]">{t("employeeReportTicket")}</span></div><span className="font-[family:var(--font-poppins)] text-sm font-semibold text-[#0B2548] sm:hidden">{t("reportTicket")}</span></div>
            <div className="relative flex items-center gap-2 sm:gap-3"><button onClick={() => setIsNotificationOpen((current) => !current)} className="relative grid size-9 place-items-center rounded-lg text-[#4d5f81] hover:bg-[#f1f3ff]" aria-label={unreadTicketNotifications.length > 0 ? `${copy.notifications}, ${copy.newNotifications}` : copy.notifications} aria-expanded={isNotificationOpen}><Bell size={17} />{unreadTicketNotifications.length > 0 && <span className="absolute right-1.5 top-1.5 size-2.5 rounded-full bg-[#d64545] ring-2 ring-white" aria-hidden="true" />}</button>{isNotificationOpen && <TicketNotificationPanel role={viewRole} notifications={unreadTicketNotifications} isLoading={isTicketLoading} onRefresh={refreshTickets} onReadAll={markAllTicketNotificationsRead} onSelect={openTicketNotification} />}<HeaderAccount /></div>
          </div>
        </header>

        <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
          <div className="flex flex-col justify-between gap-4 border-b border-[#d9e2fc] pb-5 xl:flex-row xl:items-end">
            <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold text-[#4d5f81]"><span className="rounded-full bg-[#d9e2fc]/60 px-2 py-0.5">{accessibleTickets.length} {copy.tickets}</span><span className="text-[#006838]">{copy.ticketList}</span></div><h1 className="text-2xl font-bold tracking-[-0.4px]">{t("employeeReportTicket")}</h1><p className="mt-1 text-sm text-[#4d5f81]">{copy.description}</p></div>
            <div className="flex flex-wrap items-center gap-2"><label className="hidden w-64 items-center gap-2 rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] px-3 py-2 md:flex"><Search size={14} className="text-[#4d5f81]/70" /><input value={query} onChange={(event) => { setQuery(event.target.value); setTablePage(1); }} className="w-full bg-transparent text-xs outline-none placeholder:text-[#4d5f81]/70" placeholder={copy.search} maxLength={TICKET_LIMITS.searchMax} /></label>{viewRole === "employee" && <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#16834b] px-3.5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#006838]"><FilePlus2 size={15} /> {copy.create}</button>}</div>
          </div>

          <div className="mt-5 flex flex-col gap-5 2xl:grid 2xl:grid-cols-[minmax(0,1fr)_400px]">
            <section className="overflow-hidden rounded-xl border border-[#becabd]/45 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <div className="flex flex-col gap-3 border-b border-[#becabd]/35 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"><label className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-[#d9e2fc] bg-[#f7f8ff] px-2.5 text-[#1e3765]"><Filter size={14} aria-hidden="true" /><span className="sr-only">{language === "id" ? "Filter status tiket" : "Filter ticket status"}</span><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "ALL" | TicketStatus); setTablePage(1); }} className="min-w-30 bg-transparent text-[11px] font-semibold outline-none"><option value="ALL">{copy.all} ({accessibleTickets.length})</option>{(["PENDING", "TODO", "IN_PROGRESS", "RESOLVED", "REJECTED"] as TicketStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}</select></label><label className="flex items-center gap-2 rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] px-3 py-2 md:hidden"><Search size={14} className="text-[#4d5f81]/70" /><input value={query} onChange={(event) => { setQuery(event.target.value); setTablePage(1); }} className="w-full bg-transparent text-xs outline-none" placeholder={copy.search} maxLength={TICKET_LIMITS.searchMax} /></label></div>
              <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead className="border-b border-[#becabd]/35 bg-[#f7f8ff] text-[10px] font-bold uppercase tracking-[0.08em] text-[#4d5f81]"><tr><th className="px-3 py-3">{copy.employee}</th><th className="px-3 py-3">{copy.ticket}</th><th className="px-3 py-3">{copy.submitted}</th><th className="px-3 py-3">{copy.dueDate}</th><th className="px-3 py-3">{copy.status}</th><th className="w-16 px-3 py-3">{copy.action}</th></tr></thead><tbody className="divide-y divide-[#becabd]/25">{isTicketLoading ? <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-[#4d5f81]">{copy.loadingTickets}</td></tr> : paginatedTickets.map((ticket) => <tr key={ticket.id} onClick={() => selectTicket(ticket.id)} className={`cursor-pointer transition hover:bg-[#f7f8ff] ${selectedTicket?.id === ticket.id ? "bg-[#eaf7f0]" : "bg-white"}`}><td className="px-3 py-3.5"><div className="flex items-center gap-2"><span className="grid size-7 place-items-center rounded-full bg-[#b0c6d4] text-[10px] font-bold text-[#1e3765]">{ticket.employeeName.split(" ").map((name) => name[0]).join("").slice(0, 2)}</span><div><p className="text-xs font-bold">{ticket.employeeName}</p><p className="text-[10px] text-[#4d5f81]">{ticket.employeeId}</p></div></div></td><td className="px-3 py-3.5"><p className="max-w-[420px] text-xs font-semibold [overflow-wrap:anywhere]">{ticket.title}</p><p className="mt-0.5 text-[10px] text-[#4d5f81]">{ticket.id} · {ticket.category}</p></td><td className="px-3 py-3.5 text-xs text-[#3f4940]">{formatDate(ticket.createdAt, language)}</td><td className="px-3 py-3.5 text-xs text-[#3f4940]">{ticket.dueAt ? formatDate(ticket.dueAt, language, true) : copy.noDueDate}</td><td className="px-3 py-3.5"><StatusBadge status={ticket.status} /></td><td className="px-3 py-3.5"><button onClick={(event) => { event.stopPropagation(); selectTicket(ticket.id); }} className="rounded-md bg-[#f1f3ff] px-2.5 py-1.5 text-[11px] font-bold text-[#1e3765] transition hover:bg-[#d9e2fc]" aria-label={`${copy.view} ${ticket.id}`}>{copy.view}</button></td></tr>)}{!isTicketLoading && visibleTickets.length === 0 && <tr><td colSpan={6} className="px-6 py-14 text-center text-sm text-[#4d5f81]">{copy.noTickets}</td></tr>}</tbody></table></div>
              <div className="border-t border-[#becabd]/35 px-4 py-3 text-xs text-[#4d5f81]">{copy.showing} <b className="text-[#121b2e]">{paginatedTickets.length}</b> {copy.of} <b className="text-[#121b2e]">{visibleTickets.length}</b> {copy.tickets}.</div>
              <TablePagination page={currentPage} pageSize={tablePageSize} totalItems={visibleTickets.length} onPageChange={setTablePage} />
            </section>

            <TicketDetail ticket={selectedTicket} role={viewRole} followUp={followUp} followUpAt={followUpAt} isSaving={isSaving} onFollowUpChange={setFollowUp} onFollowUpAtChange={setFollowUpAt} onAddFollowUp={addFollowUp} onUpdateWorkflow={updateTicketWorkflow} onOpenAttachment={openAttachment} onClose={() => setSelectedId("")} />
          </div>
        </div>
      </section>

      {notice && <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-lg bg-[#0f2342] px-4 py-3 text-sm font-semibold text-white shadow-xl"><CheckCircle2 size={17} className="text-[#77d8cd]" />{notice}</div>}
      {isCreateOpen && <CreateTicketModal onClose={() => setIsCreateOpen(false)} onSubmit={createTicket} />}
    </main>
  );
}

function TicketNotificationPanel({ role, notifications, isLoading, onRefresh, onReadAll, onSelect }: { role: ViewRole; notifications: TicketNotification[]; isLoading: boolean; onRefresh: () => void; onReadAll: () => void; onSelect: (ticketId: string, notificationId: string) => void }) {
  const { language } = useLanguage();
  const isManager = role === "manager";
  const copy = language === "id"
    ? { title: isManager ? "Tiket masuk & tenggat" : "Pembaruan tiket Anda", sync: "Disinkronkan setiap 15 detik", readAll: "Baca semua", refresh: "Muat ulang notifikasi", empty: isManager ? "Tidak ada tiket baru atau tiket yang melewati tenggat." : "Belum ada pembaruan dari HR untuk tiket Anda." }
    : { title: isManager ? "Incoming & overdue tickets" : "Your ticket updates", sync: "Synchronizes every 15 seconds", readAll: "Read all", refresh: "Refresh notifications", empty: isManager ? "No new or overdue tickets." : "HR has not updated your tickets yet." };
  const dotClass: Record<TicketNotification["kind"], string> = { submitted: "bg-[#16834b]", overdue: "bg-[#d64545]", status: "bg-[#069494]", followup: "bg-[#0C68D5]" };
  return <section aria-label={copy.title} className="absolute right-0 top-11 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[#d9e2fc] bg-white shadow-xl">
    <div className="flex items-center justify-between border-b border-[#d9e2fc] px-4 py-3">
      <div><p className="text-xs font-bold text-[#121b2e]">{copy.title}</p><p className="mt-0.5 text-[10px] text-[#4d5f81]">{copy.sync}</p></div>
      <div className="flex shrink-0 items-center gap-1"><button type="button" onClick={onReadAll} disabled={notifications.length === 0} className="inline-flex h-7 items-center whitespace-nowrap rounded-md border border-[#d9e2fc] px-2 text-[10px] font-bold leading-none text-[#0C68D5] transition hover:bg-[#EAF2FC] disabled:cursor-not-allowed disabled:opacity-45">{copy.readAll}</button><button type="button" onClick={onRefresh} disabled={isLoading} className="grid size-7 place-items-center rounded-md text-[#4d5f81] transition hover:bg-[#f1f3ff] disabled:opacity-50" aria-label={copy.refresh}><RefreshCw size={13} className={isLoading ? "animate-spin" : ""} /></button></div>
    </div>
    <div className="max-h-80 overflow-y-auto p-2">
      {notifications.length === 0 ? <p className="px-3 py-6 text-center text-xs text-[#4d5f81]">{copy.empty}</p> : notifications.map((notification) => <button key={notification.id} type="button" onClick={() => onSelect(notification.ticketId, notification.id)} className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-[#f7f8ff]">
        <span className={`mt-1 size-2 shrink-0 rounded-full ${dotClass[notification.kind]}`} />
        <span className="min-w-0"><span className="block truncate text-xs font-bold text-[#121b2e]">{notification.ticketTitle}</span><span className="mt-0.5 block text-[11px] leading-4 text-[#4d5f81] [overflow-wrap:anywhere]">{notification.message}</span><span className="mt-1 block text-[10px] text-[#4d5f81]">{formatDate(notification.at, language, true)}</span></span>
      </button>)}
    </div>
  </section>;
}

function TicketDetail({ ticket, role, followUp, followUpAt, isSaving, onFollowUpChange, onFollowUpAtChange, onAddFollowUp, onUpdateWorkflow, onOpenAttachment, onClose }: { ticket?: TicketItem; role: ViewRole; followUp: string; followUpAt: string; isSaving: boolean; onFollowUpChange: (value: string) => void; onFollowUpAtChange: (value: string) => void; onAddFollowUp: () => void; onUpdateWorkflow: (update: { status?: TicketStatus; dueAt?: string | null }) => void; onOpenAttachment: (attachment: { fileName: string; storagePath: string }) => void; onClose: () => void }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { empty: "Pilih tiket untuk melihat detail.", details: "Detail tiket", workflow: "Alur laporan karyawan", close: "Tutup detail", current: "Pengaturan tiket", restricted: "Pengaturan hanya dapat diperbarui oleh HR atau Manager.", status: "Status", dueDate: "Batas waktu", noDueDate: "Belum ditentukan", reported: "Dilaporkan", occurred: "Kejadian/pengajuan", history: "Progres & riwayat", noFollowUp: "Belum ada tindak lanjut untuk tiket ini.", add: "Tambah tindak lanjut", placeholder: "Tuliskan tindakan atau informasi tindak lanjut...", at: "Tanggal / waktu tindak lanjut", saving: "Menyimpan...", save: "Simpan tindak lanjut" } : { empty: "Select a ticket to view its details.", details: "Ticket details", workflow: "Employee report workflow", close: "Close details", current: "Ticket settings", restricted: "Settings can be updated by HR or a Manager.", status: "Status", dueDate: "Due date", noDueDate: "Not set", reported: "Reported", occurred: "Occurrence/submission", history: "Progress & history", noFollowUp: "There is no follow-up for this ticket yet.", add: "Add follow-up", placeholder: "Describe the action taken or follow-up information...", at: "Follow-up date / time", saving: "Saving...", save: "Save follow-up" };
  if (!ticket) return <aside className="rounded-xl border border-[#becabd]/45 bg-white p-6 text-sm text-[#4d5f81]">{copy.empty}</aside>;
  const canManage = role === "manager";

  return <aside id="ticket-detail" className="overflow-hidden rounded-xl border border-[#becabd]/45 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] scroll-mt-20 2xl:sticky 2xl:top-21 2xl:h-fit">
    <div className="flex items-start justify-between bg-[#1e3765] px-5 py-4 text-white"><div className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg border border-[#069494] bg-[#577c8e]"><Ticket size={15} /></span><div><p className="text-sm font-bold">{copy.details} — {ticket.id}</p><p className="text-[11px] text-[#d9e2fc]">{copy.workflow}</p></div></div><button onClick={onClose} className="rounded p-1 text-[#d9e2fc] hover:bg-white/10" aria-label={copy.close}><X size={16} /></button></div>
    <div className="space-y-5 p-5">
      <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.1em] text-[#4d5f81]">{copy.current}</p><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-[11px] font-semibold text-[#4d5f81]"><span>{copy.status}</span>{canManage ? <select disabled={isSaving} value={ticket.status} onChange={(event) => onUpdateWorkflow({ status: event.target.value as TicketStatus })} className="rounded-lg border border-[#becabd]/60 bg-white px-2.5 py-2 text-xs font-semibold text-[#121b2e] outline-none focus:border-[#069494] disabled:opacity-60">{(Object.keys(statusMeta) as TicketStatus[]).map((status) => <option key={status} value={status}>{statusLabel(status, language)}</option>)}</select> : <StatusBadge status={ticket.status} />}</label><label className="grid gap-1 text-[11px] font-semibold text-[#4d5f81]"><span>{copy.dueDate}</span>{canManage ? <input key={`${ticket.id}-${ticket.dueAt ?? ""}`} disabled={isSaving} min={toDateTimeLocal(ticket.createdAt)} defaultValue={toDateTimeLocal(ticket.dueAt)} onBlur={(event) => onUpdateWorkflow({ dueAt: event.target.value || null })} type="datetime-local" className="rounded-lg border border-[#becabd]/60 bg-white px-2.5 py-2 text-xs font-semibold text-[#121b2e] outline-none focus:border-[#069494] disabled:opacity-60" /> : <span className="text-xs font-semibold text-[#121b2e]">{ticket.dueAt ? formatDate(ticket.dueAt, language, true) : copy.noDueDate}</span>}</label></div>{!canManage && <p className="mt-3 text-xs text-[#4d5f81]">{copy.restricted}</p>}</div>
      <div className="border-y border-[#becabd]/35 py-4"><div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-[#b0c6d4] text-[10px] font-bold text-[#1e3765]">{ticket.employeeName.split(" ").map((name) => name[0]).join("").slice(0, 2)}</span><div><p className="text-xs font-bold">{ticket.employeeName}</p><p className="text-[10px] text-[#4d5f81]">{ticket.employeeId} · {ticket.department}</p></div></div><h2 className="mt-4 text-base font-bold leading-6 [overflow-wrap:anywhere]">{ticket.title}</h2><p className="mt-1 text-xs text-[#4d5f81]">{ticket.category} · {copy.reported} {formatDate(ticket.createdAt, language, true)}</p>{ticket.occurredAt && <p className="mt-1 text-xs text-[#4d5f81]">{copy.occurred}: {formatDate(ticket.occurredAt, language, true)}</p>}<p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#3f4940] [overflow-wrap:anywhere]">{ticket.description}</p>{ticket.attachment && <button onClick={() => onOpenAttachment(ticket.attachment!)} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#d9e2fc] bg-[#f1f3ff] px-3 py-2 text-xs font-semibold text-[#1e3765] hover:bg-[#d9e2fc]"><Paperclip size={14} />{ticket.attachment.fileName}</button>}</div>
      <div><div className="mb-3 flex items-center gap-2"><Clock3 size={15} className="text-[#069494]" /><p className="text-xs font-bold">{copy.history}</p></div>{!ticket.history.some((activity) => activity.kind === "followup") && <p className="mb-3 rounded-lg bg-[#f7f8ff] px-3 py-2 text-xs text-[#4d5f81]">{copy.noFollowUp}</p>}<ol className="space-y-4 border-l border-[#d9e2fc] pl-4">{[...ticket.history].reverse().map((activity) => <li key={activity.id} className="relative"><span className={`absolute -left-[21px] top-1 grid size-3 place-items-center rounded-full ${activity.kind === "status" ? "bg-[#069494]" : activity.kind === "followup" ? "bg-[#16834b]" : "bg-[#b0c6d4]"}`}><span className="size-1 rounded-full bg-white" /></span><p className="whitespace-pre-line text-xs font-semibold text-[#3f4940] [overflow-wrap:anywhere]">{activity.message}</p><p className="mt-1 text-[10px] text-[#4d5f81]">{activity.actor} · {formatDate(activity.at, language, true)}</p></li>)}</ol></div>
      {canManage && <div className="rounded-lg bg-[#f1f3ff] p-3"><label className="flex items-center gap-2 text-xs font-bold text-[#1e3765]"><MessageSquareText size={14} /> {copy.add}</label><textarea disabled={isSaving} value={followUp} maxLength={TICKET_LIMITS.followUpMax} onChange={(event) => onFollowUpChange(event.target.value)} className="mt-2 min-h-20 w-full resize-none rounded-lg border border-[#d9e2fc] bg-white p-2.5 text-xs outline-none focus:border-[#069494] disabled:opacity-60" placeholder={copy.placeholder} /><p className="mt-1 text-right text-[10px] text-[#4d5f81]">{followUp.length}/{TICKET_LIMITS.followUpMax}</p><label className="mt-2 block text-[11px] font-semibold text-[#4d5f81]">{copy.at}<input disabled={isSaving} value={followUpAt} min={toDateTimeLocal(ticket.createdAt)} onChange={(event) => onFollowUpAtChange(event.target.value)} type="datetime-local" className="mt-1 block w-full rounded-lg border border-[#d9e2fc] bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-[#069494] disabled:opacity-60" /></label><button disabled={cleanMultilineText(followUp).length < TICKET_LIMITS.followUpMin || isSaving} onClick={onAddFollowUp} className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#16834b] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Send size={13} /> {isSaving ? copy.saving : copy.save}</button></div>}</div>
  </aside>;
}

function CreateTicketModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: CreateTicketInput) => Promise<{ ok: boolean; message?: string }> }) {
  const { language } = useLanguage();
  const copy = language === "id" ? { required: "Judul, kategori, dan deskripsi wajib diisi sebelum tiket diajukan.", title: "Buat tiket karyawan", subtitle: "ID karyawan akan terhubung otomatis setelah login.", close: "Tutup formulir", ticketTitle: "Judul tiket", titlePlaceholder: "Contoh: Perbaikan kursi kerja di area dispatch", category: "Kategori", choose: "Pilih kategori", occurred: "Tanggal / waktu kejadian", optional: "Opsional", description: "Deskripsi", descriptionPlaceholder: "Jelaskan kondisi, masalah, atau kebutuhan pekerjaan secara singkat dan jelas.", attachment: "Lampiran", attachmentHint: "Opsional, gambar JPG/PNG/WebP maksimal 5 MB", cancel: "Batal", submitting: "Mengajukan...", submit: "Ajukan tiket" } : { required: "Title, category, and description are required before submitting a ticket.", title: "Create employee ticket", subtitle: "Your employee ID will be linked automatically after sign-in.", close: "Close form", ticketTitle: "Ticket title", titlePlaceholder: "Example: Repair the work chair in the dispatch area", category: "Category", choose: "Select a category", occurred: "Occurrence date / time", optional: "Optional", description: "Description", descriptionPlaceholder: "Briefly and clearly describe the condition, issue, or work request.", attachment: "Attachment", attachmentHint: "Optional, JPG/PNG/WebP image up to 5 MB", cancel: "Cancel", submitting: "Submitting...", submit: "Submit ticket" };
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const [descriptionValue, setDescriptionValue] = useState("");
  const [maxOccurredAt] = useState(currentLocalDateTime);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = titleValue.trim();
    const category = String(formData.get("category") ?? "");
    const description = descriptionValue.trim();
    const occurredAt = String(formData.get("occurredAt") ?? "");
    const attachmentValue = formData.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.name ? attachmentValue : undefined;
    if (!title || !category || !description) {
      setError(copy.required);
      return;
    }
    setIsSubmitting(true);
    const result = await onSubmit({ title, category, description, occurredAt: occurredAt || undefined, attachment });
    setIsSubmitting(false);
    if (!result.ok) setError(result.message ?? "Ticket belum berhasil dibuat.");
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#0f2342]/45 p-4"><section role="dialog" aria-modal="true" aria-labelledby="create-ticket-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl bg-white shadow-2xl"><div className="flex items-center justify-between border-b border-[#d9e2fc] px-6 py-4"><div><h2 id="create-ticket-title" className="text-lg font-bold">{copy.title}</h2><p className="mt-0.5 text-xs text-[#4d5f81]">{copy.subtitle}</p></div><button disabled={isSubmitting} onClick={onClose} className="rounded p-1.5 text-[#4d5f81] hover:bg-[#f1f3ff] disabled:opacity-50" aria-label={copy.close}><X size={18} /></button></div><form noValidate onSubmit={handleSubmit} className="space-y-4 p-6"><Field label={copy.ticketTitle} required><input disabled={isSubmitting} name="title" value={titleValue} onChange={(event) => setTitleValue(event.target.value)} maxLength={TICKET_LIMITS.titleMax} className="field" placeholder={copy.titlePlaceholder} /><span className="mt-1 block text-right text-[10px] font-normal text-[#4d5f81]">{titleValue.length}/{TICKET_LIMITS.titleMax}</span></Field><div className="grid gap-4 sm:grid-cols-2"><Field label={copy.category} required><select disabled={isSubmitting} name="category" defaultValue="" className="field"><option value="" disabled>{copy.choose}</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></Field><Field label={copy.occurred} hint={copy.optional}><input disabled={isSubmitting} name="occurredAt" type="datetime-local" max={maxOccurredAt} className="field" /></Field></div><Field label={copy.description} required><textarea disabled={isSubmitting} name="description" value={descriptionValue} onChange={(event) => setDescriptionValue(event.target.value)} maxLength={TICKET_LIMITS.descriptionMax} className="field min-h-28 resize-y" placeholder={copy.descriptionPlaceholder} /><span className="mt-1 block text-right text-[10px] font-normal text-[#4d5f81]">{descriptionValue.length}/{TICKET_LIMITS.descriptionMax}</span></Field><Field label={copy.attachment} hint={copy.attachmentHint}><input disabled={isSubmitting} name="attachment" type="file" accept="image/jpeg,image/png,image/webp" className="field file:mr-3 file:rounded file:border-0 file:bg-[#eaf7f0] file:px-2 file:py-1 file:text-xs file:font-semibold file:text-[#006838]" /></Field>{error && <p role="alert" className="rounded-lg bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#d64545]">{error}</p>}<div className="flex justify-end gap-2 border-t border-[#d9e2fc] pt-4"><button disabled={isSubmitting} type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-xs font-bold text-[#4d5f81] hover:bg-[#f1f3ff] disabled:opacity-50">{copy.cancel}</button><button disabled={isSubmitting} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[#16834b] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#006838] disabled:opacity-50"><FilePlus2 size={14} /> {isSubmitting ? copy.submitting : copy.submit}</button></div></form></section></div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block text-xs font-bold text-[#3f4940]"><span>{label}{required && <span className="ml-1 text-[#d64545]">*</span>}</span>{hint && <span className="ml-2 font-normal text-[#4d5f81]">{hint}</span>}<span className="mt-1.5 block [&_.field]:w-full [&_.field]:rounded-lg [&_.field]:border [&_.field]:border-[#becabd]/60 [&_.field]:bg-white [&_.field]:px-3 [&_.field]:py-2.5 [&_.field]:text-sm [&_.field]:font-normal [&_.field]:outline-none [&_.field]:focus:border-[#069494]">{children}</span></label>;
}
